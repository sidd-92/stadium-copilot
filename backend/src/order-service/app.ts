import express from "express";
import cors from "cors";
import { getMenuForStand } from "./menu-service";
import { createOrder, estimateEtaMinutes, getOrder, getStand } from "./order-store";
import { handleStandClosedIncident } from "./disruption-handler";
import { readAllMatchesFromCache, readMatchFromCache } from "./redis-cache";
import type { MatchEvent, OrderItem, PubSubPushEnvelope, StandStatusEventPayload } from "./types";

export const app = express();

// This is a public, unauthenticated JSON API with no cookies/credentials
// involved — a fan's browser hits it directly from the frontend origin
// (Firebase Hosting in prod, localhost in dev). Open CORS is appropriate
// here; it's not gating anything sensitive (menu data is already public
// via /menu/:stand_id, order lookups only ever return what the caller
// already has the order_id for).
app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.status(200).send("order-service ok");
});

// QR scan lands here. Public, unauthenticated — dietary/language params
// are sanitized inside getMenuForStand before touching Gemini.
app.get("/menu/:stand_id", async (req, res) => {
  try {
    const result = await getMenuForStand(req.params.stand_id, {
      dietary: typeof req.query.dietary === "string" ? req.query.dietary : undefined,
      language: typeof req.query.language === "string" ? req.query.language : undefined,
    });

    if (!result) {
      res.status(404).json({ error: "stand not found" });
      return;
    }

    res.status(200).json(result);
  } catch (err) {
    console.error("[order-service] GET /menu/:stand_id failed:", err);
    res.status(500).json({ error: "internal error" });
  }
});

app.post("/orders", async (req, res) => {
  try {
    const { stand_id, items } = (req.body ?? {}) as { stand_id?: string; items?: OrderItem[] };

    if (!stand_id || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "stand_id and a non-empty items array are required" });
      return;
    }

    const stand = await getStand(stand_id);
    if (!stand) {
      res.status(404).json({ error: "stand not found" });
      return;
    }
    if (stand.status !== "open") {
      res.status(409).json({ error: "stand is not currently open" });
      return;
    }

    const order = await createOrder({ match_id: stand.match_id, stand_id, items });
    const eta_minutes = estimateEtaMinutes(stand.queue_length_estimate, items);

    res.status(201).json({ ...order, eta_minutes });
  } catch (err) {
    console.error("[order-service] POST /orders failed:", err);
    res.status(500).json({ error: "internal error" });
  }
});

// worldcup26.ir's local_date is "MM/DD/YYYY HH:mm" — not directly
// sortable as a string, so parse it into a real Date for ordering.
// Malformed/missing dates sort last rather than throwing.
function parseLocalDate(localDate: string): number {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/.exec(localDate);
  if (!match) return Number.POSITIVE_INFINITY;
  const [, month, day, year, hour, minute] = match;
  return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)).getTime();
}

// Upcoming schedule, soonest first. Backed by ingestion-service's
// full-schedule snapshot (matches:all) — must be registered before
// /matches/:match_id or Express would match "upcoming" as a match_id.
app.get("/matches/upcoming", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const allMatches = (await readAllMatchesFromCache<MatchEvent>()) ?? [];

    const upcoming = allMatches
      .filter((match) => match.time_elapsed === "notstarted")
      .sort((a, b) => parseLocalDate(a.local_date) - parseLocalDate(b.local_date))
      .slice(0, limit);

    res.status(200).json({ matches: upcoming });
  } catch (err) {
    console.error("[order-service] GET /matches/upcoming failed:", err);
    res.status(500).json({ error: "internal error" });
  }
});

// Read-only view into ingestion-service's Redis cache, so the frontend
// can show live score/status without ever reaching the INTERNAL_ONLY
// ingestion-service directly. 404 (not 200 with null) when nothing is
// cached — that's the normal state whenever no match is currently live,
// distinct from a real error.
app.get("/matches/:match_id", async (req, res) => {
  try {
    const match = await readMatchFromCache<MatchEvent>(req.params.match_id);
    if (!match) {
      res.status(404).json({ error: "no live data cached for this match" });
      return;
    }
    res.status(200).json(match);
  } catch (err) {
    console.error("[order-service] GET /matches/:match_id failed:", err);
    res.status(500).json({ error: "internal error" });
  }
});

app.get("/orders/:order_id", async (req, res) => {
  try {
    const order = await getOrder(req.params.order_id);
    if (!order) {
      res.status(404).json({ error: "order not found" });
      return;
    }
    res.status(200).json(order);
  } catch (err) {
    console.error("[order-service] GET /orders/:order_id failed:", err);
    res.status(500).json({ error: "internal error" });
  }
});

// Pub/Sub PUSH target (OIDC-authenticated at the infra layer — see
// messaging.tf). Always returns 200: a slow Gemini call inside
// handleStandClosedIncident must never look like delivery failure to
// Pub/Sub and trigger a retry storm. Malformed/irrelevant messages are
// acked and dropped rather than retried.
app.post("/events/stand-status", async (req, res) => {
  try {
    const envelope = req.body as PubSubPushEnvelope;
    const message = envelope?.message;

    if (!message?.data) {
      console.warn("[order-service] /events/stand-status received a push envelope with no message data");
      res.status(200).send("ok");
      return;
    }

    const decoded = Buffer.from(message.data, "base64").toString("utf8");
    const payload = JSON.parse(decoded) as StandStatusEventPayload;

    const standId = payload.stand_id ?? message.attributes?.stand_id;
    const eventType = payload.event_type ?? message.attributes?.event_type;

    if (!standId || eventType !== "stand_closed_incident") {
      console.log(`[order-service] ignoring stand-status event (stand_id=${standId}, event_type=${eventType})`);
      res.status(200).send("ok");
      return;
    }

    const result = await handleStandClosedIncident(standId, payload.language);
    console.log(`[order-service] stand_closed_incident for ${standId}: disrupted ${result.disrupted_count} orders`);
  } catch (err) {
    console.error("[order-service] failed to process stand-status event:", err);
  }

  res.status(200).send("ok");
});

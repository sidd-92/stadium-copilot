// order-service's Express app: the only public HTTP surface in this
// codebase (ingestion-service is INTERNAL_ONLY). Wires up menu browsing,
// order placement/lookup/status transitions, the staff order queue, live
// match reads (backed by ingestion-service's Redis cache), and the
// Pub/Sub push endpoint that drives disruption handling.
import cors from "cors";
import express from "express";
import { getMenuForStand } from "./menu-service";
import {
  createOrder,
  estimateEtaMinutes,
  getOrder,
  getOrdersByStandAndStatuses,
  getStand,
  isValidTransition,
  transitionOrder,
} from "./order-store";
import { handleStandClosedIncident } from "./disruption-handler";
import { readAllMatchesFromCache, readMatchFromCache } from "./redis-cache";
import { parseLocalDate } from "../shared/date-utils";
import { createLogger } from "../shared/logger";
import type { MatchEvent, OrderItem, OrderStatus, PubSubPushEnvelope, StandStatusEventPayload } from "./types";

const logger = createLogger("order-service");

// The active (non-terminal, non-disrupted) states a stand's staff screen
// needs to see and act on, in fulfillment order.
const ACTIVE_ORDER_STATUSES: OrderStatus[] = ["placed", "confirmed", "preparing", "ready_for_pickup"];

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
    logger.error("GET /menu/:stand_id failed:", err);
    res.status(500).json({ error: "internal error" });
  }
});

app.post("/orders", async (req, res) => {
  try {
    const { stand_id: standId, items } = (req.body ?? {}) as { stand_id?: string; items?: OrderItem[] };

    if (!standId || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "stand_id and a non-empty items array are required" });
      return;
    }

    const stand = await getStand(standId);
    if (!stand) {
      res.status(404).json({ error: "stand not found" });
      return;
    }
    if (stand.status !== "open") {
      res.status(409).json({ error: "stand is not currently open" });
      return;
    }

    const order = await createOrder({ match_id: stand.match_id, stand_id: standId, items });
    const eta_minutes = estimateEtaMinutes(stand.queue_length_estimate, items);

    res.status(201).json({ ...order, eta_minutes });
  } catch (err) {
    logger.error("POST /orders failed:", err);
    res.status(500).json({ error: "internal error" });
  }
});

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
    logger.error("GET /matches/upcoming failed:", err);
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
    logger.error("GET /matches/:match_id failed:", err);
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
    logger.error("GET /orders/:order_id failed:", err);
    res.status(500).json({ error: "internal error" });
  }
});

// Stand-staff action: no real kitchen/POS system exists for this
// hackathon, so this is the thing that actually moves an order forward —
// a stand employee taps a button on the /stand/:stand_id screen. Public,
// unauthenticated for now like the rest of this API; a real deployment
// would gate this behind staff auth.
app.patch("/orders/:order_id/status", async (req, res) => {
  try {
    const { status } = (req.body ?? {}) as { status?: OrderStatus };
    if (!status) {
      res.status(400).json({ error: "status is required" });
      return;
    }

    const current = await getOrder(req.params.order_id);
    if (!current) {
      res.status(404).json({ error: "order not found" });
      return;
    }

    if (!isValidTransition(current.status, status)) {
      res.status(409).json({ error: `cannot move order from ${current.status} to ${status}` });
      return;
    }

    const updated = await transitionOrder(req.params.order_id, status);
    res.status(200).json(updated);
  } catch (err) {
    logger.error("PATCH /orders/:order_id/status failed:", err);
    res.status(500).json({ error: "internal error" });
  }
});

// Stand-staff queue view: every order this stand still needs to act on,
// oldest first. Backs the /stand/:stand_id screen.
app.get("/stands/:stand_id/orders", async (req, res) => {
  try {
    const orders = await getOrdersByStandAndStatuses(req.params.stand_id, ACTIVE_ORDER_STATUSES);
    orders.sort((a, b) => a.created_at.localeCompare(b.created_at));
    res.status(200).json({ orders });
  } catch (err) {
    logger.error("GET /stands/:stand_id/orders failed:", err);
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
      logger.warn("/events/stand-status received a push envelope with no message data");
      res.status(200).send("ok");
      return;
    }

    const decoded = Buffer.from(message.data, "base64").toString("utf8");
    const payload = JSON.parse(decoded) as StandStatusEventPayload;

    const standId = payload.stand_id ?? message.attributes?.stand_id;
    const eventType = payload.event_type ?? message.attributes?.event_type;

    if (!standId || eventType !== "stand_closed_incident") {
      logger.log(`ignoring stand-status event (stand_id=${standId}, event_type=${eventType})`);
      res.status(200).send("ok");
      return;
    }

    const result = await handleStandClosedIncident(standId, payload.language);
    logger.log(`stand_closed_incident for ${standId}: disrupted ${result.disrupted_count} orders`);
  } catch (err) {
    logger.error("failed to process stand-status event:", err);
  }

  res.status(200).send("ok");
});

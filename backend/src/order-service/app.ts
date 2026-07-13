import express from "express";
import { getMenuForStand } from "./menu-service";
import { createOrder, estimateEtaMinutes, getOrder, getStand } from "./order-store";
import { handleStandClosedIncident } from "./disruption-handler";
import type { OrderItem, PubSubPushEnvelope, StandStatusEventPayload } from "./types";

export const app = express();
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

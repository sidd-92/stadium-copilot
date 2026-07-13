import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { Order, Stand } from "../types";

const getOrdersByStandAndStatusesMock = vi.fn();
const getStandMock = vi.fn();
const getStandsByMatchMock = vi.fn();
const transitionOrderMock = vi.fn().mockResolvedValue(undefined);
const createOrderMock = vi.fn();
const getOrderMock = vi.fn();

vi.mock("../order-store", () => ({
  getOrdersByStandAndStatuses: getOrdersByStandAndStatusesMock,
  getStand: getStandMock,
  getStandsByMatch: getStandsByMatchMock,
  transitionOrder: transitionOrderMock,
  createOrder: createOrderMock,
  getOrder: getOrderMock,
  estimateEtaMinutes: () => 5,
}));

vi.mock("../gemini-client", async () => {
  const actual = await vi.importActual<typeof import("../gemini-client")>("../gemini-client");
  return {
    ...actual,
    generateShortText: vi.fn().mockResolvedValue("Your order was reassigned."),
  };
});

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    order_id: "order-1",
    match_id: "match-1",
    stand_id: "stand-closed",
    items: [{ item_id: "i1", name: "Veggie Burger", quantity: 1, dietary_tags: ["vegan"] }],
    status: "placed",
    disruption_reason: null,
    resolution: null,
    reassigned_to_stand_id: null,
    created_at: "2026-07-13T00:00:00.000Z",
    updated_at: "2026-07-13T00:00:00.000Z",
    ...overrides,
  };
}

function makeStand(overrides: Partial<Stand> = {}): Stand {
  return {
    stand_id: "stand-open-1",
    name: "Grill Corner",
    match_id: "match-1",
    status: "open",
    queue_length_estimate: 3,
    menu: [{ item_id: "m1", name: "Veggie Wrap", dietary_tags: ["vegan"], price: 6, in_stock: true }],
    ...overrides,
  };
}

function pushEnvelope(payload: Record<string, unknown>) {
  return {
    message: {
      data: Buffer.from(JSON.stringify(payload)).toString("base64"),
      attributes: {},
      messageId: "1",
      publishTime: "2026-07-13T00:00:00.000Z",
    },
    subscription: "projects/x/subscriptions/stand-status-order-service-push",
  };
}

describe("POST /events/stand-status", () => {
  beforeEach(() => {
    getOrdersByStandAndStatusesMock.mockReset();
    getStandMock.mockReset();
    getStandsByMatchMock.mockReset();
    transitionOrderMock.mockClear();
  });

  it("transitions only orders at the affected stand, leaving other stands' orders untouched", async () => {
    const affectedOrder = makeOrder({ order_id: "order-affected", stand_id: "stand-closed" });

    // Firestore's where("stand_id", "==", standId) means the query only
    // ever returns matching-stand orders in the first place — this mock
    // reflects that real filtering behavior.
    getOrdersByStandAndStatusesMock.mockImplementation(async (standId: string) =>
      standId === "stand-closed" ? [affectedOrder] : [],
    );
    getStandMock.mockResolvedValue(makeStand({ stand_id: "stand-closed", queue_length_estimate: 10 }));
    getStandsByMatchMock.mockResolvedValue([makeStand()]);

    const { app } = await import("../app");

    const res = await request(app)
      .post("/events/stand-status")
      .send(pushEnvelope({ stand_id: "stand-closed", event_type: "stand_closed_incident" }))
      .set("Content-Type", "application/json");

    expect(res.status).toBe(200);
    expect(transitionOrderMock).toHaveBeenCalledTimes(1);
    expect(transitionOrderMock).toHaveBeenCalledWith(
      "order-affected",
      "disrupted",
      expect.objectContaining({ disruption_reason: "stand_closed_incident" }),
    );

    // Confirm the query itself was scoped to the affected stand only —
    // an order at a different stand_id was never even fetched.
    expect(getOrdersByStandAndStatusesMock).toHaveBeenCalledWith("stand-closed", [
      "placed",
      "confirmed",
      "preparing",
    ]);
  });

  it("returns 200 and does nothing for an unrelated event_type", async () => {
    const { app } = await import("../app");

    const res = await request(app)
      .post("/events/stand-status")
      .send(pushEnvelope({ stand_id: "stand-closed", event_type: "stand_reopened" }))
      .set("Content-Type", "application/json");

    expect(res.status).toBe(200);
    expect(getOrdersByStandAndStatusesMock).not.toHaveBeenCalled();
    expect(transitionOrderMock).not.toHaveBeenCalled();
  });

  it("returns 200 and does not crash on a malformed push envelope", async () => {
    const { app } = await import("../app");

    const res = await request(app).post("/events/stand-status").send({}).set("Content-Type", "application/json");

    expect(res.status).toBe(200);
    expect(transitionOrderMock).not.toHaveBeenCalled();
  });
});

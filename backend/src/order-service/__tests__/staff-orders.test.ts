import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { Order } from "../types";

const getOrderMock = vi.fn();
const transitionOrderMock = vi.fn();
const getOrdersByStandAndStatusesMock = vi.fn();

vi.mock("../order-store", async () => {
  const actual = await vi.importActual<typeof import("../order-store")>("../order-store");
  return {
    ...actual,
    getOrder: getOrderMock,
    transitionOrder: transitionOrderMock,
    getOrdersByStandAndStatuses: getOrdersByStandAndStatusesMock,
    createOrder: vi.fn(),
    getStand: vi.fn(),
  };
});

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    order_id: "order-1",
    match_id: "match-1",
    stand_id: "stand-1",
    items: [{ item_id: "i1", name: "Fries", quantity: 1, dietary_tags: [] }],
    status: "placed",
    disruption_reason: null,
    resolution: null,
    reassigned_to_stand_id: null,
    created_at: "2026-07-13T00:00:00.000Z",
    updated_at: "2026-07-13T00:00:00.000Z",
    ...overrides,
  };
}

describe("PATCH /orders/:order_id/status", () => {
  beforeEach(() => {
    getOrderMock.mockReset();
    transitionOrderMock.mockReset();
  });

  it("advances a valid transition and returns the updated order", async () => {
    getOrderMock.mockResolvedValue(makeOrder({ status: "placed" }));
    transitionOrderMock.mockResolvedValue(makeOrder({ status: "confirmed" }));

    const { app } = await import("../app");
    const res = await request(app).patch("/orders/order-1/status").send({ status: "confirmed" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("confirmed");
    expect(transitionOrderMock).toHaveBeenCalledWith("order-1", "confirmed");
  });

  it("rejects an illegal transition with 409, without calling transitionOrder", async () => {
    getOrderMock.mockResolvedValue(makeOrder({ status: "placed" }));

    const { app } = await import("../app");
    const res = await request(app).patch("/orders/order-1/status").send({ status: "ready_for_pickup" });

    expect(res.status).toBe(409);
    expect(transitionOrderMock).not.toHaveBeenCalled();
  });

  it("returns 404 for an order that doesn't exist", async () => {
    getOrderMock.mockResolvedValue(null);

    const { app } = await import("../app");
    const res = await request(app).patch("/orders/does-not-exist/status").send({ status: "confirmed" });

    expect(res.status).toBe(404);
  });

  it("returns 400 when status is missing", async () => {
    const { app } = await import("../app");
    const res = await request(app).patch("/orders/order-1/status").send({});

    expect(res.status).toBe(400);
    expect(getOrderMock).not.toHaveBeenCalled();
  });
});

describe("GET /stands/:stand_id/orders", () => {
  beforeEach(() => {
    getOrdersByStandAndStatusesMock.mockReset();
  });

  it("returns active orders for the stand, oldest first", async () => {
    const older = makeOrder({ order_id: "older", created_at: "2026-07-13T00:00:00.000Z" });
    const newer = makeOrder({ order_id: "newer", created_at: "2026-07-13T00:05:00.000Z" });
    getOrdersByStandAndStatusesMock.mockResolvedValue([newer, older]);

    const { app } = await import("../app");
    const res = await request(app).get("/stands/stand-1/orders");

    expect(res.status).toBe(200);
    expect(res.body.orders.map((o: Order) => o.order_id)).toEqual(["older", "newer"]);
    expect(getOrdersByStandAndStatusesMock).toHaveBeenCalledWith("stand-1", [
      "placed",
      "confirmed",
      "preparing",
      "ready_for_pickup",
    ]);
  });
});

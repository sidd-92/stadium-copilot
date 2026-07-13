import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Order, Stand } from "../types";

const getOrdersByStandAndStatusesMock = vi.fn();
const getStandMock = vi.fn();
const getStandsByMatchMock = vi.fn();
const transitionOrderMock = vi.fn().mockResolvedValue(undefined);

vi.mock("../order-store", () => ({
  getOrdersByStandAndStatuses: getOrdersByStandAndStatusesMock,
  getStand: getStandMock,
  getStandsByMatch: getStandsByMatchMock,
  transitionOrder: transitionOrderMock,
}));

const generateShortTextMock = vi.fn().mockResolvedValue("Your order was moved to Grill Corner.");

vi.mock("../gemini-client", async () => {
  const actual = await vi.importActual<typeof import("../gemini-client")>("../gemini-client");
  return {
    ...actual,
    generateShortText: generateShortTextMock,
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

describe("handleStandClosedIncident", () => {
  beforeEach(() => {
    getOrdersByStandAndStatusesMock.mockReset();
    getStandMock.mockReset();
    getStandsByMatchMock.mockReset();
    transitionOrderMock.mockClear();
    generateShortTextMock.mockClear();
  });

  it("reassigns orders to an alternate stand with overlapping dietary tags and a lower queue", async () => {
    const order = makeOrder();
    getOrdersByStandAndStatusesMock.mockResolvedValue([order]);
    getStandMock.mockResolvedValue(makeStand({ stand_id: "stand-closed", queue_length_estimate: 10 }));
    getStandsByMatchMock.mockResolvedValue([makeStand()]);

    const { handleStandClosedIncident } = await import("../disruption-handler");
    const result = await handleStandClosedIncident("stand-closed");

    expect(result.disrupted_count).toBe(1);
    expect(transitionOrderMock).toHaveBeenCalledWith(
      "order-1",
      "disrupted",
      expect.objectContaining({
        disruption_reason: "stand_closed_incident",
        resolution: "reassigned",
        reassigned_to_stand_id: "stand-open-1",
      }),
    );
  });

  it("falls back to refund_pending when no alternate stand matches", async () => {
    const order = makeOrder({ items: [{ item_id: "i1", name: "Peanuts", quantity: 1, dietary_tags: ["nuts"] }] });
    getOrdersByStandAndStatusesMock.mockResolvedValue([order]);
    getStandMock.mockResolvedValue(makeStand({ stand_id: "stand-closed", queue_length_estimate: 10 }));
    // No candidate stand serves "nuts" tagged items.
    getStandsByMatchMock.mockResolvedValue([makeStand()]);

    const { handleStandClosedIncident } = await import("../disruption-handler");
    await handleStandClosedIncident("stand-closed");

    expect(transitionOrderMock).toHaveBeenCalledWith(
      "order-1",
      "disrupted",
      expect.objectContaining({
        resolution: "refund_pending",
        reassigned_to_stand_id: null,
      }),
    );
  });

  it("does nothing when there are no disruptible orders for the stand", async () => {
    getOrdersByStandAndStatusesMock.mockResolvedValue([]);
    getStandMock.mockResolvedValue(makeStand({ stand_id: "stand-closed" }));

    const { handleStandClosedIncident } = await import("../disruption-handler");
    const result = await handleStandClosedIncident("stand-closed");

    expect(result.disrupted_count).toBe(0);
    expect(transitionOrderMock).not.toHaveBeenCalled();
    expect(getStandsByMatchMock).not.toHaveBeenCalled();
  });

  it("continues processing remaining orders if one transition fails", async () => {
    const orderA = makeOrder({ order_id: "order-a" });
    const orderB = makeOrder({ order_id: "order-b" });
    getOrdersByStandAndStatusesMock.mockResolvedValue([orderA, orderB]);
    getStandMock.mockResolvedValue(makeStand({ stand_id: "stand-closed", queue_length_estimate: 10 }));
    getStandsByMatchMock.mockResolvedValue([makeStand()]);
    transitionOrderMock.mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce(undefined);

    const { handleStandClosedIncident } = await import("../disruption-handler");
    const result = await handleStandClosedIncident("stand-closed");

    expect(result.disrupted_count).toBe(2);
    expect(transitionOrderMock).toHaveBeenCalledTimes(2);
  });
});

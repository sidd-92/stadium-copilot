import { describe, expect, it } from "vitest";
import { estimateEtaMinutes, isValidTransition } from "../order-store";
import type { OrderItem, OrderStatus } from "../types";

describe("isValidTransition", () => {
  it("allows the full forward lifecycle", () => {
    expect(isValidTransition("placed", "confirmed")).toBe(true);
    expect(isValidTransition("confirmed", "preparing")).toBe(true);
    expect(isValidTransition("preparing", "ready_for_pickup")).toBe(true);
    expect(isValidTransition("ready_for_pickup", "collected")).toBe(true);
  });

  it("allows disruption from any pre-collection state", () => {
    expect(isValidTransition("placed", "disrupted")).toBe(true);
    expect(isValidTransition("confirmed", "disrupted")).toBe(true);
    expect(isValidTransition("preparing", "disrupted")).toBe(true);
    expect(isValidTransition("ready_for_pickup", "disrupted")).toBe(true);
  });

  it("rejects skipping states forward", () => {
    expect(isValidTransition("placed", "preparing")).toBe(false);
    expect(isValidTransition("placed", "ready_for_pickup")).toBe(false);
    expect(isValidTransition("confirmed", "collected")).toBe(false);
  });

  it("rejects moving backward", () => {
    expect(isValidTransition("collected", "placed")).toBe(false);
    expect(isValidTransition("preparing", "confirmed")).toBe(false);
    expect(isValidTransition("ready_for_pickup", "preparing")).toBe(false);
  });

  it("treats collected and disrupted as terminal", () => {
    const allStatuses: OrderStatus[] = [
      "placed",
      "confirmed",
      "preparing",
      "ready_for_pickup",
      "collected",
      "disrupted",
    ];
    for (const to of allStatuses) {
      expect(isValidTransition("collected", to)).toBe(false);
      expect(isValidTransition("disrupted", to)).toBe(false);
    }
  });
});

describe("estimateEtaMinutes", () => {
  it("increases with queue length and item count", () => {
    const oneItem: OrderItem[] = [{ item_id: "1", name: "Burger", quantity: 1, dietary_tags: [] }];
    const threeItems: OrderItem[] = [{ item_id: "1", name: "Burger", quantity: 3, dietary_tags: [] }];

    const shortQueue = estimateEtaMinutes(2, oneItem);
    const longQueue = estimateEtaMinutes(20, oneItem);
    const moreItems = estimateEtaMinutes(2, threeItems);

    expect(longQueue).toBeGreaterThan(shortQueue);
    expect(moreItems).toBeGreaterThan(shortQueue);
  });

  it("never returns less than the floor of 2 minutes", () => {
    expect(estimateEtaMinutes(0, [])).toBeGreaterThanOrEqual(2);
  });
});

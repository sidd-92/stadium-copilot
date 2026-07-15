import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCart } from "@/hooks/useCart";
import type { MenuItem } from "@/lib/types";

const burger: MenuItem = {
  item_id: "burger",
  name: "Burger",
  dietary_tags: [],
  price: 8.5,
  in_stock: true,
};

const fries: MenuItem = {
  item_id: "fries",
  name: "Fries",
  dietary_tags: ["vegetarian"],
  price: 4,
  in_stock: true,
};

describe("useCart", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("starts empty for a stand with no stored cart", () => {
    const { result } = renderHook(() => useCart("stand-1"));
    expect(result.current.items).toEqual([]);
    expect(result.current.totalCount).toBe(0);
  });

  it("adds a new item with quantity 1", () => {
    const { result } = renderHook(() => useCart("stand-1"));

    act(() => result.current.addItem(burger));

    expect(result.current.items).toEqual([
      { item_id: "burger", name: "Burger", quantity: 1, dietary_tags: [] },
    ]);
    expect(result.current.totalCount).toBe(1);
  });

  it("increments quantity when adding an item already in the cart", () => {
    const { result } = renderHook(() => useCart("stand-1"));

    act(() => result.current.addItem(burger));
    act(() => result.current.addItem(burger));

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(2);
  });

  it("calculates total item count across multiple distinct items", () => {
    const { result } = renderHook(() => useCart("stand-1"));

    act(() => result.current.addItem(burger));
    act(() => result.current.addItem(fries));
    act(() => result.current.addItem(fries));

    expect(result.current.totalCount).toBe(3);
    expect(result.current.items).toHaveLength(2);
  });

  it("updates the quantity of an existing item", () => {
    const { result } = renderHook(() => useCart("stand-1"));

    act(() => result.current.addItem(burger));
    act(() => result.current.setQuantity("burger", 5));

    expect(result.current.items[0].quantity).toBe(5);
    expect(result.current.totalCount).toBe(5);
  });

  it("removes an item when its quantity is set to 0", () => {
    const { result } = renderHook(() => useCart("stand-1"));

    act(() => result.current.addItem(burger));
    act(() => result.current.setQuantity("burger", 0));

    expect(result.current.items).toEqual([]);
    expect(result.current.totalCount).toBe(0);
  });

  it("removes an item when its quantity is set negative", () => {
    const { result } = renderHook(() => useCart("stand-1"));

    act(() => result.current.addItem(burger));
    act(() => result.current.setQuantity("burger", -1));

    expect(result.current.items).toEqual([]);
  });

  it("is a no-op when setting the quantity of an item not in the cart", () => {
    const { result } = renderHook(() => useCart("stand-1"));

    act(() => result.current.addItem(burger));
    act(() => result.current.setQuantity("nonexistent-item", 3));

    expect(result.current.items).toEqual([
      { item_id: "burger", name: "Burger", quantity: 1, dietary_tags: [] },
    ]);
  });

  it("clears all items", () => {
    const { result } = renderHook(() => useCart("stand-1"));

    act(() => result.current.addItem(burger));
    act(() => result.current.addItem(fries));
    act(() => result.current.clear());

    expect(result.current.items).toEqual([]);
    expect(result.current.totalCount).toBe(0);
  });

  it("persists cart to localStorage scoped by stand id", () => {
    const { result } = renderHook(() => useCart("stand-42"));

    act(() => result.current.addItem(burger));

    const stored = localStorage.getItem("stadium-copilot:cart:stand-42");
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored as string)).toEqual([
      { item_id: "burger", name: "Burger", quantity: 1, dietary_tags: [] },
    ]);
  });

  it("loads an existing cart from localStorage for the given stand", () => {
    localStorage.setItem(
      "stadium-copilot:cart:stand-7",
      JSON.stringify([{ item_id: "fries", name: "Fries", quantity: 2, dietary_tags: ["vegetarian"] }]),
    );

    const { result } = renderHook(() => useCart("stand-7"));

    expect(result.current.items).toEqual([
      { item_id: "fries", name: "Fries", quantity: 2, dietary_tags: ["vegetarian"] },
    ]);
    expect(result.current.totalCount).toBe(2);
  });
});

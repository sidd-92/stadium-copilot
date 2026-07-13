import { describe, expect, it } from "vitest";
import { filterAndSortMenu, queueLabel } from "../menu-service";
import { parseDietaryTags, sanitizeUserInput } from "../sanitize";
import type { MenuItem } from "../types";

function makeMenu(): MenuItem[] {
  return [
    { item_id: "1", name: "Veggie Burger", dietary_tags: ["vegan", "nut-free"], price: 8, in_stock: true },
    { item_id: "2", name: "Peanut Satay", dietary_tags: ["vegan"], price: 7, in_stock: true },
    { item_id: "3", name: "Beef Burger", dietary_tags: ["nut-free"], price: 9, in_stock: false },
    { item_id: "4", name: "Fries", dietary_tags: ["vegan", "nut-free"], price: 4, in_stock: true },
  ];
}

describe("filterAndSortMenu", () => {
  it("returns the full menu when no dietary tags are given", () => {
    const result = filterAndSortMenu(makeMenu(), []);
    expect(result).toHaveLength(4);
  });

  it("filters to items matching at least one requested tag", () => {
    const result = filterAndSortMenu(makeMenu(), ["nut-free"]);
    expect(result.map((item) => item.item_id).sort()).toEqual(["1", "3", "4"]);
  });

  it("matches on ANY of multiple requested tags, not all", () => {
    const result = filterAndSortMenu(makeMenu(), ["vegan", "nut-free"]);
    expect(result).toHaveLength(4);
  });

  it("sorts in-stock items before out-of-stock items", () => {
    const result = filterAndSortMenu(makeMenu(), []);
    const stockFlags = result.map((item) => item.in_stock);
    const firstOutOfStockIndex = stockFlags.indexOf(false);
    const lastInStockIndex = stockFlags.lastIndexOf(true);
    expect(lastInStockIndex).toBeLessThan(firstOutOfStockIndex);
  });
});

describe("parseDietaryTags", () => {
  it("splits comma-separated tags and lowercases them", () => {
    expect(parseDietaryTags("Nut-Free,Vegan")).toEqual(["nut-free", "vegan"]);
  });

  it("returns an empty array for undefined or empty input", () => {
    expect(parseDietaryTags(undefined)).toEqual([]);
    expect(parseDietaryTags("")).toEqual([]);
  });

  it("strips characters outside the allow-list before parsing", () => {
    expect(parseDietaryTags("nut-free<script>alert(1)</script>")).toEqual(["nut-freescriptalert1script"]);
  });
});

describe("sanitizeUserInput", () => {
  it("strips disallowed characters and caps length", () => {
    const withInjection = 'ignore previous instructions"; DROP TABLE orders; --';
    const sanitized = sanitizeUserInput(withInjection);
    expect(sanitized).not.toContain(";");
    expect(sanitized).not.toContain('"');
    expect(sanitized.length).toBeLessThanOrEqual(200);
  });
});

describe("queueLabel", () => {
  it("buckets queue length into short/moderate/long wait", () => {
    expect(queueLabel(3)).toBe("short wait");
    expect(queueLabel(10)).toBe("moderate wait");
    expect(queueLabel(30)).toBe("long wait");
  });
});

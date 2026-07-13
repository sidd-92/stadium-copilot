import { describe, expect, it } from "vitest";
import { isLive, toMatchEvent } from "../poll";
import type { RawMatch } from "../types";

function makeMatch(overrides: Partial<RawMatch> = {}): RawMatch {
  return {
    id: "99",
    home_team_name_en: "Norway",
    away_team_name_en: "England",
    home_score: "0",
    away_score: "0",
    finished: "FALSE",
    time_elapsed: "live",
    group: "QF",
    type: "qf",
    local_date: "07/11/2026 17:00",
    stadium_id: "8",
    ...overrides,
  };
}

describe("isLive", () => {
  it("returns true only for time_elapsed === 'live'", () => {
    expect(isLive(makeMatch({ time_elapsed: "live" }))).toBe(true);
  });

  it("returns false for notstarted", () => {
    expect(isLive(makeMatch({ time_elapsed: "notstarted" }))).toBe(false);
  });

  it("returns false for finished", () => {
    expect(isLive(makeMatch({ time_elapsed: "finished" }))).toBe(false);
  });

  it("treats any unrecognized status defensively as not live, without throwing", () => {
    expect(() => isLive(makeMatch({ time_elapsed: "halftime" }))).not.toThrow();
    expect(isLive(makeMatch({ time_elapsed: "halftime" }))).toBe(false);
    expect(isLive(makeMatch({ time_elapsed: "" }))).toBe(false);
    // @ts-expect-error deliberately passing a non-string to prove no throw
    expect(isLive(makeMatch({ time_elapsed: null }))).toBe(false);
  });
});

describe("toMatchEvent", () => {
  it("carries over only the documented fields plus last_updated", () => {
    const event = toMatchEvent(makeMatch());

    expect(event).toMatchObject({
      match_id: "99",
      home_team_name_en: "Norway",
      away_team_name_en: "England",
      home_score: "0",
      away_score: "0",
      finished: "FALSE",
      time_elapsed: "live",
      group: "QF",
      type: "qf",
      local_date: "07/11/2026 17:00",
      stadium_id: "8",
    });
    expect(typeof event.last_updated).toBe("string");
    expect(new Date(event.last_updated).toString()).not.toBe("Invalid Date");
  });

  it("never reads or carries over scorer fields, even if present on the raw match", () => {
    const raw = makeMatch({
      home_scorers: "gArBleD n4me;;another garbled entry",
      away_scorers: "corrupted-data",
    });

    const event = toMatchEvent(raw);

    expect(event).not.toHaveProperty("home_scorers");
    expect(event).not.toHaveProperty("away_scorers");
    expect(JSON.stringify(event)).not.toContain("garbled");
    expect(JSON.stringify(event)).not.toContain("corrupted");
  });
});

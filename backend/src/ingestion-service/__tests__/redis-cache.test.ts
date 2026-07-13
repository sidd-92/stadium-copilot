import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MatchEvent } from "../types";

const setMock = vi.fn().mockResolvedValue("OK");

vi.mock("ioredis", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      set: setMock,
      quit: vi.fn().mockResolvedValue("OK"),
    })),
  };
});

function makeEvent(overrides: Partial<MatchEvent> = {}): MatchEvent {
  return {
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
    last_updated: "2026-07-11T17:05:00.000Z",
    ...overrides,
  };
}

describe("writeMatchToCache", () => {
  beforeEach(() => {
    setMock.mockClear();
    vi.resetModules();
  });

  it("writes to Redis under match:{match_id} with a 60s TTL", async () => {
    const { writeMatchToCache } = await import("../redis-cache");
    const event = makeEvent();

    await writeMatchToCache(event);

    expect(setMock).toHaveBeenCalledWith("match:99", JSON.stringify(event), "EX", 60);
  });

  it("includes last_updated in the cached payload", async () => {
    const { writeMatchToCache } = await import("../redis-cache");
    const event = makeEvent({ match_id: "42", last_updated: "2026-07-11T18:00:00.000Z" });

    await writeMatchToCache(event);

    const [, payload] = setMock.mock.calls[0];
    expect(JSON.parse(payload as string).last_updated).toBe("2026-07-11T18:00:00.000Z");
  });
});

describe("writeAllMatchesToCache", () => {
  beforeEach(() => {
    setMock.mockClear();
    vi.resetModules();
  });

  it("writes the full match list under matches:all with a 90s TTL", async () => {
    const { writeAllMatchesToCache } = await import("../redis-cache");
    const matches = [makeEvent({ match_id: "1", time_elapsed: "notstarted" }), makeEvent({ match_id: "2" })];

    await writeAllMatchesToCache(matches);

    expect(setMock).toHaveBeenCalledWith("matches:all", JSON.stringify(matches), "EX", 90);
  });
});

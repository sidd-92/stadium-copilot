import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RawMatch } from "../types";

const fetchGamesMock = vi.fn();
const checkHealthMock = vi.fn().mockResolvedValue(true);
const writeMatchToCacheMock = vi.fn().mockResolvedValue(undefined);
const writeAllMatchesToCacheMock = vi.fn().mockResolvedValue(undefined);
const publishMatchEventMock = vi.fn().mockResolvedValue(undefined);

vi.mock("../worldcup26-client", async () => {
  const actual = await vi.importActual<typeof import("../worldcup26-client")>("../worldcup26-client");
  return {
    ...actual,
    fetchGames: fetchGamesMock,
    checkHealth: checkHealthMock,
  };
});

vi.mock("../redis-cache", () => ({
  writeMatchToCache: writeMatchToCacheMock,
  writeAllMatchesToCache: writeAllMatchesToCacheMock,
}));

vi.mock("../pubsub-publisher", () => ({
  publishMatchEvent: publishMatchEventMock,
}));

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

describe("pollOnce integration", () => {
  beforeEach(() => {
    fetchGamesMock.mockReset();
    checkHealthMock.mockClear();
    writeMatchToCacheMock.mockClear();
    writeAllMatchesToCacheMock.mockClear();
    publishMatchEventMock.mockClear();
    delete process.env.MOCK_MODE;
  });

  it("does not crash and does not publish for an unrecognized time_elapsed value", async () => {
    fetchGamesMock.mockResolvedValue([
      makeMatch({ id: "1", time_elapsed: "halftime" }),
      makeMatch({ id: "2", time_elapsed: "live" }),
    ]);

    const { pollOnce } = await import("../poll");
    const result = await expect(pollOnce()).resolves.toBe("ok");
    void result;

    // Only the genuinely-live match (id 2) should have been written/published.
    expect(publishMatchEventMock).toHaveBeenCalledTimes(1);
    expect(publishMatchEventMock).toHaveBeenCalledWith(expect.objectContaining({ match_id: "2" }));
    expect(writeMatchToCacheMock).toHaveBeenCalledTimes(1);
  });

  it("never reads, stores, or publishes home_scorers / away_scorers even when present", async () => {
    fetchGamesMock.mockResolvedValue([
      makeMatch({
        id: "3",
        time_elapsed: "live",
        home_scorers: "g4rbled;;name",
        away_scorers: "corrupted-entry",
      }),
    ]);

    const { pollOnce } = await import("../poll");
    await pollOnce();

    expect(publishMatchEventMock).toHaveBeenCalledTimes(1);
    const publishedEvent = publishMatchEventMock.mock.calls[0][0];
    expect(publishedEvent).not.toHaveProperty("home_scorers");
    expect(publishedEvent).not.toHaveProperty("away_scorers");

    expect(writeMatchToCacheMock).toHaveBeenCalledTimes(1);
    const cachedEvent = writeMatchToCacheMock.mock.calls[0][0];
    expect(cachedEvent).not.toHaveProperty("home_scorers");
    expect(cachedEvent).not.toHaveProperty("away_scorers");
  });

  it("caches the full schedule snapshot including non-live matches, not just live ones", async () => {
    fetchGamesMock.mockResolvedValue([
      makeMatch({ id: "1", time_elapsed: "notstarted" }),
      makeMatch({ id: "2", time_elapsed: "live" }),
      makeMatch({ id: "3", time_elapsed: "finished" }),
    ]);

    const { pollOnce } = await import("../poll");
    await pollOnce();

    // Only match 2 is live (publish/per-match cache), but the full
    // snapshot must contain all three regardless of status.
    expect(writeAllMatchesToCacheMock).toHaveBeenCalledTimes(1);
    const snapshot = writeAllMatchesToCacheMock.mock.calls[0][0];
    expect(snapshot.map((m: { match_id: string }) => m.match_id).sort()).toEqual(["1", "2", "3"]);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { MatchEvent } from "../types";

const getMock = vi.fn();

vi.mock("ioredis", () => ({
  default: vi.fn().mockImplementation(() => ({
    get: getMock,
  })),
}));

vi.mock("../order-store", () => ({
  getOrdersByStandAndStatuses: vi.fn(),
  getStand: vi.fn(),
  getStandsByMatch: vi.fn(),
  transitionOrder: vi.fn(),
  createOrder: vi.fn(),
  getOrder: vi.fn(),
  estimateEtaMinutes: () => 5,
}));

function makeMatch(overrides: Partial<MatchEvent> = {}): MatchEvent {
  return {
    match_id: "99",
    home_team_name_en: "Norway",
    away_team_name_en: "England",
    home_score: "1",
    away_score: "0",
    finished: "FALSE",
    time_elapsed: "live",
    group: "QF",
    type: "qf",
    local_date: "07/11/2026 17:00",
    stadium_id: "8",
    last_updated: "2026-07-13T00:00:00.000Z",
    ...overrides,
  };
}

describe("GET /matches/:match_id", () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it("returns the cached match when present", async () => {
    getMock.mockResolvedValue(JSON.stringify(makeMatch()));

    const { app } = await import("../app");
    const res = await request(app).get("/matches/99");

    expect(res.status).toBe(200);
    expect(res.body.match_id).toBe("99");
    expect(res.body.time_elapsed).toBe("live");
  });

  it("returns 404 (not 200 with null) when nothing is cached", async () => {
    getMock.mockResolvedValue(null);

    const { app } = await import("../app");
    const res = await request(app).get("/matches/does-not-exist");

    expect(res.status).toBe(404);
  });
});

describe("GET /matches/upcoming", () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it("returns only notstarted matches, soonest first", async () => {
    const snapshot = [
      makeMatch({ match_id: "later", time_elapsed: "notstarted", local_date: "07/20/2026 15:00" }),
      makeMatch({ match_id: "live-one", time_elapsed: "live" }),
      makeMatch({ match_id: "sooner", time_elapsed: "notstarted", local_date: "07/14/2026 14:00" }),
      makeMatch({ match_id: "done", time_elapsed: "finished" }),
    ];
    getMock.mockResolvedValue(JSON.stringify(snapshot));

    const { app } = await import("../app");
    const res = await request(app).get("/matches/upcoming");

    expect(res.status).toBe(200);
    expect(res.body.matches.map((m: MatchEvent) => m.match_id)).toEqual(["sooner", "later"]);
  });

  it("respects the limit query param, capped at 50", async () => {
    const snapshot = Array.from({ length: 5 }, (_, i) =>
      makeMatch({ match_id: `m${i}`, time_elapsed: "notstarted", local_date: `07/1${i}/2026 14:00` }),
    );
    getMock.mockResolvedValue(JSON.stringify(snapshot));

    const { app } = await import("../app");
    const res = await request(app).get("/matches/upcoming?limit=2");

    expect(res.body.matches).toHaveLength(2);
  });

  it("returns an empty list rather than an error when nothing is cached yet", async () => {
    getMock.mockResolvedValue(null);

    const { app } = await import("../app");
    const res = await request(app).get("/matches/upcoming");

    expect(res.status).toBe(200);
    expect(res.body.matches).toEqual([]);
  });
});

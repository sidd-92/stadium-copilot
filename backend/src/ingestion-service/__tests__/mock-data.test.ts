import { beforeEach, describe, expect, it } from "vitest";
import { getMockGames, __resetMockCursorForTests } from "../mock-data";

describe("getMockGames", () => {
  beforeEach(() => {
    __resetMockCursorForTests();
  });

  it("cycles notstarted -> live 0-0 -> live with a goal -> finished, then wraps", () => {
    const notStarted = getMockGames()[0];
    const liveNoScore = getMockGames()[0];
    const liveWithGoal = getMockGames()[0];
    const finished = getMockGames()[0];
    const wrapped = getMockGames()[0];

    expect(notStarted.time_elapsed).toBe("notstarted");

    expect(liveNoScore.time_elapsed).toBe("live");
    expect(liveNoScore.home_score).toBe("0");
    expect(liveNoScore.away_score).toBe("0");

    expect(liveWithGoal.time_elapsed).toBe("live");
    expect(liveWithGoal.home_score).toBe("1");

    expect(finished.time_elapsed).toBe("finished");
    expect(finished.finished).toBe("TRUE");

    expect(wrapped.time_elapsed).toBe("notstarted");
  });

  it("__resetMockCursorForTests() returns the sequence to the start", () => {
    getMockGames();
    getMockGames();
    __resetMockCursorForTests();

    expect(getMockGames()[0].time_elapsed).toBe("notstarted");
  });
});

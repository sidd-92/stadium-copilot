import sequence from "./fixtures/mock-sequence.json";
import type { RawMatch } from "./types";

interface MockState {
  games: RawMatch[];
}

const states = sequence as MockState[];

// Advances one step per call so consecutive polls walk through
// notstarted -> live 0-0 -> live with a goal -> finished, then wraps.
// This is the guaranteed-working demo path when worldcup26.ir is down or
// flaky during the actual presentation.
let cursor = 0;

export function getMockGames(): RawMatch[] {
  const state = states[cursor % states.length];
  cursor += 1;
  return state.games;
}

// Test-only: module-level cursor otherwise leaks across test cases (see
// worldcup26-client.ts's __resetTokenCacheForTests for the same pattern).
export function __resetMockCursorForTests(): void {
  cursor = 0;
}

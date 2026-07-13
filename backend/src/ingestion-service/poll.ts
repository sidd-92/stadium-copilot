import { checkHealth, fetchGames, RateLimitedError, UpstreamError } from "./worldcup26-client";
import { publishMatchEvent } from "./pubsub-publisher";
import { writeAllMatchesToCache, writeMatchToCache } from "./redis-cache";
import { getMockGames } from "./mock-data";
import type { MatchEvent, RawMatch } from "./types";

// Cloud Scheduler triggers /poll every 1 minute (its minimum granularity)
// with a 120s attempt_deadline. We internally loop inside that single
// invocation to get 15-30s effective freshness, capped well under the
// deadline so we always return 200 cleanly.
const LOOP_DURATION_MS = 50_000;
const POLL_INTERVAL_MS = 20_000; // middle of the 15-30s target range

type CycleResult = "ok" | "rate_limited" | "upstream_error";

// time_elapsed is a free-form string from an individually-maintained,
// SLA-less API. Anything that isn't exactly "live" is treated as not
// live — this never throws on an unrecognized value.
export function isLive(match: RawMatch): boolean {
  return match.time_elapsed === "live";
}

// Only the named fields ever cross this boundary. home_scorers/
// away_scorers (or any other field worldcup26.ir returns) are never read,
// stored, or published — see the module doc in types.ts.
export function toMatchEvent(match: RawMatch): MatchEvent {
  return {
    match_id: match.id,
    home_team_name_en: match.home_team_name_en,
    away_team_name_en: match.away_team_name_en,
    home_score: match.home_score,
    away_score: match.away_score,
    finished: match.finished,
    time_elapsed: match.time_elapsed,
    group: match.group,
    type: match.type,
    local_date: match.local_date,
    stadium_id: match.stadium_id,
    last_updated: new Date().toISOString(),
  };
}

export async function processLiveMatches(games: RawMatch[]): Promise<MatchEvent[]> {
  const allEvents = games.map(toMatchEvent);
  // MatchEvent carries the same time_elapsed field as RawMatch, so the
  // same defensive "only exactly 'live' counts" check applies here.
  const liveEvents = allEvents.filter((event) => event.time_elapsed === "live");

  // Full-schedule snapshot (every match, any status) — powers the
  // "upcoming matches" list. Independent of the live-only publish/cache
  // path below: a failure here shouldn't block live-match handling.
  try {
    await writeAllMatchesToCache(allEvents);
  } catch (err) {
    console.error("[ingestion] failed to write full match snapshot to cache:", err);
  }

  for (const event of liveEvents) {
    // Each match is independent: a Redis or Pub/Sub failure on one match
    // must not stop the others from being written/published.
    try {
      await writeMatchToCache(event);
    } catch (err) {
      console.error(`[ingestion] failed to write match ${event.match_id} to cache:`, err);
    }
    try {
      await publishMatchEvent(event);
    } catch (err) {
      console.error(`[ingestion] failed to publish match ${event.match_id}:`, err);
    }
  }

  return liveEvents;
}

export async function pollOnce(): Promise<CycleResult> {
  if (process.env.MOCK_MODE === "true") {
    await processLiveMatches(getMockGames());
    return "ok";
  }

  try {
    const games = await fetchGames();
    await processLiveMatches(games);
    return "ok";
  } catch (err) {
    if (err instanceof RateLimitedError) {
      console.warn("[ingestion] rate limited (429) — skipping remainder of this cycle, not retrying");
      return "rate_limited";
    }

    if (err instanceof UpstreamError) {
      // Non-200 from worldcup26.ir: leave last-known-good Redis data in
      // place (we simply don't write), log, and move on.
      console.error("[ingestion] upstream error, leaving cached data in place:", err.message);
      return "upstream_error";
    }

    // Fetch itself failed (network error, DNS, etc). Ping /health (no
    // auth) to tell "API fully down" apart from "my token is bad" —
    // this makes debugging far easier than a generic catch-all error.
    const healthy = await checkHealth();
    console.error(
      `[ingestion] poll failed (${healthy ? "worldcup26.ir /health is OK — likely an auth problem" : "worldcup26.ir /health also failing — API appears down"}):`,
      err,
    );
    return "upstream_error";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Runs for up to LOOP_DURATION_MS, polling every POLL_INTERVAL_MS, then
// returns. Never throws — the /poll HTTP handler always gets a clean
// return so it can respond 200 to Cloud Scheduler regardless of what
// happened upstream.
export async function runPollLoop(): Promise<void> {
  const start = Date.now();

  while (Date.now() - start < LOOP_DURATION_MS) {
    const result = await pollOnce();

    if (result === "rate_limited") {
      break; // don't retry-storm a rate-limited cycle
    }

    if (Date.now() - start + POLL_INTERVAL_MS >= LOOP_DURATION_MS) {
      break; // no time left for another full iteration
    }

    await sleep(POLL_INTERVAL_MS);
  }
}

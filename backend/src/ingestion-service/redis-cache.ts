import Redis from "ioredis";
import type { MatchEvent } from "./types";

// Fan-facing reads hit this cache, never worldcup26.ir or this service
// directly. Short TTL so a stalled ingestion loop doesn't serve
// arbitrarily stale data forever — it just expires and downstream reads
// see nothing until the next successful write.
const TTL_SECONDS = 60;

// The full-schedule snapshot (all 104 matches, any status) lives longer
// than a single match's TTL — it changes far less often per-poll than a
// live score does, and losing it between poll cycles would make the
// "upcoming matches" list flicker empty for no reason.
const ALL_MATCHES_TTL_SECONDS = 90;
const ALL_MATCHES_KEY = "matches:all";

let client: Redis | null = null;

function getClient(): Redis {
  if (!client) {
    client = new Redis({
      host: process.env.REDIS_HOST ?? "127.0.0.1",
      port: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
  }
  return client;
}

export async function writeMatchToCache(match: MatchEvent): Promise<void> {
  const redis = getClient();
  const key = `match:${match.match_id}`;
  await redis.set(key, JSON.stringify(match), "EX", TTL_SECONDS);
}

// Unlike writeMatchToCache (per-match, only ever called for live matches,
// used for notification/scoring), this caches every match regardless of
// status — including notstarted ones — so a read-only "upcoming matches"
// list can exist without ever hitting worldcup26.ir directly.
export async function writeAllMatchesToCache(matches: MatchEvent[]): Promise<void> {
  const redis = getClient();
  await redis.set(ALL_MATCHES_KEY, JSON.stringify(matches), "EX", ALL_MATCHES_TTL_SECONDS);
}

export async function closeCache(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
  }
}

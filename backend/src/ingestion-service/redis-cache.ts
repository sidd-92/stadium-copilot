import Redis from "ioredis";
import type { MatchEvent } from "./types";

// Fan-facing reads hit this cache, never worldcup26.ir or this service
// directly. Short TTL so a stalled ingestion loop doesn't serve
// arbitrarily stale data forever — it just expires and downstream reads
// see nothing until the next successful write.
const TTL_SECONDS = 60;

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

export async function closeCache(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
  }
}

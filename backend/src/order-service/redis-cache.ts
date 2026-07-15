import type Redis from "ioredis";
import { createRedisClient } from "../shared/redis-client";

// Read-only counterpart to ingestion-service's redis-cache.ts — this
// service never writes match data, only reads what ingestion-service
// already cached under match:{id} (60s TTL). REDIS_HOST/PORT are already
// wired into order-service's Cloud Run env (see infra/order_service.tf).
let client: Redis | null = null;

function getClient(): Redis {
  if (!client) {
    client = createRedisClient();
  }
  return client;
}

export async function readMatchFromCache<T>(matchId: string): Promise<T | null> {
  const redis = getClient();
  const raw = await redis.get(`match:${matchId}`);
  return raw ? (JSON.parse(raw) as T) : null;
}

// Full-schedule snapshot (all matches, any status) written by
// ingestion-service under matches:all — this is what backs the "upcoming
// matches" list, since match:{id} only ever exists for currently-live
// matches.
export async function readAllMatchesFromCache<T>(): Promise<T[] | null> {
  const redis = getClient();
  const raw = await redis.get("matches:all");
  return raw ? (JSON.parse(raw) as T[]) : null;
}

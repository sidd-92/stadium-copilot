// Shared Redis connection config — both services point at the same
// Memorystore instance (see infra/ingestion.tf and infra/order_service.tf),
// just with different read/write access patterns, so only the client
// construction itself is shared here.
import Redis from "ioredis";

export function createRedisClient(): Redis {
  return new Redis({
    host: process.env.REDIS_HOST ?? "127.0.0.1",
    port: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  });
}

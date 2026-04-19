/** Redis singleton and typed cache helper methods. */
import Redis from "ioredis";
import { env } from "@/config";

type GlobalRedis = typeof globalThis & {
  __redisClient__?: Redis;
};

/**
 * Creates the shared Redis client instance.
 */
function createRedisClient(): Redis {
  const client = new Redis(env.REDIS_URL, {
    enableReadyCheck: true,
    lazyConnect: true,
    maxRetriesPerRequest: 2,
  });

  client.on("error", (error) => {
    console.error("[redis] Client error", error);
  });

  return client;
}

const globalForRedis = globalThis as GlobalRedis;

/** Shared Redis client singleton for the application runtime. */
export const redis = globalForRedis.__redisClient__ ?? createRedisClient();

if (env.NODE_ENV !== "production") {
  globalForRedis.__redisClient__ = redis;
}

/**
 * Reads and JSON-decodes a value from Redis.
 */
async function get<T>(key: string): Promise<T | null> {
  const serializedValue = await redis.get(key);

  if (serializedValue === null) {
    return null;
  }

  return JSON.parse(serializedValue) as T;
}

/**
 * Writes a JSON-encoded value to Redis with an optional TTL.
 */
async function set<T>(key: string, value: T, ttlSeconds?: number): Promise<"OK" | null> {
  const serializedValue = JSON.stringify(value);

  if (ttlSeconds !== undefined) {
    return redis.set(key, serializedValue, "EX", ttlSeconds);
  }

  return redis.set(key, serializedValue);
}

/**
 * Deletes one or more Redis keys.
 */
async function del(...keys: string[]): Promise<number> {
  if (keys.length === 0) {
    return 0;
  }

  return redis.del(...keys);
}

/**
 * Increments a Redis counter and optionally sets its TTL on first increment.
 */
async function incr(key: string, ttlSeconds?: number): Promise<number> {
  const nextValue = await redis.incr(key);

  if (nextValue === 1 && ttlSeconds !== undefined) {
    await redis.expire(key, ttlSeconds);
  }

  return nextValue;
}

/** Typed Redis helper API exposed to the backend. */
export const redisCache = {
  del,
  get,
  incr,
  set,
} as const;

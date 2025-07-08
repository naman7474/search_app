// app/lib/cache/redis.server.ts
import { createClient } from "redis";

let redisClient: any;

export async function getRedisClient() {
  if (!process.env.REDIS_URL) {
    console.warn("Redis URL not configured, caching disabled");
    return null;
  }

  if (redisClient) {
    return redisClient;
  }

  const client = createClient({
    url: process.env.REDIS_URL,
  });

  client.on("error", (err: Error) => {
    console.error("Redis Client Error:", err);
    redisClient = undefined; // Reset on error
  });

  try {
    await client.connect();
    redisClient = client;
    return redisClient;
  } catch (err) {
    console.error("Failed to connect to Redis:", err);
    redisClient = undefined;
    return null;
  }
}

/**
 * Disconnect Redis client
 */
export async function disconnectRedis(): Promise<void> {
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
    redisClient = null;
  }
}

/**
 * Check if Redis is available
 */
export async function isRedisAvailable(): Promise<boolean> {
  const client = await getRedisClient();
  return client !== null && client.isOpen;
} 
import { Redis } from "ioredis";
import { config } from "../config.js";

/** Optional Redis presence/cache adapter; development works without Redis. */
export const redis = config.redisUrl ? new Redis(config.redisUrl) : null;
export async function setOnline(userId: string): Promise<void> {
  if (redis) await redis.set(`presence:${userId}`, "online", "EX", 90);
}
export async function setOffline(userId: string): Promise<void> {
  if (redis) await redis.del(`presence:${userId}`);
}

import Redis from "ioredis";
import { config } from "./env";

// Main Redis client for app use (OTP, rate limiting, etc.)
export const redis = new Redis(config.REDIS_URL, {
  lazyConnect: true,
  enableReadyCheck: false,
  maxRetriesPerRequest: 3,
});

// Separate connection for BullMQ (requires maxRetriesPerRequest: null)
export const bullRedis = new Redis(config.REDIS_URL, {
  lazyConnect: true,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
});

redis.on("error", (err) => {
  if (config.NODE_ENV !== "test") {
    console.error("[Redis] Connection error:", err.message);
  }
});

bullRedis.on("error", (err) => {
  if (config.NODE_ENV !== "test") {
    console.error("[BullMQ Redis] Connection error:", err.message);
  }
});

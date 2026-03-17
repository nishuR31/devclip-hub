import { createHash } from "crypto";
import { redis } from "../config/redis";

export type GuestUsageEvent = "clipboard" | "snippet";

export interface GuestUsage {
  clipboard: number;
  snippet: number;
}

const GUEST_LIMITS: GuestUsage = {
  clipboard: 25,
  snippet: 25,
};

const KEY_TTL_SECONDS = 60 * 60 * 24 * 365;

function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

function normalizeIp(ipRaw: string): string {
  const first = ipRaw.split(",")[0]?.trim() ?? "";
  return first || "unknown";
}

function usageFromRedis(value: Record<string, string>): GuestUsage {
  return {
    clipboard: Number(value.clipboard ?? 0),
    snippet: Number(value.snippet ?? 0),
  };
}

function pickMaxUsage(a: GuestUsage, b: GuestUsage): GuestUsage {
  return {
    clipboard: Math.max(a.clipboard, b.clipboard),
    snippet: Math.max(a.snippet, b.snippet),
  };
}

function guestIdKey(guestId: string) {
  return `guest:usage:id:${guestId}`;
}

function ipKey(ip: string) {
  return `guest:usage:ip:${hashValue(normalizeIp(ip))}`;
}

function keyForEvent(event: GuestUsageEvent): keyof GuestUsage {
  return event === "clipboard" ? "clipboard" : "snippet";
}

async function readUsage(
  idKey: string,
  ipUsageKey: string,
): Promise<GuestUsage> {
  try {
    const [byIdRaw, byIpRaw] = await Promise.all([
      redis.hgetall(idKey),
      redis.hgetall(ipUsageKey),
    ]);

    const byId = usageFromRedis(byIdRaw);
    const byIp = usageFromRedis(byIpRaw);
    return pickMaxUsage(byId, byIp);
  } catch {
    return { clipboard: 0, snippet: 0 };
  }
}

export async function getGuestUsage(
  guestId: string,
  ip: string,
): Promise<GuestUsage> {
  return readUsage(guestIdKey(guestId), ipKey(ip));
}

export async function trackGuestUsage(
  guestId: string,
  ip: string,
  event: GuestUsageEvent,
  delta = 1,
): Promise<{ usage: GuestUsage; limits: GuestUsage; limitReached: boolean }> {
  const idUsageKey = guestIdKey(guestId);
  const ipUsageKey = ipKey(ip);
  const usageField = keyForEvent(event);
  const bumpBy = Math.max(1, Math.min(delta, 10));

  try {
    await Promise.all([
      redis
        .multi()
        .hincrby(idUsageKey, usageField, bumpBy)
        .expire(idUsageKey, KEY_TTL_SECONDS)
        .exec(),
      redis
        .multi()
        .hincrby(ipUsageKey, usageField, bumpBy)
        .expire(ipUsageKey, KEY_TTL_SECONDS)
        .exec(),
    ]);
  } catch {
    // Fail open: frontend-side checks still apply.
  }

  const usage = await readUsage(idUsageKey, ipUsageKey);
  const limitReached = usage[usageField] >= GUEST_LIMITS[usageField];

  return {
    usage,
    limits: GUEST_LIMITS,
    limitReached,
  };
}

export function getGuestLimits(): GuestUsage {
  return GUEST_LIMITS;
}

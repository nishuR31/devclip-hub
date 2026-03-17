import { randomUUID } from "crypto";
import { Request, Response } from "express";
import { sendError, sendSuccess } from "../utils/response";
import {
  getGuestLimits,
  getGuestUsage,
  trackGuestUsage,
  type GuestUsageEvent,
} from "../services/guest.service";

const GUEST_COOKIE = "devclip_guest_id";

function resolveIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded;
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0] ?? req.ip;
  }
  return req.ip ?? "unknown";
}

function resolveGuestId(req: Request): string {
  const headerGuestId = req.headers["x-guest-id"];
  const candidate =
    req.body?.guestId ??
    req.query?.guestId ??
    req.cookies?.[GUEST_COOKIE] ??
    (typeof headerGuestId === "string" ? headerGuestId : null);

  if (typeof candidate === "string") {
    const trimmed = candidate.trim();
    if (trimmed.length >= 8 && trimmed.length <= 64) {
      return trimmed;
    }
  }

  return randomUUID();
}

function ensureGuestCookie(res: Response, guestId: string) {
  res.cookie(GUEST_COOKIE, guestId, {
    httpOnly: false,
    sameSite: "lax",
    secure: false,
    maxAge: 1000 * 60 * 60 * 24 * 365,
    path: "/",
  });
}

export async function guestUsage(req: Request, res: Response) {
  const guestId = resolveGuestId(req);
  const ip = resolveIp(req);

  ensureGuestCookie(res, guestId);

  const usage = await getGuestUsage(guestId, ip);
  const limits = getGuestLimits();

  return sendSuccess(res, "Guest usage fetched", 200, {
    guestId,
    usage,
    limits,
  });
}

export async function trackUsage(req: Request, res: Response) {
  const guestId = resolveGuestId(req);
  const ip = resolveIp(req);
  const { event, delta } = req.body as {
    event: GuestUsageEvent;
    delta?: number;
  };

  ensureGuestCookie(res, guestId);

  const result = await trackGuestUsage(guestId, ip, event, delta ?? 1);

  if (result.limitReached) {
    return sendError(res, "Free guest limit reached. Please sign in.", 403, {
      code: "GUEST_LIMIT_REACHED",
      guestId,
      usage: result.usage,
      limits: result.limits,
    });
  }

  return sendSuccess(res, "Guest usage tracked", 200, {
    guestId,
    usage: result.usage,
    limits: result.limits,
  });
}

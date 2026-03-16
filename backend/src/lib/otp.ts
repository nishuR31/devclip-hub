import bcrypt from "bcrypt";
import { redis } from "../config/redis";
import { generateOTP, generateSecureToken, hashToken } from "./crypto";
import { config } from "../config/env";

const OTP_PREFIX = "otp:email:";
const MAGIC_PREFIX = "magic:";

// ── Email OTP ──────────────────────────────────────────────────────────────────

export async function storeEmailOTP(userId: string): Promise<string> {
  const otp = generateOTP();
  const otpHash = await bcrypt.hash(otp, 10);
  const key = `${OTP_PREFIX}${userId}`;
  await redis.set(key, otpHash, "EX", config.OTP_EXPIRES_SECONDS);
  return otp;
}

export async function verifyEmailOTP(
  userId: string,
  submittedOtp: string,
): Promise<boolean> {
  const key = `${OTP_PREFIX}${userId}`;
  const stored = await redis.get(key);
  if (!stored) return false;
  const valid = await bcrypt.compare(submittedOtp, stored);
  if (valid) await redis.del(key);
  return valid;
}

export async function getOTPTTL(userId: string): Promise<number> {
  return redis.ttl(`${OTP_PREFIX}${userId}`);
}

// ── Password Reset OTP ─────────────────────────────────────────────────────────

const RESET_PREFIX = "otp:reset:";

export async function storePasswordResetOTP(userId: string): Promise<string> {
  const otp = generateOTP();
  const otpHash = await bcrypt.hash(otp, 10);
  const key = `${RESET_PREFIX}${userId}`;
  await redis.set(key, otpHash, "EX", config.OTP_EXPIRES_SECONDS);
  return otp;
}

export async function verifyPasswordResetOTP(
  userId: string,
  submittedOtp: string,
): Promise<boolean> {
  const key = `${RESET_PREFIX}${userId}`;
  const stored = await redis.get(key);
  if (!stored) return false;
  const valid = await bcrypt.compare(submittedOtp, stored);
  if (valid) await redis.del(key);
  return valid;
}

// ── Magic Link ─────────────────────────────────────────────────────────────────

export async function storeMagicToken(userId: string): Promise<string> {
  const token = generateSecureToken();
  const tokenHash = hashToken(token);
  const key = `${MAGIC_PREFIX}${tokenHash}`;
  await redis.set(key, userId, "EX", config.MAGIC_LINK_EXPIRES_SECONDS);
  return token;
}

export async function verifyMagicToken(token: string): Promise<string | null> {
  const tokenHash = hashToken(token);
  const key = `${MAGIC_PREFIX}${tokenHash}`;
  const userId = await redis.get(key);
  if (!userId) return null;
  await redis.del(key);
  return userId;
}

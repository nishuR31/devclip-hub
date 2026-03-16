import crypto from "crypto";
import { config } from "../config/env";

/** 6-digit numeric OTP */
export function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString();
}

/** 32-byte hex token (64 chars) for magic links / password resets */
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/** SHA-256 hash of a token — used to safely store / compare tokens */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Random UUID for refresh token families */
export function generateFamily(): string {
  return crypto.randomUUID();
}

/** AES-256-GCM encrypt (for TOTP secrets at rest) */
export function encryptText(plaintext: string): string {
  const key = Buffer.from(config.TOTP_ENCRYPTION_KEY.slice(0, 64), "hex");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

/** AES-256-GCM decrypt */
export function decryptText(ciphertext: string): string {
  const key = Buffer.from(config.TOTP_ENCRYPTION_KEY.slice(0, 64), "hex");
  const data = Buffer.from(ciphertext, "base64");
  const iv = data.slice(0, 12);
  const tag = data.slice(12, 28);
  const encrypted = data.slice(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final("utf8");
}

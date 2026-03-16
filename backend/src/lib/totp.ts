import { authenticator } from "otplib";
import QRCode from "qrcode";
import crypto from "crypto";

authenticator.options = { window: 1 }; // allow 30s clock drift

export function generateTOTPSecret(): string {
  return authenticator.generateSecret(20);
}

export function getTOTPUri(secret: string, email: string): string {
  return authenticator.keyuri(email, "DevClipboard Hub", secret);
}

export async function getQRCodeDataUrl(uri: string): Promise<string> {
  return QRCode.toDataURL(uri);
}

export function verifyTOTPCode(secret: string, token: string): boolean {
  try {
    return authenticator.verify({ token, secret });
  } catch {
    return false;
  }
}

export function generateBackupCodes(): string[] {
  return Array.from({ length: 8 }, () => crypto.randomBytes(5).toString("hex"));
}

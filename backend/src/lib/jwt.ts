import jwt from "jsonwebtoken";
import { config } from "../config/env";

export interface AccessTokenPayload {
  sub: string; // userId
  email: string;
  plan: string;
}

export interface RefreshTokenPayload {
  sub: string; // userId
  family: string;
}

export interface TwoFactorTokenPayload {
  sub: string; // userId
  type: "2fa";
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, config.ACCESS_TOKEN_SECRET, { expiresIn: "15m" });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, config.ACCESS_TOKEN_SECRET) as AccessTokenPayload;
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, config.REFRESH_TOKEN_SECRET, { expiresIn: "7d" });
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(
    token,
    config.REFRESH_TOKEN_SECRET
  ) as RefreshTokenPayload;
}

export function signTwoFactorToken(userId: string): string {
  const payload: TwoFactorTokenPayload = { sub: userId, type: "2fa" };
  return jwt.sign(payload, config.TWO_FACTOR_TOKEN_SECRET, {
    expiresIn: "5m",
  });
}

export function verifyTwoFactorToken(token: string): TwoFactorTokenPayload {
  return jwt.verify(
    token,
    config.TWO_FACTOR_TOKEN_SECRET
  ) as TwoFactorTokenPayload;
}

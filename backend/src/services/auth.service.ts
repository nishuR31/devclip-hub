import bcrypt from "bcrypt";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  signTwoFactorToken,
  verifyTwoFactorToken,
} from "../lib/jwt";
import { generateFamily, hashToken, generateSecureToken } from "../lib/crypto";
import {
  storeEmailOTP,
  verifyEmailOTP,
  getOTPTTL,
  storePasswordResetOTP,
  verifyPasswordResetOTP,
  storeMagicToken,
  verifyMagicToken,
} from "../lib/otp";
import {
  generateTOTPSecret,
  getTOTPUri,
  getQRCodeDataUrl,
  verifyTOTPCode,
  generateBackupCodes,
} from "../lib/totp";
import { encryptText, decryptText } from "../lib/crypto";
import { enqueueEmail } from "../queues/email.queue";
import { AppError, SafeUser } from "../types";
import { config } from "../config/env";
import { authRepository } from "../repositories/auth.repository";

// ── Helpers ────────────────────────────────────────────────────────────────────

function sanitizeUser(user: any, plan: string = "FREE"): SafeUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    emailVerified: user.emailVerified,
    avatarUrl: user.avatarUrl,
    twoFactorEnabled: user.twoFactorEnabled,
    plan,
    createdAt: user.createdAt,
  };
}

async function issueTokens(
  userId: string,
  email: string,
  plan: string,
  userAgent?: string,
  ip?: string,
) {
  const family = generateFamily();
  const refreshToken = signRefreshToken({ sub: userId, family });
  const tokenHash = hashToken(refreshToken);

  await authRepository.createRefreshToken({
    userId,
    tokenHash,
    family,
    userAgent: userAgent ?? null,
    ip: ip ?? null,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  const accessToken = signAccessToken({ sub: userId, email, plan });
  return { accessToken, refreshToken };
}

async function getUserPlan(userId: string): Promise<string> {
  const sub = await authRepository.findUserPlan(userId);
  return sub?.plan ?? "FREE";
}

function ensureGoogleOauthConfigured() {
  if (
    !config.GOOGLE_CLIENT_ID ||
    !config.GOOGLE_CLIENT_SECRET ||
    !config.GOOGLE_REDIRECT_URI
  ) {
    throw new AppError(
      "Google OAuth is not configured on backend",
      501,
      "OAUTH_NOT_CONFIGURED",
    );
  }
}

export function getGoogleOAuthUrl() {
  ensureGoogleOauthConfigured();

  const params = new URLSearchParams({
    client_id: config.GOOGLE_CLIENT_ID,
    redirect_uri: config.GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

async function exchangeGoogleCode(code: string) {
  ensureGoogleOauthConfigured();

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.GOOGLE_CLIENT_ID,
      client_secret: config.GOOGLE_CLIENT_SECRET,
      redirect_uri: config.GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    throw new AppError("Failed to exchange Google code", 401, "OAUTH_FAILED");
  }

  const tokenData = (await tokenRes.json()) as {
    access_token?: string;
    id_token?: string;
  };

  if (!tokenData.access_token) {
    throw new AppError("Google access token missing", 401, "OAUTH_FAILED");
  }

  const meRes = await fetch(
    "https://openidconnect.googleapis.com/v1/userinfo",
    {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    },
  );

  if (!meRes.ok) {
    throw new AppError("Failed to fetch Google profile", 401, "OAUTH_FAILED");
  }

  const me = (await meRes.json()) as {
    email?: string;
    name?: string;
    email_verified?: boolean;
  };

  if (!me.email) {
    throw new AppError(
      "Google account email not available",
      400,
      "OAUTH_FAILED",
    );
  }

  return {
    email: me.email.toLowerCase().trim(),
    name: me.name?.trim() || me.email,
    emailVerified: Boolean(me.email_verified),
  };
}

// ── Register ───────────────────────────────────────────────────────────────────

export async function register(
  name: string,
  email: string,
  password: string,
  userAgent?: string,
  ip?: string,
) {
  const existing = await authRepository.findUserByEmail(email);
  if (existing) throw new AppError("Email already in use", 409, "EMAIL_IN_USE");

  const passwordHash = await bcrypt.hash(password, config.BCRYPT_ROUNDS);

  const user = await authRepository.createUserWithFreePlan({
    name,
    email,
    passwordHash,
  });

  // Generate and store OTP
  const otp = await storeEmailOTP(user.id);

  // Queue verification + welcome emails
  await enqueueEmail({
    type: "verification",
    to: email,
    name: name || email,
    otp,
  });
  await enqueueEmail({
    type: "welcome",
    to: email,
    name: name || email,
  });

  return { message: "Verification email sent", userId: user.id };
}

// ── Verify Email ───────────────────────────────────────────────────────────────

export async function verifyEmail(
  email: string,
  submittedOtp: string,
  userAgent?: string,
  ip?: string,
) {
  const user = await authRepository.findUserByEmail(email);
  if (!user) throw new AppError("User not found", 404, "NOT_FOUND");
  if (user.emailVerified)
    throw new AppError("Email already verified", 400, "ALREADY_VERIFIED");

  const valid = await verifyEmailOTP(user.id, submittedOtp);
  if (!valid) throw new AppError("Invalid or expired OTP", 400, "INVALID_OTP");

  await authRepository.updateUser(user.id, { emailVerified: true });

  const plan = await getUserPlan(user.id);
  const tokens = await issueTokens(user.id, email, plan, userAgent, ip);
  return { ...tokens, user: sanitizeUser(user, plan) };
}

// ── Resend Verification OTP ────────────────────────────────────────────────────

export async function resendVerification(email: string) {
  const user = await authRepository.findUserByEmail(email);
  if (!user) return; // Silent — don't leak user existence
  if (user.emailVerified) return;

  // Throttle: only resend if no OTP set in last 60 seconds
  const ttl = await getOTPTTL(user.id);
  if (ttl > config.OTP_EXPIRES_SECONDS - 60) {
    throw new AppError(
      "Please wait before requesting another code",
      429,
      "TOO_SOON",
    );
  }

  const otp = await storeEmailOTP(user.id);
  await enqueueEmail({
    type: "verification",
    to: email,
    name: user.name || email,
    otp,
  });
}

// ── Login ──────────────────────────────────────────────────────────────────────

export async function login(
  email: string,
  password: string,
  userAgent?: string,
  ip?: string,
) {
  const user = await authRepository.findUserByEmail(email);
  if (!user || !user.passwordHash) {
    throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid)
    throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");

  if (!user.emailVerified) {
    // Resend verification silently
    await resendVerification(email).catch(() => {});
    throw new AppError(
      "Please verify your email first. A new code has been sent.",
      403,
      "EMAIL_NOT_VERIFIED",
    );
  }

  if (user.twoFactorEnabled) {
    const twoFactorToken = signTwoFactorToken(user.id);
    return { requires2FA: true, twoFactorToken };
  }

  const plan = await getUserPlan(user.id);
  const { accessToken, refreshToken } = await issueTokens(
    user.id,
    email,
    plan,
    userAgent,
    ip,
  );

  return { accessToken, refreshToken, user: sanitizeUser(user, plan) };
}

export async function loginWithGoogleCode(
  code: string,
  userAgent?: string,
  ip?: string,
) {
  const profile = await exchangeGoogleCode(code);

  let user = await authRepository.findUserByEmail(profile.email);

  if (!user) {
    user = await authRepository.createUserWithFreePlan({
      email: profile.email,
      name: profile.name,
      emailVerified: profile.emailVerified,
    });
    await enqueueEmail({
      type: "welcome",
      to: profile.email,
      name: profile.name,
    });
  } else if (!user.emailVerified && profile.emailVerified) {
    user = await authRepository.updateUser(user.id, { emailVerified: true });
  }

  const plan = await getUserPlan(user.id);
  const { accessToken, refreshToken } = await issueTokens(
    user.id,
    user.email,
    plan,
    userAgent,
    ip,
  );

  return { accessToken, refreshToken, user: sanitizeUser(user, plan) };
}

// ── 2FA TOTP Verify ───────────────────────────────────────────────────────────

export async function verifyTwoFactor(
  twoFactorToken: string,
  totpCode: string,
  userAgent?: string,
  ip?: string,
) {
  let payload;
  try {
    payload = verifyTwoFactorToken(twoFactorToken);
  } catch {
    throw new AppError(
      "Invalid or expired 2FA token",
      401,
      "INVALID_2FA_TOKEN",
    );
  }

  const user = await authRepository.findUserById(payload.sub);
  if (!user || !user.twoFactorSecret)
    throw new AppError("2FA not configured", 400, "2FA_NOT_CONFIGURED");

  const secret = decryptText(user.twoFactorSecret);
  const valid = verifyTOTPCode(secret, totpCode);
  if (!valid) throw new AppError("Invalid TOTP code", 401, "INVALID_TOTP");

  const plan = await getUserPlan(user.id);
  const tokens = await issueTokens(user.id, user.email, plan, userAgent, ip);
  return { ...tokens, user: sanitizeUser(user, plan) };
}

// ── Logout ─────────────────────────────────────────────────────────────────────

export async function logout(refreshTokenRaw: string) {
  if (!refreshTokenRaw) return;
  const tokenHash = hashToken(refreshTokenRaw);
  await authRepository.revokeRefreshTokensByHash(tokenHash);
}

// ── Refresh Tokens ─────────────────────────────────────────────────────────────

export async function refreshTokens(
  refreshTokenRaw: string,
  userAgent?: string,
  ip?: string,
) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshTokenRaw);
  } catch {
    throw new AppError("Invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
  }

  const tokenHash = hashToken(refreshTokenRaw);
  const stored = await authRepository.findRefreshTokenByHash(tokenHash);

  if (!stored) {
    throw new AppError("Refresh token not found", 401, "INVALID_REFRESH_TOKEN");
  }

  // Reuse detection: if token is revoked, revoke entire family
  if (stored.revokedAt) {
    await authRepository.revokeRefreshTokenFamily(stored.userId, stored.family);
    throw new AppError(
      "Refresh token reuse detected. Please login again.",
      401,
      "TOKEN_REUSED",
    );
  }

  // Revoke old token
  await authRepository.revokeRefreshTokenById(stored.id);

  // Issue new pair
  const user = await authRepository.findUserById(stored.userId);
  if (!user) throw new AppError("User not found", 404, "NOT_FOUND");

  const plan = await getUserPlan(user.id);
  const newRefreshToken = signRefreshToken({
    sub: user.id,
    family: stored.family,
  });
  const newTokenHash = hashToken(newRefreshToken);

  await authRepository.createRefreshToken({
    userId: user.id,
    tokenHash: newTokenHash,
    family: stored.family,
    userAgent: userAgent ?? null,
    ip: ip ?? null,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    plan,
  });
  return {
    accessToken,
    refreshToken: newRefreshToken,
    user: sanitizeUser(user, plan),
  };
}

// ── 2FA Setup ──────────────────────────────────────────────────────────────────

export async function setupTwoFactor(userId: string) {
  const user = await authRepository.findUserById(userId);
  if (!user) throw new AppError("User not found", 404, "NOT_FOUND");
  if (user.twoFactorEnabled)
    throw new AppError("2FA is already enabled", 400, "ALREADY_ENABLED");

  const secret = generateTOTPSecret();
  const encryptedSecret = encryptText(secret);
  const uri = getTOTPUri(secret, user.email);
  const qrCodeDataUrl = await getQRCodeDataUrl(uri);
  const backupCodes = generateBackupCodes();

  // Store pending secret (not yet enabled — user must confirm a code)
  await authRepository.updateUser(userId, { twoFactorSecret: encryptedSecret });

  return { secret, qrCodeDataUrl, backupCodes };
}

// ── 2FA Enable ─────────────────────────────────────────────────────────────────

export async function enableTwoFactor(userId: string, totpCode: string) {
  const user = await authRepository.findUserById(userId);
  if (!user || !user.twoFactorSecret)
    throw new AppError("Run 2FA setup first", 400, "SETUP_REQUIRED");
  if (user.twoFactorEnabled)
    throw new AppError("2FA already enabled", 400, "ALREADY_ENABLED");

  const secret = decryptText(user.twoFactorSecret);
  if (!verifyTOTPCode(secret, totpCode))
    throw new AppError("Invalid TOTP code", 400, "INVALID_TOTP");

  const backupCodes = generateBackupCodes();
  const hashedCodes = await Promise.all(
    backupCodes.map((c) => bcrypt.hash(c, 10)),
  );

  await authRepository.updateUser(userId, {
    twoFactorEnabled: true,
    backupCodes: hashedCodes,
  });

  return { backupCodes }; // Raw codes shown once
}

// ── 2FA Disable ────────────────────────────────────────────────────────────────

export async function disableTwoFactor(userId: string, password: string) {
  const user = await authRepository.findUserById(userId);
  if (!user || !user.passwordHash)
    throw new AppError("User not found", 404, "NOT_FOUND");

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid)
    throw new AppError("Invalid password", 401, "INVALID_CREDENTIALS");

  await authRepository.updateUser(userId, {
    twoFactorEnabled: false,
    twoFactorSecret: null,
    backupCodes: [],
  });
}

// ── Magic Link ─────────────────────────────────────────────────────────────────

export async function sendMagicLink(email: string) {
  let user = await authRepository.findUserByEmail(email);

  // Auto-create user if not exists (passwordless signup)
  if (!user) {
    user = await authRepository.createUserWithFreePlan({
      email,
      emailVerified: true,
    });
    await enqueueEmail({ type: "welcome", to: email, name: email });
  }

  const token = await storeMagicToken(user.id);
  const magicUrl = `${config.FRONTEND_URL}/auth/magic?token=${token}`;
  await enqueueEmail({
    type: "magic_link",
    to: email,
    name: user.name || email,
    magicUrl,
  });
}

export async function verifyMagicLink(
  token: string,
  userAgent?: string,
  ip?: string,
) {
  const userId = await verifyMagicToken(token);
  if (!userId)
    throw new AppError(
      "Magic link expired or already used",
      400,
      "INVALID_TOKEN",
    );

  const user = await authRepository.findUserById(userId);
  if (!user) throw new AppError("User not found", 404, "NOT_FOUND");

  // Mark email verified if not already
  if (!user.emailVerified) {
    await authRepository.updateUser(userId, { emailVerified: true });
  }

  const plan = await getUserPlan(userId);
  const tokens = await issueTokens(userId, user.email, plan, userAgent, ip);
  return {
    ...tokens,
    user: sanitizeUser({ ...user, emailVerified: true }, plan),
  };
}

// ── Forgot Password ────────────────────────────────────────────────────────────

export async function sendPasswordReset(email: string) {
  const user = await authRepository.findUserByEmail(email);
  if (!user) return; // Silently ignore to not leak user existence

  const otp = await storePasswordResetOTP(user.id);
  await enqueueEmail({
    type: "password_reset",
    to: email,
    name: user.name || email,
    otp,
  });
}

export async function resetPassword(
  email: string,
  otp: string,
  newPassword: string,
) {
  const user = await authRepository.findUserByEmail(email);
  if (!user) throw new AppError("User not found", 404, "NOT_FOUND");

  const valid = await verifyPasswordResetOTP(user.id, otp);
  if (!valid) throw new AppError("Invalid or expired OTP", 400, "INVALID_OTP");

  const passwordHash = await bcrypt.hash(newPassword, config.BCRYPT_ROUNDS);

  // Update password and revoke ALL refresh tokens
  await Promise.all([
    authRepository.updateUser(user.id, { passwordHash }),
    authRepository.revokeActiveRefreshTokensByUser(user.id),
  ]);
}

// ── Change Password ────────────────────────────────────────────────────────────

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
  currentRefreshToken?: string,
) {
  const user = await authRepository.findUserById(userId);
  if (!user || !user.passwordHash)
    throw new AppError("User not found", 404, "NOT_FOUND");

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid)
    throw new AppError(
      "Current password is incorrect",
      401,
      "INVALID_CREDENTIALS",
    );

  const passwordHash = await bcrypt.hash(newPassword, config.BCRYPT_ROUNDS);
  await authRepository.updateUser(userId, { passwordHash });

  // Revoke all OTHER refresh tokens (keep current session)
  if (currentRefreshToken) {
    const currentHash = hashToken(currentRefreshToken);
    await authRepository.revokeOtherActiveRefreshTokens(userId, currentHash);
  }
}

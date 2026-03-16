import { Request, Response } from "express";
import { CookieOptions } from "express";
import * as authService from "../services/auth.service";
import { config } from "../config/env";
import { sendSuccess, sendError } from "../utils/response";

const REFRESH_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: config.NODE_ENV === "production",
  sameSite: config.NODE_ENV === "production" ? "strict" : "lax",
  path: "/api/auth",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

function setRefreshCookie(res: Response, token: string) {
  res.cookie("refreshToken", token, REFRESH_COOKIE_OPTIONS);
}

export async function register(req: Request, res: Response) {
  const { name, email, password } = req.body;
  const result = await authService.register(
    name,
    email,
    password,
    req.headers["user-agent"],
    req.ip,
  );
  return sendSuccess(res, "Registration successful", 201, result);
}

export async function verifyEmail(req: Request, res: Response) {
  const result = await authService.verifyEmail(
    req.body.email,
    req.body.otp,
    req.headers["user-agent"],
    req.ip,
  );
  setRefreshCookie(res, result.refreshToken);
  return sendSuccess(res, "Email verified", 200, {
    accessToken: result.accessToken,
    user: result.user,
  });
}

export async function resendVerification(req: Request, res: Response) {
  await authService.resendVerification(req.body.email);
  return sendSuccess(
    res,
    "If that email exists, a new code has been sent.",
    200,
  );
}

export async function login(req: Request, res: Response) {
  const result = await authService.login(
    req.body.email,
    req.body.password,
    req.headers["user-agent"],
    req.ip,
  );

  if ("requires2FA" in result) {
    return sendSuccess(res, "2FA required", 200, result);
  }

  setRefreshCookie(res, result.refreshToken);
  return sendSuccess(res, "Login successful", 200, {
    accessToken: result.accessToken,
    user: result.user,
  });
}

export async function getGoogleOAuthUrl(_req: Request, res: Response) {
  const url = authService.getGoogleOAuthUrl();
  return sendSuccess(res, "OAuth URL generated", 200, { url });
}

export async function googleCallback(req: Request, res: Response) {
  const code = String(req.query.code || "");
  if (!code) {
    return sendError(res, "Missing OAuth code", 400, {
      code: "VALIDATION_ERROR",
    });
  }

  const result = await authService.loginWithGoogleCode(
    code,
    req.headers["user-agent"],
    req.ip,
  );

  setRefreshCookie(res, result.refreshToken);
  return sendSuccess(res, "OAuth login successful", 200, {
    accessToken: result.accessToken,
    user: result.user,
  });
}

export async function googleLogin(req: Request, res: Response) {
  const result = await authService.loginWithGoogleCode(
    req.body.code,
    req.headers["user-agent"],
    req.ip,
  );

  setRefreshCookie(res, result.refreshToken);
  return sendSuccess(res, "OAuth login successful", 200, {
    accessToken: result.accessToken,
    user: result.user,
  });
}

export async function logout(req: Request, res: Response) {
  const refreshToken = req.cookies?.refreshToken;
  await authService.logout(refreshToken ?? "");
  res.clearCookie("refreshToken", { path: "/api/auth" });
  return sendSuccess(res, "Logged out", 200);
}

export async function refresh(req: Request, res: Response) {
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) {
    return sendError(res, "No refresh token", 401, {
      code: "UNAUTHORIZED",
    });
  }

  const result = await authService.refreshTokens(
    refreshToken,
    req.headers["user-agent"],
    req.ip,
  );

  setRefreshCookie(res, result.refreshToken);
  return sendSuccess(res, "Token refreshed", 200, {
    accessToken: result.accessToken,
    user: result.user,
  });
}

export async function setupTwoFactor(req: Request, res: Response) {
  const result = await authService.setupTwoFactor(req.user!.id);
  return sendSuccess(res, "2FA setup ready", 200, result);
}

export async function enableTwoFactor(req: Request, res: Response) {
  const result = await authService.enableTwoFactor(
    req.user!.id,
    req.body.totpCode,
  );
  return sendSuccess(res, "2FA enabled", 200, result);
}

export async function disableTwoFactor(req: Request, res: Response) {
  await authService.disableTwoFactor(req.user!.id, req.body.password);
  return sendSuccess(res, "2FA disabled", 200);
}

export async function verifyTwoFactor(req: Request, res: Response) {
  const result = await authService.verifyTwoFactor(
    req.body.twoFactorToken,
    req.body.totpCode,
    req.headers["user-agent"],
    req.ip,
  );

  setRefreshCookie(res, result.refreshToken);
  return sendSuccess(res, "2FA verified", 200, {
    accessToken: result.accessToken,
    user: result.user,
  });
}

export async function sendMagicLink(req: Request, res: Response) {
  await authService.sendMagicLink(req.body.email);
  return sendSuccess(
    res,
    "If that email exists, a magic link has been sent.",
    200,
  );
}

export async function verifyMagicLink(req: Request, res: Response) {
  const result = await authService.verifyMagicLink(
    req.body.token,
    req.headers["user-agent"],
    req.ip,
  );

  setRefreshCookie(res, result.refreshToken);
  return sendSuccess(res, "Magic link verified", 200, {
    accessToken: result.accessToken,
    user: result.user,
  });
}

export async function forgotPassword(req: Request, res: Response) {
  await authService.sendPasswordReset(req.body.email);
  return sendSuccess(
    res,
    "If that email exists, a reset code has been sent.",
    200,
  );
}

export async function resetPassword(req: Request, res: Response) {
  await authService.resetPassword(
    req.body.email,
    req.body.otp,
    req.body.newPassword,
  );
  return sendSuccess(res, "Password reset successful", 200);
}

export async function changePassword(req: Request, res: Response) {
  const refreshToken = req.cookies?.refreshToken;
  await authService.changePassword(
    req.user!.id,
    req.body.currentPassword,
    req.body.newPassword,
    refreshToken,
  );
  return sendSuccess(res, "Password changed", 200);
}

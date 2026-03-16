import {
  Router,
  Request,
  Response,
  NextFunction,
  CookieOptions,
} from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { authenticate } from "../middleware/auth";
import { authLimiter, strictLimiter } from "../middleware/rateLimiter";
import * as authService from "../services/auth.service";
import { config } from "../config/env";

const router = Router();

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

// ── Schemas ────────────────────────────────────────────────────────────────────

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const verifyEmailSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});

const resetPasswordSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
  newPassword: z.string().min(8).max(128),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

// ── Routes ─────────────────────────────────────────────────────────────────────

router.post(
  "/register",
  authLimiter,
  validate(registerSchema),
  async (req, res, next) => {
    try {
      const { name, email, password } = req.body;
      const result = await authService.register(
        name,
        email,
        password,
        req.headers["user-agent"],
        req.ip,
      );
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/verify-email",
  authLimiter,
  validate(verifyEmailSchema),
  async (req, res, next) => {
    try {
      const result = await authService.verifyEmail(
        req.body.email,
        req.body.otp,
        req.headers["user-agent"],
        req.ip,
      );
      setRefreshCookie(res, result.refreshToken);
      res.json({ accessToken: result.accessToken, user: result.user });
    } catch (err) {
      next(err);
    }
  },
);

router.post("/resend-verification", strictLimiter, async (req, res, next) => {
  try {
    await authService.resendVerification(req.body.email);
    res.json({ message: "If that email exists, a new code has been sent." });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/login",
  authLimiter,
  validate(loginSchema),
  async (req, res, next) => {
    try {
      const result = await authService.login(
        req.body.email,
        req.body.password,
        req.headers["user-agent"],
        req.ip,
      );
      if ("requires2FA" in result) {
        return res.json(result);
      }
      setRefreshCookie(res, result.refreshToken);
      res.json({ accessToken: result.accessToken, user: result.user });
    } catch (err) {
      next(err);
    }
  },
);

router.post("/logout", async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    await authService.logout(refreshToken ?? "");
    res.clearCookie("refreshToken", { path: "/api/auth" });
    res.json({ message: "Logged out" });
  } catch (err) {
    next(err);
  }
});

router.post("/refresh", async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken)
      return res
        .status(401)
        .json({ code: "UNAUTHORIZED", message: "No refresh token" });
    const result = await authService.refreshTokens(
      refreshToken,
      req.headers["user-agent"],
      req.ip,
    );
    setRefreshCookie(res, result.refreshToken);
    res.json({ accessToken: result.accessToken, user: result.user });
  } catch (err) {
    next(err);
  }
});

router.post("/2fa/setup", authenticate, async (req, res, next) => {
  try {
    const result = await authService.setupTwoFactor(req.user!.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post(
  "/2fa/enable",
  authenticate,
  validate(z.object({ totpCode: z.string().length(6) })),
  async (req, res, next) => {
    try {
      const result = await authService.enableTwoFactor(
        req.user!.id,
        req.body.totpCode,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/2fa/disable",
  authenticate,
  validate(z.object({ password: z.string().min(1) })),
  async (req, res, next) => {
    try {
      await authService.disableTwoFactor(req.user!.id, req.body.password);
      res.json({ message: "2FA disabled" });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/2fa/verify",
  authLimiter,
  validate(
    z.object({ twoFactorToken: z.string(), totpCode: z.string().length(6) }),
  ),
  async (req, res, next) => {
    try {
      const result = await authService.verifyTwoFactor(
        req.body.twoFactorToken,
        req.body.totpCode,
        req.headers["user-agent"],
        req.ip,
      );
      setRefreshCookie(res, result.refreshToken);
      res.json({ accessToken: result.accessToken, user: result.user });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/magic-link",
  strictLimiter,
  validate(z.object({ email: z.string().email() })),
  async (req, res, next) => {
    try {
      await authService.sendMagicLink(req.body.email);
      res.json({
        message: "If that email exists, a magic link has been sent.",
      });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/magic-link/verify",
  authLimiter,
  validate(z.object({ token: z.string() })),
  async (req, res, next) => {
    try {
      const result = await authService.verifyMagicLink(
        req.body.token,
        req.headers["user-agent"],
        req.ip,
      );
      setRefreshCookie(res, result.refreshToken);
      res.json({ accessToken: result.accessToken, user: result.user });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/forgot-password",
  strictLimiter,
  validate(z.object({ email: z.string().email() })),
  async (req, res, next) => {
    try {
      await authService.sendPasswordReset(req.body.email);
      res.json({
        message: "If that email exists, a reset code has been sent.",
      });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/reset-password",
  authLimiter,
  validate(resetPasswordSchema),
  async (req, res, next) => {
    try {
      await authService.resetPassword(
        req.body.email,
        req.body.otp,
        req.body.newPassword,
      );
      res.json({ message: "Password reset successful" });
    } catch (err) {
      next(err);
    }
  },
);

router.put(
  "/change-password",
  authenticate,
  validate(changePasswordSchema),
  async (req, res, next) => {
    try {
      const refreshToken = req.cookies?.refreshToken;
      await authService.changePassword(
        req.user!.id,
        req.body.currentPassword,
        req.body.newPassword,
        refreshToken,
      );
      res.json({ message: "Password changed" });
    } catch (err) {
      next(err);
    }
  },
);

export default router;

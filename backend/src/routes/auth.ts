import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { authenticate } from "../middleware/auth";
import { authLimiter, strictLimiter } from "../middleware/rateLimiter";
import * as authController from "../controllers/auth.controller";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

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

const googleOauthCodeSchema = z.object({
  code: z.string().min(1),
});

router.post(
  "/register",
  authLimiter,
  validate(registerSchema),
  asyncHandler(authController.register),
);

router.post(
  "/verify-email",
  authLimiter,
  validate(verifyEmailSchema),
  asyncHandler(authController.verifyEmail),
);

router.post(
  "/resend-verification",
  strictLimiter,
  asyncHandler(authController.resendVerification),
);

router.post(
  "/login",
  authLimiter,
  validate(loginSchema),
  asyncHandler(authController.login),
);

router.get("/oauth/google/url", asyncHandler(authController.getGoogleOAuthUrl));
router.get(
  "/oauth/google/callback",
  asyncHandler(authController.googleCallback),
);

router.post(
  "/oauth/google",
  authLimiter,
  validate(googleOauthCodeSchema),
  asyncHandler(authController.googleLogin),
);

router.post("/logout", asyncHandler(authController.logout));
router.post("/refresh", asyncHandler(authController.refresh));

router.post(
  "/2fa/setup",
  authenticate,
  asyncHandler(authController.setupTwoFactor),
);

router.post(
  "/2fa/enable",
  authenticate,
  validate(z.object({ totpCode: z.string().length(6) })),
  asyncHandler(authController.enableTwoFactor),
);

router.post(
  "/2fa/disable",
  authenticate,
  validate(z.object({ password: z.string().min(1) })),
  asyncHandler(authController.disableTwoFactor),
);

router.post(
  "/2fa/verify",
  authLimiter,
  validate(
    z.object({ twoFactorToken: z.string(), totpCode: z.string().length(6) }),
  ),
  asyncHandler(authController.verifyTwoFactor),
);

router.post(
  "/magic-link",
  strictLimiter,
  validate(z.object({ email: z.string().email() })),
  asyncHandler(authController.sendMagicLink),
);

router.post(
  "/magic-link/verify",
  authLimiter,
  validate(z.object({ token: z.string() })),
  asyncHandler(authController.verifyMagicLink),
);

router.post(
  "/forgot-password",
  strictLimiter,
  validate(z.object({ email: z.string().email() })),
  asyncHandler(authController.forgotPassword),
);

router.post(
  "/reset-password",
  authLimiter,
  validate(resetPasswordSchema),
  asyncHandler(authController.resetPassword),
);

router.put(
  "/change-password",
  authenticate,
  validate(changePasswordSchema),
  asyncHandler(authController.changePassword),
);

export default router;

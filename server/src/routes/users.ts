import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import * as userService from "../services/user.service";

const router = Router();

router.get("/me", authenticate, async (req, res, next) => {
  try {
    const profile = await userService.getProfile(req.user!.id);
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

router.put(
  "/me",
  authenticate,
  validate(
    z.object({
      name: z.string().min(1).max(100).optional(),
      avatarUrl: z.string().url().optional(),
    }),
  ),
  async (req, res, next) => {
    try {
      const updated = await userService.updateProfile(req.user!.id, req.body);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  "/me",
  authenticate,
  validate(z.object({ password: z.string().default("") })),
  async (req, res, next) => {
    try {
      await userService.deleteAccount(req.user!.id, req.body.password);
      res.clearCookie("refreshToken", { path: "/api/auth/refresh" });
      res.json({ message: "Account deleted" });
    } catch (err) {
      next(err);
    }
  },
);

export default router;

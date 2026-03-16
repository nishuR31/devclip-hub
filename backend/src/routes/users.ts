import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import * as usersController from "../controllers/users.controller";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.get("/me", authenticate, asyncHandler(usersController.getMe));

router.put(
  "/me",
  authenticate,
  validate(
    z.object({
      name: z.string().min(1).max(100).optional(),
      avatarUrl: z.string().url().optional(),
    }),
  ),
  asyncHandler(usersController.updateMe),
);

router.delete(
  "/me",
  authenticate,
  validate(z.object({ password: z.string().default("") })),
  asyncHandler(usersController.deleteMe),
);

export default router;

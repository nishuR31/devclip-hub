import { Router } from "express";
import { z } from "zod";
import { apiLimiter } from "../middleware/rateLimiter";
import { validate } from "../middleware/validate";
import * as guestController from "../controllers/guest.controller";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.use(apiLimiter);

router.get("/usage", asyncHandler(guestController.guestUsage));

router.post(
  "/track",
  validate(
    z.object({
      guestId: z.string().min(8).max(64).optional(),
      event: z.enum(["clipboard", "snippet"]),
      delta: z.number().int().min(1).max(10).optional(),
    }),
  ),
  asyncHandler(guestController.trackUsage),
);

export default router;

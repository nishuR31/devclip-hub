import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { apiLimiter } from "../middleware/rateLimiter";
import * as subscriptionsController from "../controllers/subscriptions.controller";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.get("/plans", asyncHandler(subscriptionsController.listPlans));

router.use(authenticate, apiLimiter);

router.get("/me", asyncHandler(subscriptionsController.getMySubscription));
router.post(
  "/cancel",
  asyncHandler(subscriptionsController.cancelSubscription),
);
router.post(
  "/reactivate",
  asyncHandler(subscriptionsController.reactivateSubscription),
);

export default router;

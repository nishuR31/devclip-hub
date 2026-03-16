import { Router } from "express";
import * as webhooksController from "../controllers/webhooks.controller";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

// NOTE: This route MUST receive the raw body.
// In index.ts it is mounted BEFORE express.json() with express.raw({ type: 'application/json' }).
router.post("/razorpay", asyncHandler(webhooksController.razorpayWebhook));

export default router;

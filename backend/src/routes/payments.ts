import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { apiLimiter } from "../middleware/rateLimiter";
import * as paymentsController from "../controllers/payments.controller";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.use(authenticate, apiLimiter);

router.post(
  "/checkout",
  validate(z.object({ planId: z.string().min(1) })),
  asyncHandler(paymentsController.createCheckout),
);

router.post(
  "/verify",
  validate(
    z.object({
      razorpay_payment_id: z.string().min(1),
      razorpay_subscription_id: z.string().min(1),
      razorpay_signature: z.string().min(1),
    }),
  ),
  asyncHandler(paymentsController.verifyPayment),
);

export default router;

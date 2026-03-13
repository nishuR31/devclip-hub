import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { apiLimiter } from "../middleware/rateLimiter";
import * as paymentService from "../services/payment.service";

const router = Router();

router.use(authenticate, apiLimiter);

// Create Razorpay subscription → returns { subscriptionId, keyId } for frontend checkout
router.post(
  "/checkout",
  validate(z.object({ planId: z.string().min(1) })),
  async (req, res, next) => {
    try {
      const result = await paymentService.createCheckoutSession(
        req.user!.id,
        req.body.planId,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// Verify Razorpay payment signature after frontend checkout completes
router.post(
  "/verify",
  validate(
    z.object({
      razorpay_payment_id: z.string().min(1),
      razorpay_subscription_id: z.string().min(1),
      razorpay_signature: z.string().min(1),
    }),
  ),
  async (req, res, next) => {
    try {
      const result = await paymentService.verifyPayment(
        req.user!.id,
        req.body.razorpay_payment_id,
        req.body.razorpay_subscription_id,
        req.body.razorpay_signature,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

export default router;

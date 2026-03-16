import { Request, Response } from "express";
import * as paymentService from "../services/payment.service";
import { sendSuccess } from "../utils/response";

export async function createCheckout(req: Request, res: Response) {
  const result = await paymentService.createCheckoutSession(
    req.user!.id,
    req.body.planId,
  );
  return sendSuccess(res, "Checkout session created", 200, result);
}

export async function verifyPayment(req: Request, res: Response) {
  const result = await paymentService.verifyPayment(
    req.user!.id,
    req.body.razorpay_payment_id,
    req.body.razorpay_subscription_id,
    req.body.razorpay_signature,
  );
  return sendSuccess(res, "Payment verified", 200, result);
}

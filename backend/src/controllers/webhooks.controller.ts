import { Request, Response } from "express";
import crypto from "crypto";
import { config } from "../config/env";
import { enqueueRazorpayEvent } from "../queues/razorpay.queue";
import { sendError, sendSuccess } from "../utils/response";

export async function razorpayWebhook(req: Request, res: Response) {
  const receivedSig = req.headers["x-razorpay-signature"] as string;
  const body = req.body as Buffer;

  const expectedSig = crypto
    .createHmac("sha256", config.RAZORPAY_WEBHOOK_SECRET)
    .update(body)
    .digest("hex");

  if (!receivedSig || expectedSig !== receivedSig) {
    console.error("[Webhook] Razorpay signature verification failed");
    return sendError(res, "Invalid signature", 400);
  }

  let event: any;
  try {
    event = JSON.parse(body.toString());
  } catch {
    return sendError(res, "Invalid payload", 400);
  }

  try {
    await enqueueRazorpayEvent(event);
  } catch (err) {
    console.error("[Webhook] Failed to enqueue Razorpay event:", err);
  }

  return sendSuccess(res, "Webhook received", 200, { received: true });
}

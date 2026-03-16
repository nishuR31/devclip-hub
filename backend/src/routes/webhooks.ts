import { Router, Request, Response } from "express";
import crypto from "crypto";
import { config } from "../config/env";
import { razorpayQueue } from "../queues/razorpay.queue";

const router = Router();

// NOTE: This route MUST receive the raw body.
// In index.ts it is mounted BEFORE express.json() with express.raw({ type: 'application/json' }).
router.post("/razorpay", async (req: Request, res: Response) => {
  const receivedSig = req.headers["x-razorpay-signature"] as string;
  const body = req.body as Buffer;

  const expectedSig = crypto
    .createHmac("sha256", config.RAZORPAY_WEBHOOK_SECRET)
    .update(body)
    .digest("hex");

  if (!receivedSig || expectedSig !== receivedSig) {
    console.error("[Webhook] Razorpay signature verification failed");
    return res.status(400).json({ error: "Invalid signature" });
  }

  // Acknowledge immediately; process async via BullMQ
  res.json({ received: true });

  let event: any;
  try {
    event = JSON.parse(body.toString());
  } catch {
    return;
  }

  try {
    await razorpayQueue.add(
      event.event ?? "unknown",
      { event },
      {
        jobId: `${event.event}-${Date.now()}`,
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    );
  } catch (err) {
    console.error("[Webhook] Failed to enqueue Razorpay event:", err);
  }
});

export default router;

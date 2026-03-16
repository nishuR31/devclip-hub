import crypto from "crypto";
import { rzp, RZP_PLAN_TO_TIER, YEARLY_PLAN_IDS } from "../config/razorpay";
import { AppError } from "../types";
import { config } from "../config/env";
import * as subscriptionService from "./subscription.service";
import { subscriptionRepository } from "../repositories/subscription.repository";

export async function createCheckoutSession(userId: string, planId: string) {
  await subscriptionService.ensureSubscriptionExists(userId);

  const subscription = await (rzp.subscriptions.create as Function)({
    plan_id: planId,
    total_count: 120, // 120 billing cycles (~10 years for monthly)
    quantity: 1,
    customer_notify: 1,
    notes: { userId },
  });

  return { subscriptionId: subscription.id, keyId: config.RAZORPAY_KEY_ID };
}

export async function verifyPayment(
  userId: string,
  razorpay_payment_id: string,
  razorpay_subscription_id: string,
  razorpay_signature: string,
) {
  const expected = crypto
    .createHmac("sha256", config.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
    .digest("hex");

  if (expected !== razorpay_signature)
    throw new AppError("Invalid payment signature", 400, "INVALID_SIGNATURE");

  const sub = await (rzp.subscriptions.fetch as Function)(
    razorpay_subscription_id,
  );
  const planId = sub.plan_id as string;
  const plan = RZP_PLAN_TO_TIER[planId] ?? "FREE";
  const interval = YEARLY_PLAN_IDS.has(planId) ? "YEARLY" : "MONTHLY";

  await subscriptionRepository.updateByUserId(userId, {
    plan: plan as any,
    status: "ACTIVE",
    rzpSubscriptionId: razorpay_subscription_id,
    rzpPlanId: planId,
    billingInterval: interval as any,
    cancelAtPeriodEnd: false,
  });

  return { success: true };
}

export async function handleWebhookEvent(event: any) {
  const eventType: string = event?.event ?? "";
  const subEntity = event?.payload?.subscription?.entity;

  if (!subEntity?.id) return;

  const statusMap: Record<string, string> = {
    active: "ACTIVE",
    created: "ACTIVE",
    authenticated: "ACTIVE",
    pending: "INCOMPLETE",
    halted: "PAST_DUE",
    cancelled: "CANCELED",
    completed: "CANCELED",
    expired: "CANCELED",
  };

  switch (eventType) {
    case "subscription.activated":
    case "subscription.charged": {
      const planId = subEntity.plan_id as string;
      const plan = RZP_PLAN_TO_TIER[planId] ?? "FREE";
      const interval = YEARLY_PLAN_IDS.has(planId) ? "YEARLY" : "MONTHLY";

      await subscriptionService.updateFromRzp(subEntity.id, {
        plan,
        status: statusMap[subEntity.status] ?? "ACTIVE",
        rzpPlanId: planId,
        billingInterval: interval,
        currentPeriodStart:
          subEntity.current_start ?
            new Date(subEntity.current_start * 1000)
          : undefined,
        currentPeriodEnd:
          subEntity.current_end ?
            new Date(subEntity.current_end * 1000)
          : undefined,
        cancelAtPeriodEnd: false,
      });
      break;
    }

    case "subscription.halted":
      await subscriptionService.updateFromRzp(subEntity.id, {
        status: "PAST_DUE",
      });
      break;

    case "subscription.cancelled":
    case "subscription.completed":
      await subscriptionService.updateFromRzp(subEntity.id, {
        plan: "FREE",
        status: "CANCELED",
        cancelAtPeriodEnd: false,
      });
      break;
  }
}

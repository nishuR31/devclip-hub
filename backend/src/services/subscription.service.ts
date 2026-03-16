import { rzp } from "../config/razorpay";
import { AppError } from "../types";
import { subscriptionRepository } from "../repositories/subscription.repository";

export async function getForUser(userId: string) {
  return subscriptionRepository.findByUserId(userId);
}

export async function ensureSubscriptionExists(userId: string) {
  const existing = await subscriptionRepository.findByUserId(userId);
  if (existing) return existing;
  return subscriptionRepository.createFreeForUser(userId);
}

export async function cancelAtPeriodEnd(userId: string) {
  const sub = await subscriptionRepository.findByUserId(userId);
  if (!sub?.rzpSubscriptionId)
    throw new AppError("No active subscription", 400, "NO_SUBSCRIPTION");

  // cancel_at_cycle_end=true → cancels after current billing cycle
  await (rzp.subscriptions.cancel as Function)(sub.rzpSubscriptionId, true);
  return subscriptionRepository.updateByUserId(userId, {
    cancelAtPeriodEnd: true,
  });
}

export async function reactivate(userId: string) {
  // Razorpay does not support reversing a cancellation via API.
  // The user must re-subscribe through the pricing page.
  throw new AppError(
    "To reactivate, please subscribe again from the pricing page.",
    400,
    "REACTIVATE_VIA_PRICING",
  );
}

export async function updateFromRzp(
  rzpSubscriptionId: string,
  updates: {
    plan?: string;
    status?: string;
    rzpPlanId?: string;
    billingInterval?: string;
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
    cancelAtPeriodEnd?: boolean;
  },
) {
  await subscriptionRepository.updateManyByRzpSubscriptionId(
    rzpSubscriptionId,
    updates as any,
  );
}

export async function updateRzpSubscription(
  userId: string,
  rzpSubscriptionId: string,
) {
  await subscriptionRepository.updateByUserId(userId, { rzpSubscriptionId });
}

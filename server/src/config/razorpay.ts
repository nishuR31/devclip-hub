import Razorpay from "razorpay";
import { config } from "./env";

export const rzp = new Razorpay({
  key_id: config.RAZORPAY_KEY_ID,
  key_secret: config.RAZORPAY_KEY_SECRET,
});

export type PlanTier = "FREE" | "STARTER" | "PRO" | "TEAM";

// Map Razorpay plan IDs → our plan tier
export const RZP_PLAN_TO_TIER: Record<string, PlanTier> = {
  [config.RAZORPAY_STARTER_MONTHLY_PLAN_ID]: "STARTER",
  [config.RAZORPAY_STARTER_YEARLY_PLAN_ID]: "STARTER",
  [config.RAZORPAY_PRO_MONTHLY_PLAN_ID]: "PRO",
  [config.RAZORPAY_PRO_YEARLY_PLAN_ID]: "PRO",
  [config.RAZORPAY_TEAM_MONTHLY_PLAN_ID]: "TEAM",
  [config.RAZORPAY_TEAM_YEARLY_PLAN_ID]: "TEAM",
};

// Set of plan IDs billed yearly (for billing interval detection)
export const YEARLY_PLAN_IDS = new Set([
  config.RAZORPAY_STARTER_YEARLY_PLAN_ID,
  config.RAZORPAY_PRO_YEARLY_PLAN_ID,
  config.RAZORPAY_TEAM_YEARLY_PLAN_ID,
]);

export const PLAN_LIMITS: Record<
  PlanTier,
  { clipboard: number; snippets: number }
> = {
  FREE: { clipboard: 50, snippets: 10 },
  STARTER: { clipboard: 500, snippets: -1 },
  PRO: { clipboard: 2000, snippets: -1 },
  TEAM: { clipboard: -1, snippets: -1 },
};

import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { apiLimiter } from "../middleware/rateLimiter";
import * as subscriptionService from "../services/subscription.service";
import { PLAN_LIMITS } from "../config/razorpay";
import { config } from "../config/env";

const router = Router();

// Public: list available plans with pricing
router.get("/plans", (req, res) => {
  const plans = [
    {
      id: "FREE",
      name: "Free",
      monthlyINR: 0,
      yearlyINR: 0,
      limits: PLAN_LIMITS.FREE,
      features: [
        "50 clipboard items",
        "10 snippets",
        "Local storage only",
        "Device Inspector tab",
      ],
    },
    {
      id: "STARTER",
      name: "Starter",
      monthlyINR: 29900,
      yearlyINR: 249900,
      rzpPlanIds: {
        monthly: config.RAZORPAY_STARTER_MONTHLY_PLAN_ID,
        yearly: config.RAZORPAY_STARTER_YEARLY_PLAN_ID,
      },
      limits: PLAN_LIMITS.STARTER,
      features: [
        "500 clipboard items",
        "Unlimited snippets",
        "Export (JSON / CSV / TXT)",
        "All Inspector tabs (IDB, Cache, Workers)",
        "Cloud sync",
      ],
    },
    {
      id: "PRO",
      name: "Pro",
      monthlyINR: 59900,
      yearlyINR: 499900,
      rzpPlanIds: {
        monthly: config.RAZORPAY_PRO_MONTHLY_PLAN_ID,
        yearly: config.RAZORPAY_PRO_YEARLY_PLAN_ID,
      },
      limits: PLAN_LIMITS.PRO,
      features: [
        "2,000 clipboard items",
        "Unlimited snippets",
        "Export (all formats)",
        "All Inspector tabs",
        "Cloud sync",
        "Two-factor authentication",
        "API access",
      ],
    },
    {
      id: "TEAM",
      name: "Team",
      monthlyINR: 149900,
      yearlyINR: 1199900,
      rzpPlanIds: {
        monthly: config.RAZORPAY_TEAM_MONTHLY_PLAN_ID,
        yearly: config.RAZORPAY_TEAM_YEARLY_PLAN_ID,
      },
      limits: PLAN_LIMITS.TEAM,
      features: [
        "Unlimited clipboard items",
        "Unlimited snippets",
        "Export (all formats)",
        "All Inspector tabs",
        "Cloud sync",
        "Two-factor authentication",
        "API access",
        "5 team members",
        "Shared snippets",
      ],
    },
  ];
  res.json(plans);
});

// Authenticated routes
router.use(authenticate, apiLimiter);

router.get("/me", async (req, res, next) => {
  try {
    const sub = await subscriptionService.getForUser(req.user!.id);
    res.json(sub);
  } catch (err) {
    next(err);
  }
});

router.post("/cancel", async (req, res, next) => {
  try {
    const sub = await subscriptionService.cancelAtPeriodEnd(req.user!.id);
    res.json(sub);
  } catch (err) {
    next(err);
  }
});

router.post("/reactivate", async (req, res, next) => {
  try {
    const sub = await subscriptionService.reactivate(req.user!.id);
    res.json(sub);
  } catch (err) {
    next(err);
  }
});

export default router;

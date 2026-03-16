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
      monthlyINR: config.PLAN_FREE_MONTHLY_INR_PAISE,
      yearlyINR: config.PLAN_FREE_YEARLY_INR_PAISE,
      limits: PLAN_LIMITS.FREE,
      features: [
        "25 clipboard items",
        "25 snippets",
        "Local storage only",
        "Preview mode",
        "Device Inspector tab",
      ],
    },
    {
      id: "STARTER",
      name: "Starter",
      monthlyINR: config.PLAN_STARTER_MONTHLY_INR_PAISE,
      yearlyINR: config.PLAN_STARTER_YEARLY_INR_PAISE,
      rzpPlanIds: {
        monthly: config.RAZORPAY_STARTER_MONTHLY_PLAN_ID,
        yearly: config.RAZORPAY_STARTER_YEARLY_PLAN_ID,
      },
      limits: PLAN_LIMITS.STARTER,
      features: [
        "100 clipboard items",
        "200 snippets",
        "Export (JSON / CSV / TXT)",
        "All Inspector tabs (IDB, Cache, Workers)",
        "Cloud sync",
      ],
    },
    {
      id: "PRO",
      name: "Pro",
      monthlyINR: config.PLAN_PRO_MONTHLY_INR_PAISE,
      yearlyINR: config.PLAN_PRO_YEARLY_INR_PAISE,
      rzpPlanIds: {
        monthly: config.RAZORPAY_PRO_MONTHLY_PLAN_ID,
        yearly: config.RAZORPAY_PRO_YEARLY_PLAN_ID,
      },
      limits: PLAN_LIMITS.PRO,
      features: [
        "250 clipboard items",
        "500 snippets",
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
      monthlyINR: config.PLAN_TEAM_MONTHLY_INR_PAISE,
      yearlyINR: config.PLAN_TEAM_YEARLY_INR_PAISE,
      rzpPlanIds: {
        monthly: config.RAZORPAY_TEAM_MONTHLY_PLAN_ID,
        yearly: config.RAZORPAY_TEAM_YEARLY_PLAN_ID,
      },
      limits: PLAN_LIMITS.TEAM,
      features: [
        "500 clipboard items",
        "1,000 snippets",
        "Export (all formats)",
        "All Inspector tabs",
        "Cloud sync",
        "Two-factor authentication",
        "API access",
        "Team members",
        "Shared snippets",
        "Tag edit & manage",
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

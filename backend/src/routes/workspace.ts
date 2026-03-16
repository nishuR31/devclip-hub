import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { apiLimiter } from "../middleware/rateLimiter";
import * as workspaceService from "../services/workspace.service";
import type { PlanTier } from "../config/razorpay";

const router = Router();

router.use(authenticate, apiLimiter);

router.get("/capabilities", (req, res) => {
  const plan = (req.user!.plan ?? "FREE") as PlanTier;
  const capabilities = workspaceService.getCapabilities(plan);

  if (plan === "FREE") {
    res.clearCookie("devclip_paid", { sameSite: "lax", secure: false });
  } else {
    res.cookie("devclip_paid", "1", {
      httpOnly: false,
      sameSite: "lax",
      secure: false,
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });
  }

  res.json(capabilities);
});

router.get("/team-members", async (req, res, next) => {
  try {
    const plan = (req.user!.plan ?? "FREE") as PlanTier;
    const members = await workspaceService.getTeamMembers(req.user!.id, plan);
    res.json({ members, count: members.length, plan });
  } catch (err) {
    next(err);
  }
});

export default router;

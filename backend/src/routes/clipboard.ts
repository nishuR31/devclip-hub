import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { apiLimiter } from "../middleware/rateLimiter";
import * as workspaceService from "../services/workspace.service";
import type { PlanTier } from "../config/razorpay";

const router = Router();

router.use(authenticate, apiLimiter);

router.get("/", async (req, res, next) => {
  try {
    const plan = (req.user!.plan ?? "FREE") as PlanTier;
    const limit = Number(req.query.limit ?? 100);
    const data = await workspaceService.listClipboard(
      req.user!.id,
      plan,
      limit,
    );
    res.json({
      data,
      total: data.length,
      source: plan === "FREE" ? "localStorage" : "db+redis",
    });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/",
  validate(
    z.object({
      content: z.string().min(1),
      pinned: z.boolean().optional(),
      tags: z.array(z.string().min(1).max(32)).optional(),
    }),
  ),
  async (req, res, next) => {
    try {
      const plan = (req.user!.plan ?? "FREE") as PlanTier;
      if (plan === "FREE") {
        return res
          .status(403)
          .json({ message: "Free plan is localStorage-only for editing" });
      }
      const entry = await workspaceService.addClipboard(
        req.user!.id,
        plan,
        req.body,
      );
      res.status(201).json(entry);
    } catch (err) {
      next(err);
    }
  },
);

router.put(
  "/:id",
  validate(
    z.object({
      content: z.string().min(1).optional(),
      pinned: z.boolean().optional(),
      tags: z.array(z.string().min(1).max(32)).optional(),
    }),
  ),
  async (req, res, next) => {
    try {
      const plan = (req.user!.plan ?? "FREE") as PlanTier;
      if (plan === "FREE") {
        return res
          .status(403)
          .json({ message: "Upgrade required to edit clipboard entries" });
      }
      const entry = await workspaceService.updateClipboard(
        req.user!.id,
        plan,
        req.params.id,
        req.body,
      );
      if (!entry) return res.status(404).json({ message: "Entry not found" });
      res.json(entry);
    } catch (err) {
      next(err);
    }
  },
);

router.delete("/:id", async (req, res, next) => {
  try {
    const plan = (req.user!.plan ?? "FREE") as PlanTier;
    if (plan === "FREE") {
      return res
        .status(403)
        .json({ message: "Upgrade required to delete clipboard entries" });
    }
    await workspaceService.deleteClipboard(req.user!.id, plan, req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.delete("/", async (req, res, next) => {
  try {
    const plan = (req.user!.plan ?? "FREE") as PlanTier;
    if (plan === "FREE") {
      return res
        .status(403)
        .json({ message: "Upgrade required to clear cloud clipboard" });
    }
    await workspaceService.clearUnpinnedClipboard(req.user!.id, plan);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;

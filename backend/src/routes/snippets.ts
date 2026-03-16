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
    const limit = Number(req.query.limit ?? 200);
    const data = await workspaceService.listSnippets(req.user!.id, plan, limit);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.post(
  "/",
  validate(
    z.object({
      title: z.string().min(1).max(120),
      content: z.string().min(1),
      tags: z.array(z.string().min(1).max(32)).optional(),
      masked: z.boolean().optional(),
      sharedWithTeam: z.boolean().optional(),
    }),
  ),
  async (req, res, next) => {
    try {
      const plan = (req.user!.plan ?? "FREE") as PlanTier;
      if (plan === "FREE") {
        return res
          .status(403)
          .json({
            message: "Free plan is localStorage-only for snippet editing",
          });
      }
      const entry = await workspaceService.addSnippet(
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
      title: z.string().min(1).max(120).optional(),
      content: z.string().min(1).optional(),
      tags: z.array(z.string().min(1).max(32)).optional(),
      masked: z.boolean().optional(),
      sharedWithTeam: z.boolean().optional(),
    }),
  ),
  async (req, res, next) => {
    try {
      const plan = (req.user!.plan ?? "FREE") as PlanTier;
      if (plan === "FREE") {
        return res
          .status(403)
          .json({ message: "Upgrade required to edit snippets" });
      }
      const entry = await workspaceService.updateSnippet(
        req.user!.id,
        plan,
        req.params.id,
        req.body,
      );
      if (!entry) return res.status(404).json({ message: "Snippet not found" });
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
        .json({ message: "Upgrade required to delete snippets" });
    }
    await workspaceService.deleteSnippet(req.user!.id, plan, req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;

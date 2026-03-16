import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { apiLimiter } from "../middleware/rateLimiter";
import * as workspaceController from "../controllers/workspace.controller";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.use(authenticate, apiLimiter);

router.get("/", asyncHandler(workspaceController.listSnippets));

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
  asyncHandler(workspaceController.addSnippet),
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
  asyncHandler(workspaceController.updateSnippet),
);

router.delete("/:id", asyncHandler(workspaceController.deleteSnippet));

export default router;

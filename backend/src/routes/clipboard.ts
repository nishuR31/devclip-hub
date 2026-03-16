import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { apiLimiter } from "../middleware/rateLimiter";
import * as workspaceController from "../controllers/workspace.controller";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.use(authenticate, apiLimiter);

router.get("/", asyncHandler(workspaceController.listClipboard));

router.post(
  "/",
  validate(
    z.object({
      content: z.string().min(1),
      pinned: z.boolean().optional(),
      tags: z.array(z.string().min(1).max(32)).optional(),
    }),
  ),
  asyncHandler(workspaceController.addClipboard),
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
  asyncHandler(workspaceController.updateClipboard),
);

router.delete("/:id", asyncHandler(workspaceController.deleteClipboard));

router.delete("/", asyncHandler(workspaceController.clearClipboard));

export default router;

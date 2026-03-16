import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { apiLimiter } from "../middleware/rateLimiter";
import * as workspaceController from "../controllers/workspace.controller";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.use(authenticate, apiLimiter);

router.get("/capabilities", asyncHandler(workspaceController.getCapabilities));

router.get("/team-members", asyncHandler(workspaceController.getTeamMembers));

export default router;

import { Request, Response } from "express";
import type { PlanTier } from "../config/razorpay";
import * as workspaceService from "../services/workspace.service";
import { sendSuccess, sendError } from "../utils/response";

export async function getCapabilities(req: Request, res: Response) {
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

  return sendSuccess(res, "Capabilities fetched", 200, capabilities);
}

export async function getTeamMembers(req: Request, res: Response) {
  const plan = (req.user!.plan ?? "FREE") as PlanTier;
  const members = await workspaceService.getTeamMembers(req.user!.id, plan);
  return sendSuccess(res, "Team members fetched", 200, {
    members,
    count: members.length,
    plan,
  });
}

export async function listClipboard(req: Request, res: Response) {
  const plan = (req.user!.plan ?? "FREE") as PlanTier;
  const limit = Number(req.query.limit ?? 100);
  const data = await workspaceService.listClipboard(req.user!.id, plan, limit);

  return sendSuccess(res, "Clipboard entries fetched", 200, {
    data,
    total: data.length,
    source: plan === "FREE" ? "localStorage" : "db+redis",
  });
}

export async function addClipboard(req: Request, res: Response) {
  const plan = (req.user!.plan ?? "FREE") as PlanTier;
  if (plan === "FREE") {
    return sendError(res, "Free plan is localStorage-only for editing", 403);
  }

  const entry = await workspaceService.addClipboard(
    req.user!.id,
    plan,
    req.body,
  );
  return sendSuccess(res, "Clipboard entry created", 201, entry);
}

export async function updateClipboard(req: Request, res: Response) {
  const plan = (req.user!.plan ?? "FREE") as PlanTier;
  if (plan === "FREE") {
    return sendError(res, "Upgrade required to edit clipboard entries", 403);
  }

  const entry = await workspaceService.updateClipboard(
    req.user!.id,
    plan,
    req.params.id,
    req.body,
  );

  if (!entry) {
    return sendError(res, "Entry not found", 404);
  }

  return sendSuccess(res, "Clipboard entry updated", 200, entry);
}

export async function deleteClipboard(req: Request, res: Response) {
  const plan = (req.user!.plan ?? "FREE") as PlanTier;
  if (plan === "FREE") {
    return sendError(res, "Upgrade required to delete clipboard entries", 403);
  }

  await workspaceService.deleteClipboard(req.user!.id, plan, req.params.id);
  return res.status(204).send();
}

export async function clearClipboard(req: Request, res: Response) {
  const plan = (req.user!.plan ?? "FREE") as PlanTier;
  if (plan === "FREE") {
    return sendError(res, "Upgrade required to clear cloud clipboard", 403);
  }

  await workspaceService.clearUnpinnedClipboard(req.user!.id, plan);
  return res.status(204).send();
}

export async function listSnippets(req: Request, res: Response) {
  const plan = (req.user!.plan ?? "FREE") as PlanTier;
  const limit = Number(req.query.limit ?? 200);
  const data = await workspaceService.listSnippets(req.user!.id, plan, limit);
  return sendSuccess(res, "Snippets fetched", 200, data);
}

export async function addSnippet(req: Request, res: Response) {
  const plan = (req.user!.plan ?? "FREE") as PlanTier;
  if (plan === "FREE") {
    return sendError(
      res,
      "Free plan is localStorage-only for snippet editing",
      403,
    );
  }

  const entry = await workspaceService.addSnippet(req.user!.id, plan, req.body);
  return sendSuccess(res, "Snippet created", 201, entry);
}

export async function updateSnippet(req: Request, res: Response) {
  const plan = (req.user!.plan ?? "FREE") as PlanTier;
  if (plan === "FREE") {
    return sendError(res, "Upgrade required to edit snippets", 403);
  }

  const entry = await workspaceService.updateSnippet(
    req.user!.id,
    plan,
    req.params.id,
    req.body,
  );

  if (!entry) {
    return sendError(res, "Snippet not found", 404);
  }

  return sendSuccess(res, "Snippet updated", 200, entry);
}

export async function deleteSnippet(req: Request, res: Response) {
  const plan = (req.user!.plan ?? "FREE") as PlanTier;
  if (plan === "FREE") {
    return sendError(res, "Upgrade required to delete snippets", 403);
  }

  await workspaceService.deleteSnippet(req.user!.id, plan, req.params.id);
  return res.status(204).send();
}

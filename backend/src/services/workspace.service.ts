import type { PlanTier } from "../config/razorpay";
import { workspaceRepository } from "../repositories/workspace.repository";

export interface ClipboardEntry {
  id: string;
  userId: string;
  content: string;
  type: "text" | "code" | "url" | "json";
  pinned: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SnippetEntry {
  id: string;
  userId: string;
  title: string;
  content: string;
  tags: string[];
  masked: boolean;
  sharedWithTeam: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceCapabilities {
  plan: PlanTier;
  limits: { clipboard: number; snippets: number };
  canEdit: boolean;
  canUseCloud: boolean;
  canUseTeams: boolean;
  canTagEdit: boolean;
  source: "localStorage" | "db+redis";
}

const PLAN_LIMITS: Record<PlanTier, { clipboard: number; snippets: number }> = {
  FREE: { clipboard: 25, snippets: 25 },
  STARTER: { clipboard: 100, snippets: 200 },
  PRO: { clipboard: 250, snippets: 500 },
  TEAM: { clipboard: 500, snippets: 1000 },
};

export function getCapabilities(plan: PlanTier): WorkspaceCapabilities {
  const isPaid = plan !== "FREE";
  return {
    plan,
    limits: PLAN_LIMITS[plan],
    canEdit: isPaid,
    canUseCloud: isPaid,
    canUseTeams: plan === "TEAM",
    canTagEdit: isPaid,
    source: isPaid ? "db+redis" : "localStorage",
  };
}

export async function listClipboard(
  userId: string,
  plan: PlanTier,
  limit: number,
): Promise<ClipboardEntry[]> {
  return workspaceRepository.listClipboard(userId, plan, limit);
}

export async function addClipboard(
  userId: string,
  plan: PlanTier,
  input: { content: string; tags?: string[]; pinned?: boolean },
): Promise<ClipboardEntry> {
  return workspaceRepository.addClipboard(userId, plan, input);
}

export async function updateClipboard(
  userId: string,
  plan: PlanTier,
  id: string,
  updates: Partial<Pick<ClipboardEntry, "content" | "pinned" | "tags">>,
): Promise<ClipboardEntry | null> {
  return workspaceRepository.updateClipboard(userId, plan, id, updates);
}

export async function deleteClipboard(
  userId: string,
  plan: PlanTier,
  id: string,
): Promise<void> {
  return workspaceRepository.deleteClipboard(userId, plan, id);
}

export async function clearUnpinnedClipboard(
  userId: string,
  plan: PlanTier,
): Promise<void> {
  return workspaceRepository.clearUnpinnedClipboard(userId, plan);
}

export async function listSnippets(
  userId: string,
  plan: PlanTier,
  limit: number,
): Promise<SnippetEntry[]> {
  return workspaceRepository.listSnippets(userId, plan, limit);
}

export async function addSnippet(
  userId: string,
  plan: PlanTier,
  input: {
    title: string;
    content: string;
    tags?: string[];
    masked?: boolean;
    sharedWithTeam?: boolean;
  },
): Promise<SnippetEntry> {
  return workspaceRepository.addSnippet(userId, plan, input);
}

export async function updateSnippet(
  userId: string,
  plan: PlanTier,
  id: string,
  updates: Partial<
    Pick<
      SnippetEntry,
      "title" | "content" | "tags" | "masked" | "sharedWithTeam"
    >
  >,
): Promise<SnippetEntry | null> {
  return workspaceRepository.updateSnippet(userId, plan, id, updates);
}

export async function deleteSnippet(
  userId: string,
  plan: PlanTier,
  id: string,
): Promise<void> {
  return workspaceRepository.deleteSnippet(userId, plan, id);
}

export async function getTeamMembers(
  userId: string,
  plan: PlanTier,
): Promise<string[]> {
  return workspaceRepository.getTeamMembers(userId, plan);
}

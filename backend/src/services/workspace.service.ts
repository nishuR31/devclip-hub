import { randomUUID } from "crypto";
import { prisma } from "../lib/prisma";
import { redis } from "../config/redis";
import type { PlanTier } from "../config/razorpay";

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

function collectionFor(kind: "clipboard" | "snippets") {
  return kind === "clipboard" ? "workspace_clipboard" : "workspace_snippets";
}

function cacheKey(
  kind: "clipboard" | "snippets",
  userId: string,
  limit: number,
) {
  return `ws:${kind}:${userId}:${limit}`;
}

function parseFirstBatch<T>(result: unknown): T[] {
  const value = result as { cursor?: { firstBatch?: T[] } };
  return value?.cursor?.firstBatch ?? [];
}

function detectType(content: string): ClipboardEntry["type"] {
  try {
    JSON.parse(content);
    return "json";
  } catch {
    // no-op
  }
  if (/^https?:\/\//i.test(content.trim())) return "url";
  if (/[{}<>();[\]=>]/.test(content) && content.includes("\n")) return "code";
  return "text";
}

async function getCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await redis.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

async function setCache<T>(key: string, value: T): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(value), "EX", 60);
  } catch {
    // cache is optional
  }
}

async function clearKindCache(kind: "clipboard" | "snippets", userId: string) {
  try {
    const keys = await redis.keys(`ws:${kind}:${userId}:*`);
    if (keys.length) await redis.del(keys);
  } catch {
    // cache is optional
  }
}

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
  if (plan === "FREE") return [];

  const capped = Math.min(limit, PLAN_LIMITS[plan].clipboard);
  const key = cacheKey("clipboard", userId, capped);
  const cached = await getCache<ClipboardEntry[]>(key);
  if (cached) return cached;

  const result = await prisma.$runCommandRaw({
    find: collectionFor("clipboard"),
    filter: { userId },
    sort: { createdAt: -1 },
    limit: capped,
  });

  const entries = parseFirstBatch<ClipboardEntry>(result);
  await setCache(key, entries);
  return entries;
}

export async function addClipboard(
  userId: string,
  plan: PlanTier,
  input: { content: string; tags?: string[]; pinned?: boolean },
): Promise<ClipboardEntry> {
  const now = new Date().toISOString();
  const doc: ClipboardEntry = {
    id: randomUUID(),
    userId,
    content: input.content,
    type: detectType(input.content),
    pinned: Boolean(input.pinned),
    tags: input.tags ?? [],
    createdAt: now,
    updatedAt: now,
  };

  if (plan !== "FREE") {
    await prisma.$runCommandRaw({
      insert: collectionFor("clipboard"),
      documents: [doc as unknown as Record<string, unknown>],
    } as never);
    await clearKindCache("clipboard", userId);
  }

  return doc;
}

export async function updateClipboard(
  userId: string,
  plan: PlanTier,
  id: string,
  updates: Partial<Pick<ClipboardEntry, "content" | "pinned" | "tags">>,
): Promise<ClipboardEntry | null> {
  if (plan === "FREE") return null;

  const patch: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };
  if (typeof updates.content === "string") {
    patch.content = updates.content;
    patch.type = detectType(updates.content);
  }
  if (typeof updates.pinned === "boolean") patch.pinned = updates.pinned;
  if (Array.isArray(updates.tags)) patch.tags = updates.tags;

  await prisma.$runCommandRaw({
    update: collectionFor("clipboard"),
    updates: [
      {
        q: { id, userId },
        u: { $set: patch as Record<string, unknown> },
        multi: false,
      },
    ],
  } as never);

  const result = await prisma.$runCommandRaw({
    find: collectionFor("clipboard"),
    filter: { id, userId },
    limit: 1,
  });

  await clearKindCache("clipboard", userId);
  return parseFirstBatch<ClipboardEntry>(result)[0] ?? null;
}

export async function deleteClipboard(
  userId: string,
  plan: PlanTier,
  id: string,
): Promise<void> {
  if (plan === "FREE") return;
  await prisma.$runCommandRaw({
    delete: collectionFor("clipboard"),
    deletes: [{ q: { id, userId }, limit: 1 }],
  });
  await clearKindCache("clipboard", userId);
}

export async function clearUnpinnedClipboard(
  userId: string,
  plan: PlanTier,
): Promise<void> {
  if (plan === "FREE") return;
  await prisma.$runCommandRaw({
    delete: collectionFor("clipboard"),
    deletes: [{ q: { userId, pinned: false }, limit: 0 }],
  });
  await clearKindCache("clipboard", userId);
}

export async function listSnippets(
  userId: string,
  plan: PlanTier,
  limit: number,
): Promise<SnippetEntry[]> {
  if (plan === "FREE") return [];

  const capped = Math.min(limit, PLAN_LIMITS[plan].snippets);
  const key = cacheKey("snippets", userId, capped);
  const cached = await getCache<SnippetEntry[]>(key);
  if (cached) return cached;

  const result = await prisma.$runCommandRaw({
    find: collectionFor("snippets"),
    filter: { userId },
    sort: { createdAt: -1 },
    limit: capped,
  });

  const entries = parseFirstBatch<SnippetEntry>(result);
  await setCache(key, entries);
  return entries;
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
  const now = new Date().toISOString();
  const doc: SnippetEntry = {
    id: randomUUID(),
    userId,
    title: input.title,
    content: input.content,
    tags: input.tags ?? [],
    masked: Boolean(input.masked),
    sharedWithTeam: Boolean(input.sharedWithTeam),
    createdAt: now,
    updatedAt: now,
  };

  if (plan !== "FREE") {
    await prisma.$runCommandRaw({
      insert: collectionFor("snippets"),
      documents: [doc as unknown as Record<string, unknown>],
    } as never);
    await clearKindCache("snippets", userId);
  }

  return doc;
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
  if (plan === "FREE") return null;

  const patch: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };
  if (typeof updates.title === "string") patch.title = updates.title;
  if (typeof updates.content === "string") patch.content = updates.content;
  if (Array.isArray(updates.tags)) patch.tags = updates.tags;
  if (typeof updates.masked === "boolean") patch.masked = updates.masked;
  if (typeof updates.sharedWithTeam === "boolean") {
    patch.sharedWithTeam = updates.sharedWithTeam;
  }

  await prisma.$runCommandRaw({
    update: collectionFor("snippets"),
    updates: [
      {
        q: { id, userId },
        u: { $set: patch as Record<string, unknown> },
        multi: false,
      },
    ],
  } as never);

  const result = await prisma.$runCommandRaw({
    find: collectionFor("snippets"),
    filter: { id, userId },
    limit: 1,
  });

  await clearKindCache("snippets", userId);
  return parseFirstBatch<SnippetEntry>(result)[0] ?? null;
}

export async function deleteSnippet(
  userId: string,
  plan: PlanTier,
  id: string,
): Promise<void> {
  if (plan === "FREE") return;
  await prisma.$runCommandRaw({
    delete: collectionFor("snippets"),
    deletes: [{ q: { id, userId }, limit: 1 }],
  });
  await clearKindCache("snippets", userId);
}

export async function getTeamMembers(
  userId: string,
  plan: PlanTier,
): Promise<string[]> {
  if (plan !== "TEAM") return [];
  const key = `ws:team:${userId}:members`;
  try {
    const members = await redis.smembers(key);
    return members;
  } catch {
    return [];
  }
}

import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { PLAN_HIERARCHY, type PlanTier } from "@/lib/plans";

export interface SnippetEntry {
  id: string;
  title: string;
  content: string;
  tags: string[];
  masked: boolean;
  createdAt: string;
  updatedAt: string;
}

const QKEY = ["snippets"] as const;
const LOCAL_KEY = "devclip-snippets-v1";

function getPlanLimit(plan: PlanTier): number {
  if (plan === "FREE") return 25;
  if (plan === "STARTER") return 200;
  if (plan === "PRO") return 500;
  return 1000;
}

function readLocalSnippets(): SnippetEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeLocalSnippets(snippets: SnippetEntry[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(snippets));
}

export function useSnippets() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const plan = (user?.plan as PlanTier | undefined) ?? "FREE";
  const isPaid = PLAN_HIERARCHY[plan] >= PLAN_HIERARCHY.STARTER;
  const isTeam = plan === "TEAM";
  const canEdit = isPaid;
  const limit = getPlanLimit(plan);

  const [localSnippets, setLocalSnippets] = useState<SnippetEntry[]>(() =>
    readLocalSnippets(),
  );

  const { data: snippets = [], isLoading } = useQuery({
    queryKey: [...QKEY, plan],
    queryFn: () =>
      isPaid ?
        api
          .get<{ data: SnippetEntry[] }>(`/api/snippets?limit=${limit}`)
          .then((r) => r.data ?? [])
      : Promise.resolve(localSnippets),
    initialData: [],
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: QKEY });

  const createMut = useMutation({
    mutationFn: (body: {
      title: string;
      content: string;
      tags?: string[];
      masked?: boolean;
    }) => api.post<SnippetEntry>("/api/snippets", body),
    onSuccess: invalidate,
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...body }: Partial<SnippetEntry> & { id: string }) =>
      api.put<SnippetEntry>(`/api/snippets/${id}`, body),
    onSuccess: invalidate,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/api/snippets/${id}`),
    onSuccess: invalidate,
  });

  const addSnippet = useCallback(
    (title: string, content: string, tags: string[] = [], masked = false) => {
      if (!isPaid) {
        if (localSnippets.length >= 25) return;
        const entry: SnippetEntry = {
          id: crypto.randomUUID(),
          title,
          content,
          tags,
          masked,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const next = [entry, ...localSnippets].slice(0, 25);
        setLocalSnippets(next);
        writeLocalSnippets(next);
        return;
      }
      createMut.mutate({ title, content, tags, masked });
    },
    [createMut, isPaid, localSnippets],
  );

  const updateSnippet = useCallback(
    (id: string, updates: Partial<SnippetEntry>) => {
      if (!canEdit) return;
      updateMut.mutate({ id, ...updates });
    },
    [canEdit, updateMut],
  );

  const deleteSnippet = useCallback(
    (id: string) => {
      if (!canEdit) return;
      deleteMut.mutate(id);
    },
    [canEdit, deleteMut],
  );

  const allTags = [...new Set(snippets.flatMap((s) => s.tags))];

  return {
    snippets,
    isLoading,
    addSnippet,
    updateSnippet,
    deleteSnippet,
    allTags,
    canEdit,
    plan,
    isPaid,
    isTeam,
    limit,
  };
}

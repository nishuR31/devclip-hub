import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useGuest } from "@/contexts/GuestContext";
import { PLAN_HIERARCHY, type PlanTier } from "@/lib/plans";

export interface ClipboardEntry {
  id: string;
  content: string;
  type: "text" | "code" | "url" | "json";
  pinned: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

const QKEY = ["clipboard"] as const;
const LOCAL_KEY = "devclip-clipboard-v1";

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

function getPlanLimit(plan: PlanTier): number {
  if (plan === "FREE") return 25;
  if (plan === "STARTER") return 100;
  if (plan === "PRO") return 250;
  return 500;
}

function readLocalEntries(): ClipboardEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeLocalEntries(entries: ClipboardEntry[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(entries));
}

export function useClipboard() {
  const qc = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const { guestClipboardAdded, incrementClipboardAdded, openAuthGate } =
    useGuest();
  const plan = (user?.plan as PlanTier | undefined) ?? "FREE";
  const isPaid = PLAN_HIERARCHY[plan] >= PLAN_HIERARCHY.STARTER;
  const isTeam = plan === "TEAM";
  const canEdit = isPaid;
  const limit = getPlanLimit(plan);
  // For guests: the cumulative cookie counter is the authoritative cap
  // so clearing localStorage doesn't reset their quota.
  const guestAtLimit = !isAuthenticated && guestClipboardAdded >= 25;

  const [currentClipboard, setCurrentClipboard] = useState("");
  const [clipboardError, setClipboardError] = useState<string | null>(null);
  const [localEntries, setLocalEntries] = useState<ClipboardEntry[]>(() =>
    readLocalEntries(),
  );

  const { data: fetchedEntries = [], isLoading } = useQuery({
    queryKey: [...QKEY, plan],
    queryFn: () =>
      isPaid ?
        api
          .get<{ data: ClipboardEntry[] }>(`/api/clipboard?limit=${limit}`)
          .then((r) => r.data)
      : Promise.resolve(localEntries),
    initialData: [],
  });

  const entries: ClipboardEntry[] = useMemo(() => {
    const src =
      Array.isArray(fetchedEntries) ? fetchedEntries : (
        ((fetchedEntries as { data?: ClipboardEntry[] })?.data ?? [])
      );
    return [...src].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [fetchedEntries]);

  const invalidate = () => qc.invalidateQueries({ queryKey: QKEY });

  const createMut = useMutation({
    mutationFn: (body: {
      content: string;
      type: ClipboardEntry["type"];
      pinned?: boolean;
      tags?: string[];
    }) => api.post<ClipboardEntry>("/api/clipboard", body),
    onSuccess: invalidate,
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...body }: Partial<ClipboardEntry> & { id: string }) =>
      api.put<ClipboardEntry>(`/api/clipboard/${id}`, body),
    onSuccess: invalidate,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/api/clipboard/${id}`),
    onSuccess: invalidate,
  });

  const clearMut = useMutation({
    mutationFn: () => api.delete("/api/clipboard"),
    onSuccess: invalidate,
  });

  const addToHistory = useCallback(
    (text: string) => {
      setCurrentClipboard(text);
      setClipboardError(null);
      if (!text.trim()) return;

      if (!isPaid) {
        // Guest: check cookie-based counter (survives localStorage clears)
        if (!isAuthenticated && guestAtLimit) {
          openAuthGate("clipboard-limit");
          return;
        }
        // Authenticated FREE user: check current item count
        if (isAuthenticated && localEntries.length >= 25) {
          setClipboardError(
            "Free plan limit reached (25). Upgrade to store more.",
          );
          return;
        }
        // Guest: also block if localStorage is already full
        if (!isAuthenticated && localEntries.length >= 25) {
          openAuthGate("clipboard-limit");
          return;
        }
        const entry: ClipboardEntry = {
          id: crypto.randomUUID(),
          content: text,
          type: detectType(text),
          pinned: false,
          tags: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const next = [entry, ...localEntries].slice(0, 25);
        setLocalEntries(next);
        writeLocalEntries(next);
        // Track cumulative count in cookie for guests
        if (!isAuthenticated) incrementClipboardAdded();
        return;
      }

      if (entries[0]?.content === text) return;
      createMut.mutate({
        content: text,
        type: detectType(text),
        pinned: false,
        tags: [],
      });
    },
    [
      createMut,
      entries,
      isPaid,
      isAuthenticated,
      localEntries,
      guestAtLimit,
      openAuthGate,
      incrementClipboardAdded,
    ],
  );

  const readClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) addToHistory(text);
      return text;
    } catch {
      setClipboardError(
        "Clipboard access denied. Use paste area below or press Ctrl+V / long-press.",
      );
      return null;
    }
  }, [addToHistory]);

  const handlePaste = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (trimmed) addToHistory(trimmed);
    },
    [addToHistory],
  );

  const addEntry = useCallback(
    (content: string, tags: string[] = []) => {
      if (!canEdit) {
        handlePaste(content);
        return;
      }
      createMut.mutate({
        content,
        type: detectType(content),
        pinned: false,
        tags,
      });
    },
    [canEdit, createMut, handlePaste],
  );

  const updateEntry = useCallback(
    (id: string, updates: Partial<ClipboardEntry>) => {
      if (!canEdit) return;
      updateMut.mutate({ id, ...updates });
    },
    [canEdit, updateMut],
  );

  const deleteEntry = useCallback(
    (id: string) => {
      if (!canEdit) return;
      deleteMut.mutate(id);
    },
    [canEdit, deleteMut],
  );

  const togglePin = useCallback(
    (id: string) => {
      if (!canEdit) return;
      const entry = entries.find((e) => e.id === id);
      if (!entry) return;
      updateMut.mutate({ id, pinned: !entry.pinned });
    },
    [canEdit, entries, updateMut],
  );

  const clearHistory = useCallback(() => {
    if (!canEdit) return;
    clearMut.mutate();
  }, [canEdit, clearMut]);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }, []);

  return {
    entries,
    isLoading,
    currentClipboard,
    clipboardError,
    readClipboard,
    handlePaste,
    addEntry,
    deleteEntry,
    updateEntry,
    togglePin,
    copyToClipboard,
    clearHistory,
    canEdit,
    plan,
    isPaid,
    isTeam,
    limit,
  };
}

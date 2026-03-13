import { useCallback, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

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

function detectType(content: string): ClipboardEntry["type"] {
  try { JSON.parse(content); return "json"; } catch {}
  if (/^https?:\/\//i.test(content.trim())) return "url";
  if (/[{}<>();[\]=>]/.test(content) && content.includes("\n")) return "code";
  return "text";
}

export function useClipboard() {
  const qc = useQueryClient();
  const [currentClipboard, setCurrentClipboard] = useState("");
  const [clipboardError, setClipboardError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: QKEY,
    queryFn: () =>
      api
        .get<{ data: ClipboardEntry[]; total: number }>("/api/clipboard?limit=500")
        .then((r) => r.data),
    initialData: [],
  });

  const entries: ClipboardEntry[] = data ?? [];
  const invalidate = () => qc.invalidateQueries({ queryKey: QKEY });

  const createMut = useMutation({
    mutationFn: (body: { content: string; type: string; pinned?: boolean; tags?: string[] }) =>
      api.post<ClipboardEntry>("/api/clipboard", body),
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
      if (entries.length > 0 && entries[0].content === text) return;
      createMut.mutate({ content: text, type: detectType(text), pinned: false, tags: [] });
    },
    [entries, createMut],
  );

  const readClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) addToHistory(text);
      return text;
    } catch {
      setClipboardError(
        "Clipboard access denied. Use the paste area below or press Ctrl+V / long-press to paste.",
      );
      return null;
    }
  }, [addToHistory]);

  const handlePaste = useCallback(
    (text: string) => { if (text.trim()) addToHistory(text.trim()); },
    [addToHistory],
  );

  const addEntry = useCallback(
    (content: string, tags: string[] = []) => {
      createMut.mutate({ content, type: detectType(content), pinned: false, tags });
    },
    [createMut],
  );

  const deleteEntry = useCallback((id: string) => deleteMut.mutate(id), [deleteMut]);

  const updateEntry = useCallback(
    (id: string, updates: Partial<ClipboardEntry>) => updateMut.mutate({ id, ...updates }),
    [updateMut],
  );

  const togglePin = useCallback(
    (id: string) => {
      const entry = entries.find((e) => e.id === id);
      if (entry) updateMut.mutate({ id, pinned: !entry.pinned });
    },
    [entries, updateMut],
  );

  const copyToClipboard = useCallback(async (text: string) => {
    try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
  }, []);

  const clearHistory = useCallback(() => clearMut.mutate(), [clearMut]);

  const sortedEntries = [...entries].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return {
    entries: sortedEntries,
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
  };
}

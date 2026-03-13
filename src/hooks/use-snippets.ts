import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

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

export function useSnippets() {
  const qc = useQueryClient();

  const { data: snippets = [], isLoading } = useQuery({
    queryKey: QKEY,
    queryFn: () => api.get<SnippetEntry[]>("/api/snippets"),
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
      createMut.mutate({ title, content, tags, masked });
    },
    [createMut],
  );

  const updateSnippet = useCallback(
    (id: string, updates: Partial<SnippetEntry>) => updateMut.mutate({ id, ...updates }),
    [updateMut],
  );

  const deleteSnippet = useCallback((id: string) => deleteMut.mutate(id), [deleteMut]);

  const allTags = [...new Set(snippets.flatMap((s) => s.tags))];

  return { snippets, isLoading, addSnippet, updateSnippet, deleteSnippet, allTags };
}

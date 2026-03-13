import { useState } from "react";
import { SnippetEntry } from "@/hooks/use-snippets";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Copy, Trash2, Edit2, Check, X, Tag, Search, EyeOff, Eye, Code2 } from "lucide-react";

interface Props {
  snippets: SnippetEntry[];
  allTags: string[];
  onAdd: (title: string, content: string, tags?: string[], masked?: boolean) => void;
  onUpdate: (id: string, updates: Partial<SnippetEntry>) => void;
  onDelete: (id: string) => void;
  onCopy: (text: string) => Promise<boolean>;
}

export function SnippetPanel({ snippets, allTags, onAdd, onUpdate, onDelete, onCopy }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [masked, setMasked] = useState(false);
  const [search, setSearch] = useState("");
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  const handleAdd = () => {
    if (title.trim() && content.trim()) {
      const tags = tagInput.split(",").map((t) => t.trim().replace(/^#/, "")).filter(Boolean);
      onAdd(title.trim(), content.trim(), tags, masked);
      setTitle(""); setContent(""); setTagInput(""); setMasked(false); setShowAdd(false);
    }
  };

  const handleCopy = async (id: string, text: string) => {
    const ok = await onCopy(text);
    if (ok) { setCopiedId(id); setTimeout(() => setCopiedId(null), 1200); }
  };

  const filtered = snippets.filter((s) => {
    if (filterTag && !s.tags.includes(filterTag)) return false;
    if (search && !s.title.toLowerCase().includes(search.toLowerCase()) && !s.content.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b p-3">
        <Code2 className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Snippets</h2>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{snippets.length}</span>
        <Button size="sm" variant="outline" className="ml-auto h-7 gap-1 text-xs" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />} {showAdd ? "Cancel" : "New"}
        </Button>
      </div>

      {showAdd && (
        <div className="border-b p-3 space-y-2 animate-fade-in">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Snippet title" className="h-8 text-xs" />
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Snippet content…" className="font-mono text-xs min-h-[60px]" />
          <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="Tags (comma separated): api, debug, sql" className="h-8 text-xs" />
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => setMasked(!masked)}>
              {masked ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />} {masked ? "Masked" : "Visible"}
            </Button>
            <Button size="sm" onClick={handleAdd} className="h-7 text-xs">Save Snippet</Button>
          </div>
        </div>
      )}

      <div className="space-y-2 border-b p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search snippets…" className="h-8 pl-8 text-xs" />
        </div>
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setFilterTag(null)}
              className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${!filterTag ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
            >
              all
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${filterTag === tag ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <Code2 className="mb-3 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No snippets yet</p>
          </div>
        ) : (
          filtered.map((s) => (
            <div key={s.id} className="group rounded-lg border bg-card p-3 animate-fade-in">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground">{s.title}</span>
                {s.tags.map((t) => (
                  <Badge key={t} variant="secondary" className="h-4 text-[10px] gap-0.5">
                    <Tag className="h-2 w-2" />{t}
                  </Badge>
                ))}
              </div>
              {editingId === s.id ? (
                <div className="space-y-1">
                  <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="font-mono text-xs min-h-[40px]" />
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { onUpdate(s.id, { content: editContent }); setEditingId(null); }}><Check className="h-3 w-3" /></Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingId(null)}><X className="h-3 w-3" /></Button>
                  </div>
                </div>
              ) : (
                <pre className="whitespace-pre-wrap break-all font-mono text-xs text-foreground/70 leading-relaxed">
                  {s.masked && !revealedIds.has(s.id) ? "••••••••••••" : (s.content.length > 150 ? s.content.slice(0, 150) + "…" : s.content)}
                </pre>
              )}
              <div className="mt-1.5 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleCopy(s.id, s.content)}>
                  {copiedId === s.id ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                </Button>
                {s.masked && (
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setRevealedIds((prev) => { const n = new Set(prev); n.has(s.id) ? n.delete(s.id) : n.add(s.id); return n; })}>
                    {revealedIds.has(s.id) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </Button>
                )}
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setEditContent(s.content); setEditingId(s.id); }}>
                  <Edit2 className="h-3 w-3" />
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => onDelete(s.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

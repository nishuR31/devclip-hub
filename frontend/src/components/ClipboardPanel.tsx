import { useState, useMemo } from "react";
import { ClipboardEntry } from "@/hooks/use-clipboard";
import { ClipboardItem } from "./ClipboardItem";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  Plus,
  ClipboardPaste,
  Trash2,
  X,
  AlertCircle,
} from "lucide-react";

interface Props {
  entries: ClipboardEntry[];
  clipboardError?: string | null;
  onReadClipboard: () => Promise<string | null>;
  onPaste?: (text: string) => void;
  onAddEntry?: (content: string, tags?: string[]) => void;
  onDelete?: (id: string) => void;
  onUpdate?: (id: string, updates: Partial<ClipboardEntry>) => void;
  onTogglePin?: (id: string) => void;
  onCopy: (text: string) => Promise<boolean>;
  onClearHistory?: () => void;
  canEdit?: boolean;
  plan?: string;
  isTeam?: boolean;
}

export function ClipboardPanel({
  entries,
  clipboardError,
  onReadClipboard,
  onPaste,
  onAddEntry,
  onDelete,
  onUpdate,
  onTogglePin,
  onCopy,
  onClearHistory,
  canEdit = false,
  plan = "FREE",
  isTeam = false,
}: Props) {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [filter, setFilter] = useState<"all" | ClipboardEntry["type"]>("all");

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (filter !== "all" && e.type !== filter) return false;
      if (search && !e.content.toLowerCase().includes(search.toLowerCase()))
        return false;
      return true;
    });
  }, [entries, search, filter]);

  const handleAdd = () => {
    if (newContent.trim() && onAddEntry) {
      onAddEntry(newContent.trim());
      setNewContent("");
      setShowAdd(false);
    }
  };

  const handlePasteEvent = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData("text");
    if (text && onPaste) {
      onPaste(text);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b p-3">
        <h2 className="text-sm font-semibold text-foreground">Clipboard</h2>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {entries.length}
        </span>
        <div className="ml-auto flex gap-1">
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-xs"
            onClick={onReadClipboard}
          >
            <ClipboardPaste className="h-3.5 w-3.5" /> Capture
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-xs"
            onClick={() => setShowAdd(!showAdd)}
            disabled={!canEdit}
          >
            {showAdd ?
              <X className="h-3.5 w-3.5" />
            : <Plus className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* Clipboard error / paste fallback */}
      {clipboardError && (
        <div className="border-b p-3 animate-fade-in">
          <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 mb-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-3.5 w-3.5 text-warning mt-0.5 shrink-0" />
              <p className="text-xs text-warning">{clipboardError}</p>
            </div>
          </div>
          <Textarea
            placeholder="Tap here and paste (Ctrl+V or long-press → Paste)…"
            className="font-mono text-xs min-h-[50px]"
            onPaste={handlePasteEvent}
            disabled={!canEdit}
          />
        </div>
      )}

      {/* Add form */}
      {showAdd && canEdit && (
        <div className="border-b p-3 animate-fade-in">
          <Textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Paste or type content…"
            className="mb-2 font-mono text-xs min-h-[60px]"
            onPaste={handlePasteEvent}
          />
          <Button size="sm" onClick={handleAdd} className="h-7 text-xs">
            Add Entry
          </Button>
        </div>
      )}

      {/* Search & filters */}
      <div className="space-y-2 border-b p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clipboard…"
            className="h-8 pl-8 text-xs"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {(["all", "text", "code", "url", "json"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
                filter === t ?
                  "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filtered.length === 0 ?
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ClipboardPaste className="mb-3 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No clipboard entries
            </p>
            <p className="text-xs text-muted-foreground/60">
              Click Capture or paste content here
            </p>
          </div>
        : filtered.map((entry) => (
            <ClipboardItem
              key={entry.id}
              entry={entry}
              onCopy={onCopy}
              onDelete={canEdit ? onDelete : undefined}
              onTogglePin={canEdit ? onTogglePin : undefined}
              onUpdate={canEdit ? onUpdate : undefined}
              canEdit={canEdit}
              plan={plan}
              isTeam={isTeam}
            />
          ))
        }
      </div>

      {/* Footer */}
      {entries.length > 0 && canEdit && (
        <div className="border-t p-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
            onClick={onClearHistory}
          >
            <Trash2 className="h-3 w-3" /> Clear unpinned
          </Button>
        </div>
      )}
    </div>
  );
}

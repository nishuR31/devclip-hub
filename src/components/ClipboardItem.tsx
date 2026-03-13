import { memo, useState } from "react";
import { ClipboardEntry } from "@/hooks/use-clipboard";
import { Pin, PinOff, Copy, Trash2, Edit2, Check, X, Globe, Code2, FileJson, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  entry: ClipboardEntry;
  onCopy: (text: string) => Promise<boolean>;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
  onUpdate: (id: string, updates: Partial<ClipboardEntry>) => void;
}

const typeIcons = {
  text: FileText,
  code: Code2,
  url: Globe,
  json: FileJson,
};

const typeColors: Record<string, string> = {
  text: "bg-muted text-muted-foreground",
  code: "bg-primary/10 text-primary",
  url: "bg-success/10 text-success",
  json: "bg-warning/10 text-warning",
};

export const ClipboardItem = memo(function ClipboardItem({ entry, onCopy, onDelete, onTogglePin, onUpdate }: Props) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(entry.content);
  const [copied, setCopied] = useState(false);

  const Icon = typeIcons[entry.type];

  const handleCopy = async () => {
    const ok = await onCopy(entry.content);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
  };

  const handleSave = () => {
    onUpdate(entry.id, { content: editValue });
    setEditing(false);
  };

  const preview = entry.content.length > 200 ? entry.content.slice(0, 200) + "…" : entry.content;
  const timeAgo = getTimeAgo(new Date(entry.createdAt).getTime());

  return (
    <div className="group relative rounded-lg border bg-card p-3 transition-all hover:border-primary/30 hover:shadow-sm animate-fade-in">
      <div className="mb-2 flex items-center gap-2">
        <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium ${typeColors[entry.type]}`}>
          <Icon className="h-3 w-3" />
          {entry.type}
        </span>
        {entry.pinned && (
          <Badge variant="secondary" className="h-5 gap-1 bg-primary/10 text-primary text-xs">
            <Pin className="h-2.5 w-2.5" /> Pinned
          </Badge>
        )}
        <span className="ml-auto text-xs text-muted-foreground">{timeAgo}</span>
      </div>

      {editing ? (
        <div className="space-y-2">
          <Textarea value={editValue} onChange={(e) => setEditValue(e.target.value)} className="font-mono text-xs min-h-[60px]" />
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={handleSave}><Check className="h-3.5 w-3.5" /></Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}><X className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      ) : (
        <pre className="whitespace-pre-wrap break-all font-mono text-xs leading-relaxed text-foreground/80">
          {preview}
        </pre>
      )}

      <div className="mt-2 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleCopy} title="Copy">
          {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditValue(entry.content); setEditing(true); }} title="Edit">
          <Edit2 className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onTogglePin(entry.id)} title={entry.pinned ? "Unpin" : "Pin"}>
          {entry.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(entry.id)} title="Delete">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
});

function getTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

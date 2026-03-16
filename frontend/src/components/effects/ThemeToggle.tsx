import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const CYCLE: Array<"light" | "dark" | "system"> = ["light", "dark", "system"];

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();

  const current = (theme as "light" | "dark" | "system") ?? "system";

  const cycleTheme = () => {
    const idx = CYCLE.indexOf(current);
    setTheme(CYCLE[(idx + 1) % CYCLE.length]);
  };

  const Icon =
    current === "light" ? Sun
    : current === "dark" ? Moon
    : Monitor;

  const label =
    current === "light" ? "Light theme"
    : current === "dark" ? "Dark theme"
    : "System theme";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size={compact ? "icon" : "sm"}
          onClick={cycleTheme}
          className="relative transition-all hover:bg-primary/10 hover:text-primary"
          aria-label={`Switch theme (currently ${current})`}
        >
          <Icon className={compact ? "h-4 w-4" : "h-4 w-4 mr-1.5"} />
          {!compact && (
            <span className="hidden sm:inline text-xs">{label}</span>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p className="text-xs">{label} — click to cycle</p>
      </TooltipContent>
    </Tooltip>
  );
}

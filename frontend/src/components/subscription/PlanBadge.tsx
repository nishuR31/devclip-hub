import { type PlanTier } from "@/lib/plans";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const PLAN_COLORS: Record<PlanTier, string> = {
  FREE: "bg-secondary text-secondary-foreground",
  STARTER: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  PRO: "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300",
  TEAM: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
};

interface PlanBadgeProps {
  plan: PlanTier;
  className?: string;
}

export function PlanBadge({ plan, className }: PlanBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-0 font-semibold uppercase tracking-wide text-[10px]",
        PLAN_COLORS[plan],
        className,
      )}
    >
      {plan}
    </Badge>
  );
}

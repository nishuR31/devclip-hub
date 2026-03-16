import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type PlanTier } from "@/lib/plans";

interface UpgradePromptProps {
  requiredPlan: PlanTier;
  message?: string;
  compact?: boolean;
}

const PLAN_LABELS: Record<PlanTier, string> = {
  FREE: "Free",
  STARTER: "Starter",
  PRO: "Pro",
  TEAM: "Team",
};

export function UpgradePrompt({
  requiredPlan,
  message,
  compact = false,
}: UpgradePromptProps) {
  const navigate = useNavigate();
  const planLabel = PLAN_LABELS[requiredPlan];
  const defaultMessage = `This feature requires the ${planLabel} plan or higher.`;

  if (compact) {
    return (
      <button
        onClick={() => navigate("/pricing")}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Lock className="h-3 w-3" />
        <span>Upgrade to {planLabel}</span>
      </button>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
      <Lock className="h-8 w-8 opacity-40" />
      <p>{message ?? defaultMessage}</p>
      <Button size="sm" onClick={() => navigate("/pricing")}>
        View plans
      </Button>
    </div>
  );
}

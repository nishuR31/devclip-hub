import React from "react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { type PlanTier } from "@/lib/plans";
import { UpgradePrompt } from "./UpgradePrompt";

interface FeatureGateProps {
  /** Minimum plan required to see the children */
  requires: PlanTier;
  /**
   * Custom fallback shown when the user lacks the plan.
   * Defaults to <UpgradePrompt requiredPlan={requires} />.
   */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Renders children only when the authenticated user's plan meets `requires`.
 * Otherwise renders the fallback (or a built-in UpgradePrompt).
 */
export function FeatureGate({
  requires,
  fallback,
  children,
}: FeatureGateProps) {
  const { can, isLoading } = useSubscription();

  if (isLoading) return null;

  if (!can(requires)) {
    return <>{fallback ?? <UpgradePrompt requiredPlan={requires} />}</>;
  }

  return <>{children}</>;
}

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { api } from "@/lib/api";
import { useAuth } from "./AuthContext";
import { type PlanTier, PLAN_HIERARCHY, planAtLeast } from "@/lib/plans";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SubscriptionInfo {
  plan: PlanTier;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  billingInterval: "MONTHLY" | "YEARLY" | null;
}

interface SubscriptionContextValue {
  subscription: SubscriptionInfo | null;
  plan: PlanTier;
  isLoading: boolean;
  /** Returns true if user's plan is at or above the required tier */
  can: (requiredPlan: PlanTier) => boolean;
  /** Clipboard item limit (-1 = unlimited) */
  clipboardLimit: number;
  /** Snippet item limit (-1 = unlimited) */
  snippetLimit: number;
  refetch: () => Promise<void>;
}

// ── Limits by plan ─────────────────────────────────────────────────────────────

const CLIPBOARD_LIMITS: Record<PlanTier, number> = {
  FREE: 50,
  STARTER: 500,
  PRO: 2000,
  TEAM: -1,
};

const SNIPPET_LIMITS: Record<PlanTier, number> = {
  FREE: 10,
  STARTER: -1,
  PRO: -1,
  TEAM: -1,
};

// ── Context ────────────────────────────────────────────────────────────────────

const SubscriptionContext = createContext<SubscriptionContextValue | null>(
  null,
);

// ── Provider ───────────────────────────────────────────────────────────────────

export function SubscriptionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);

  const fetchSubscription = useCallback(async () => {
    if (!isAuthenticated) {
      setSubscription(null);
      return;
    }
    setIsLoading(true);
    try {
      const data = await api.get<SubscriptionInfo>("/api/subscriptions/me");
      setSubscription(data);
    } catch {
      setSubscription(null);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!authLoading) {
      fetchSubscription();
    }
  }, [authLoading, fetchSubscription]);

  const plan: PlanTier = (subscription?.plan as PlanTier) ?? "FREE";

  const can = useCallback(
    (requiredPlan: PlanTier) => planAtLeast(plan, requiredPlan),
    [plan],
  );

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        plan,
        isLoading,
        can,
        clipboardLimit: CLIPBOARD_LIMITS[plan],
        snippetLimit: SNIPPET_LIMITS[plan],
        refetch: fetchSubscription,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useSubscription(): SubscriptionContextValue {
  const ctx = useContext(SubscriptionContext);
  if (!ctx)
    throw new Error(
      "useSubscription must be used inside <SubscriptionProvider>",
    );
  return ctx;
}

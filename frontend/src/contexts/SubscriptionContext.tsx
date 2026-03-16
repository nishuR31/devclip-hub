import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { api } from "@/lib/api";
import { useAuth } from "./AuthContext";
import { type PlanTier, planAtLeast } from "@/lib/plans";

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
  can: (requiredPlan: PlanTier) => boolean;
  clipboardLimit: number;
  snippetLimit: number;
  refetch: () => Promise<void>;
}

const CLIPBOARD_LIMITS: Record<PlanTier, number> = {
  FREE: 25,
  STARTER: 100,
  PRO: 250,
  TEAM: 500,
};

const SNIPPET_LIMITS: Record<PlanTier, number> = {
  FREE: 25,
  STARTER: 200,
  PRO: 500,
  TEAM: 1000,
};

const SubscriptionContext = createContext<SubscriptionContextValue | null>(
  null,
);

export function SubscriptionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
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

  const plan: PlanTier =
    (subscription?.plan as PlanTier | undefined) ??
    (user?.plan as PlanTier | undefined) ??
    "FREE";

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

export function useSubscription(): SubscriptionContextValue {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    throw new Error(
      "useSubscription must be used inside <SubscriptionProvider>",
    );
  }
  return ctx;
}

import { api } from "@/lib/api";
import type { PlanTier } from "@/lib/plans";

export interface PublicPlan {
  id: PlanTier;
  name: string;
  monthlyINR: number;
  yearlyINR: number;
  features: string[];
  limits?: {
    clipboard: number;
    snippets: number;
  };
  rzpPlanIds?: {
    monthly: string;
    yearly: string;
  };
}

export async function fetchPublicPlans(): Promise<PublicPlan[]> {
  const res = await api.get<{ data: PublicPlan[] }>(
    "/api/subscriptions/plans",
    {
      skipAuth: true,
    },
  );
  return res.data ?? [];
}

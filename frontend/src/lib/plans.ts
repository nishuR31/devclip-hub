export type PlanTier = "FREE" | "STARTER" | "PRO" | "TEAM";

export const PLAN_HIERARCHY: Record<PlanTier, number> = {
  FREE: 0,
  STARTER: 1,
  PRO: 2,
  TEAM: 3,
};

export function planAtLeast(userPlan: PlanTier, required: PlanTier): boolean {
  return PLAN_HIERARCHY[userPlan] >= PLAN_HIERARCHY[required];
}

export interface PlanInfo {
  id: PlanTier;
  name: string;
  monthlyINR: number;
  yearlyINR: number;
  clipboardLimit: number; // -1 = unlimited
  snippetLimit: number; // -1 = unlimited
  features: string[];
  highlighted?: boolean;
}

export const PLANS: PlanInfo[] = [
  {
    id: "FREE",
    name: "Free",
    monthlyINR: 0,
    yearlyINR: 0,
    clipboardLimit: 25,
    snippetLimit: 25,
    features: [
      "25 clipboard items",
      "25 snippets",
      "Local storage",
      "Preview mode for saved snippets",
      "Device Inspector tab",
    ],
  },
  {
    id: "STARTER",
    name: "Starter",
    monthlyINR: 29900,
    yearlyINR: 249900,
    clipboardLimit: 100,
    snippetLimit: 200,
    highlighted: true,
    features: [
      "100 clipboard items",
      "200 snippets",
      "Export JSON / CSV / TXT",
      "All Inspector tabs (IDB, Cache, Workers)",
      "Cloud sync",
    ],
  },
  {
    id: "PRO",
    name: "Pro",
    monthlyINR: 59900,
    yearlyINR: 499900,
    clipboardLimit: 250,
    snippetLimit: 500,
    features: [
      "250 clipboard items",
      "500 snippets",
      "Export (all formats)",
      "All Inspector tabs",
      "Cloud sync",
      "Two-factor authentication",
      "API access",
    ],
  },
  {
    id: "TEAM",
    name: "Team",
    monthlyINR: 149900,
    yearlyINR: 1199900,
    clipboardLimit: 500,
    snippetLimit: 1000,
    features: [
      "500 clipboard items",
      "1,000 snippets",
      "Export (all formats)",
      "All Inspector tabs",
      "Cloud sync",
      "Two-factor authentication",
      "API access",
      "Team members",
      "Shared snippets",
      "Tag edit & manage",
    ],
  },
];

/** Format paise → INR string, e.g. 29900 → "₹299" */
export function formatINR(paise: number): string {
  if (paise === 0) return "Free";
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

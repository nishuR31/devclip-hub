import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PLANS, type PlanTier } from "@/lib/plans";
import { fetchPublicPlans, type PublicPlan } from "@/lib/publicPlans";
import {
  convertFromINR,
  type SupportedCurrency,
  CURRENCY_SYMBOLS,
} from "@/lib/currency";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { api, ApiError } from "@/lib/api";
import { toast } from "sonner";

// ── Razorpay globals ──────────────────────────────────────────────────────────
declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open(): void;
      on(event: string, handler: (response: unknown) => void): void;
    };
  }
}

const CURRENCIES: SupportedCurrency[] = ["INR", "USD", "EUR", "GBP"];

export default function Pricing() {
  const { isAuthenticated, user } = useAuth();
  const { plan: currentPlan, refetch: refetchSubscription } = useSubscription();
  const navigate = useNavigate();
  const location = useLocation();

  const [yearly, setYearly] = useState(false);
  const [currency, setCurrency] = useState<SupportedCurrency>("INR");
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [apiPlans, setApiPlans] = useState<Record<string, PublicPlan>>({});

  // Fetch Razorpay plan IDs from the backend
  useEffect(() => {
    fetchPublicPlans()
      .then((plans) => {
        const map: Record<string, PublicPlan> = {};
        for (const p of plans) map[p.id] = p;
        setApiPlans(map);
      })
      .catch(() => {
        // Non-fatal — paid upgrade will fail gracefully
      });
  }, []);

  // Convert prices to selected currency
  useEffect(() => {
    (async () => {
      const updated: Record<string, string> = {};
      for (const p of PLANS) {
        const serverPlan = apiPlans[p.id];
        const paise =
          yearly ?
            (serverPlan?.yearlyINR ?? p.yearlyINR)
          : (serverPlan?.monthlyINR ?? p.monthlyINR);
        updated[p.id] = await convertFromINR(paise, currency);
      }
      setPrices(updated);
    })();
  }, [apiPlans, currency, yearly]);

  const requireLogin = () => {
    navigate("/auth/login", { state: { from: location } });
  };

  const handleUpgrade = async (planId: PlanTier) => {
    if (!isAuthenticated) {
      requireLogin();
      return;
    }

    const apiPlan = apiPlans[planId];
    const rzpPlanId =
      yearly ? apiPlan?.rzpPlanIds?.yearly : apiPlan?.rzpPlanIds?.monthly;

    if (!rzpPlanId) {
      toast.error("Plan not available. Please try again later.");
      return;
    }

    setLoadingPlan(planId);
    try {
      const { subscriptionId, keyId } = await api.post<{
        subscriptionId: string;
        keyId: string;
      }>("/api/payments/checkout", { planId: rzpPlanId });

      const rzp = new window.Razorpay({
        key: keyId,
        subscription_id: subscriptionId,
        name: "DevClipboard Hub",
        description: `${planId} plan — ${yearly ? "yearly" : "monthly"}`,
        prefill: { email: user?.email ?? "" },
        theme: { color: "#6366f1" },
        handler: async (response: unknown) => {
          const {
            razorpay_payment_id,
            razorpay_subscription_id,
            razorpay_signature,
          } = response as {
            razorpay_payment_id: string;
            razorpay_subscription_id: string;
            razorpay_signature: string;
          };
          try {
            await api.post("/api/payments/verify", {
              razorpay_payment_id,
              razorpay_subscription_id,
              razorpay_signature,
            });
            toast.success("Subscription activated!");
            await refetchSubscription();
            navigate("/account/billing");
          } catch (err) {
            toast.error(
              err instanceof ApiError ?
                err.message
              : "Payment verification failed. Contact support.",
            );
          }
        },
        modal: {
          ondismiss: () => setLoadingPlan(null),
        },
      });

      rzp.open();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Checkout failed");
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-16 space-y-10">
        {/* Title */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold tracking-tight">Simple pricing</h1>
          <p className="text-muted-foreground text-lg">
            Start free. Upgrade when you need more.
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-center gap-6">
          <div className="flex items-center gap-2">
            <Label htmlFor="billing">Monthly</Label>
            <Switch id="billing" checked={yearly} onCheckedChange={setYearly} />
            <Label htmlFor="billing">Yearly</Label>
            {yearly && (
              <Badge variant="secondary" className="text-green-600">
                Save ~17%
              </Badge>
            )}
          </div>

          <Select
            value={currency}
            onValueChange={(v) => setCurrency(v as SupportedCurrency)}
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {CURRENCY_SYMBOLS[c]} {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Plan cards */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((p) => {
            const isCurrent = isAuthenticated && currentPlan === p.id;
            const serverPlan = apiPlans[p.id];
            const billingPaise =
              yearly ?
                (serverPlan?.yearlyINR ?? p.yearlyINR)
              : (serverPlan?.monthlyINR ?? p.monthlyINR);
            const priceStr =
              prices[p.id] ?? (billingPaise === 0 ? "Free" : "...");

            return (
              <Card
                key={p.id}
                className={
                  p.highlighted ? "border-primary shadow-lg relative" : ""
                }
              >
                {p.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-3">
                      Most popular
                    </Badge>
                  </div>
                )}

                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{p.name}</CardTitle>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">{priceStr}</span>
                    {billingPaise > 0 && (
                      <span className="text-muted-foreground text-sm">
                        /{yearly ? "yr" : "mo"}
                      </span>
                    )}
                  </div>
                  <CardDescription>
                    {p.id === "FREE" && "Always free"}
                    {p.id === "STARTER" && "For individuals"}
                    {p.id === "PRO" && "For power users"}
                    {p.id === "TEAM" && "For teams"}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-2">
                  {p.features.map((f) => (
                    <div key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </CardContent>

                <CardFooter>
                  {p.id === "FREE" ?
                    <Button
                      className="w-full"
                      variant={isCurrent ? "outline" : "default"}
                      disabled={isCurrent}
                      onClick={() => !isAuthenticated && requireLogin()}
                    >
                      {isCurrent ?
                        "Current plan"
                      : isAuthenticated ?
                        "Get started free"
                      : "Login to start"}
                    </Button>
                  : <Button
                      className="w-full"
                      variant={
                        isCurrent ? "outline"
                        : p.highlighted ?
                          "default"
                        : "secondary"
                      }
                      disabled={isCurrent || loadingPlan === p.id}
                      onClick={() => handleUpgrade(p.id as PlanTier)}
                    >
                      {loadingPlan === p.id ?
                        "Opening checkout..."
                      : isCurrent ?
                        "Current plan"
                      : "Upgrade"}
                    </Button>
                  }
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Prices shown in {currency}. All paid plans include a 7-day free trial.
          Cancel anytime.
        </p>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import { PLANS, formatINR, type PlanTier } from "@/lib/plans";
import {
  convertFromINR,
  type SupportedCurrency,
  CURRENCY_SYMBOLS,
} from "@/lib/currency";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { api, ApiError } from "@/lib/api";
import { toast } from "sonner";

const CURRENCIES: SupportedCurrency[] = ["INR", "USD", "EUR", "GBP"];

export default function Pricing() {
  const { isAuthenticated } = useAuth();
  const { plan: currentPlan } = useSubscription();
  const navigate = useNavigate();

  const [yearly, setYearly] = useState(false);
  const [currency, setCurrency] = useState<SupportedCurrency>("INR");
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const updated: Record<string, string> = {};
      for (const p of PLANS) {
        const paise = yearly ? p.yearlyINR : p.monthlyINR;
        updated[p.id] = await convertFromINR(paise, currency);
      }
      setPrices(updated);
    })();
  }, [currency, yearly]);

  const handleUpgrade = async (planId: PlanTier, priceId: string) => {
    if (!isAuthenticated) {
      navigate("/auth/register");
      return;
    }
    setLoadingPlan(planId);
    try {
      const { url } = await api.post<{ url: string }>(
        "/api/payments/checkout",
        {
          priceId,
        },
      );
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Checkout failed");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <Link to="/" className="font-semibold text-lg">
          DevClipboard Hub
        </Link>
        {isAuthenticated ?
          <Link to="/">
            <Button variant="outline" size="sm">
              Back to app
            </Button>
          </Link>
        : <div className="flex gap-2">
            <Link to="/auth/login">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link to="/auth/register">
              <Button size="sm">Get started</Button>
            </Link>
          </div>
        }
      </div>

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
            const priceStr =
              prices[p.id] ?? (p.monthlyINR === 0 ? "Free" : "...");

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
                    {p.monthlyINR > 0 && (
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
                      onClick={() =>
                        !isAuthenticated && navigate("/auth/register")
                      }
                    >
                      {isCurrent ? "Current plan" : "Get started free"}
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
                      onClick={() => {
                        // In a real app, pick monthly vs yearly price ID from config
                        // Using placeholder — replace with actual Stripe price IDs from env
                        const priceId = `price_${p.id.toLowerCase()}_${yearly ? "yearly" : "monthly"}`;
                        handleUpgrade(p.id as PlanTier, priceId);
                      }}
                    >
                      {loadingPlan === p.id ?
                        "Redirecting..."
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

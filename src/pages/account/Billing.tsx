import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { PlanBadge } from "@/components/subscription/PlanBadge";
import { type PlanTier, PLANS } from "@/lib/plans";
import { api, ApiError } from "@/lib/api";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function BillingPage() {
  const { subscription, plan, refetch } = useSubscription();
  const [cancelLoading, setCancelLoading] = useState(false);
  const [reactivateLoading, setReactivateLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const currentPlanInfo = PLANS.find((p) => p.id === plan);

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const { url } = await api.post<{ url: string }>("/api/payments/portal");
      window.location.href = url;
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to open billing portal",
      );
    } finally {
      setPortalLoading(false);
    }
  };

  const cancelSubscription = async () => {
    setCancelLoading(true);
    try {
      await api.post("/api/subscriptions/cancel");
      toast.success("Subscription will cancel at end of billing period");
      refetch();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to cancel");
    } finally {
      setCancelLoading(false);
    }
  };

  const reactivate = async () => {
    setReactivateLoading(true);
    try {
      await api.post("/api/subscriptions/reactivate");
      toast.success("Subscription reactivated!");
      refetch();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to reactivate",
      );
    } finally {
      setReactivateLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <Link to="/" className="font-semibold text-lg">
          DevClipboard Hub
        </Link>
        <Link to="/account">
          <Button variant="ghost" size="sm">
            Account
          </Button>
        </Link>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Billing & Subscription</h1>
          <p className="text-muted-foreground text-sm">Manage your plan</p>
        </div>

        {/* Current plan */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Current plan</CardTitle>
                <CardDescription>
                  {currentPlanInfo?.features[0]}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <PlanBadge plan={plan as PlanTier} />
                {subscription?.cancelAtPeriodEnd && (
                  <Badge variant="destructive" className="text-xs">
                    Cancels soon
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>

          {subscription && plan !== "FREE" && (
            <CardContent className="space-y-3">
              <Separator />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-medium capitalize">
                    {subscription.status.toLowerCase()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Billing</p>
                  <p className="font-medium capitalize">
                    {subscription.billingInterval?.toLowerCase() ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">
                    {subscription.cancelAtPeriodEnd ?
                      "Cancels on"
                    : "Next renewal"}
                  </p>
                  <p className="font-medium">
                    {formatDate(subscription.currentPeriodEnd)}
                  </p>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Actions */}
        <Card>
          <CardContent className="pt-6 space-y-3">
            {plan === "FREE" ?
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  You're on the Free plan. Upgrade to unlock more features.
                </p>
                <Link to="/pricing">
                  <Button className="w-full">View plans</Button>
                </Link>
              </div>
            : <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={openPortal}
                  disabled={portalLoading}
                >
                  {portalLoading ?
                    "Opening..."
                  : "Manage billing (Stripe portal)"}
                </Button>

                {subscription?.cancelAtPeriodEnd ?
                  <Button
                    variant="default"
                    className="w-full"
                    onClick={reactivate}
                    disabled={reactivateLoading}
                  >
                    {reactivateLoading ?
                      "Reactivating..."
                    : "Reactivate subscription"}
                  </Button>
                : <Button
                    variant="ghost"
                    className="w-full text-destructive hover:text-destructive"
                    onClick={cancelSubscription}
                    disabled={cancelLoading}
                  >
                    {cancelLoading ? "Cancelling..." : "Cancel subscription"}
                  </Button>
                }

                <Link to="/pricing">
                  <Button variant="ghost" className="w-full">
                    Change plan
                  </Button>
                </Link>
              </div>
            }
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { Link } from "react-router-dom";
import { User, CreditCard, Shield, ChevronRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { PlanBadge } from "@/components/subscription/PlanBadge";
import { type PlanTier } from "@/lib/plans";

export default function AccountPage() {
  const { user, logout } = useAuth();
  const { plan } = useSubscription();

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <Link to="/" className="font-semibold text-lg">
          DevClipboard Hub
        </Link>
        <Button variant="ghost" size="sm" onClick={logout}>
          Sign out
        </Button>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Account</h1>
          <p className="text-muted-foreground text-sm">Manage your profile and subscription</p>
        </div>

        {/* Profile card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                {user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase()}
              </div>
              <div>
                <CardTitle className="text-base">{user?.name ?? "—"}</CardTitle>
                <CardDescription>{user?.email}</CardDescription>
              </div>
              <div className="ml-auto">
                <PlanBadge plan={plan as PlanTier} />
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Navigation links */}
        <Card>
          <CardContent className="p-0">
            <Link to="/account/billing" className="flex items-center gap-3 px-4 py-4 hover:bg-accent transition-colors rounded-t-lg">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Billing & Subscription</p>
                <p className="text-xs text-muted-foreground">Manage your plan and payment</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Separator />
            <Link to="/account/security" className="flex items-center gap-3 px-4 py-4 hover:bg-accent transition-colors rounded-b-lg">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Security</p>
                <p className="text-xs text-muted-foreground">Password and two-factor authentication</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <Link to="/">
            <Button variant="outline" size="sm">Back to app</Button>
          </Link>
          <Button variant="destructive" size="sm" onClick={logout}>
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}

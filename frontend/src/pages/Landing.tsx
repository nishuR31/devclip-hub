import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Clipboard,
  Code2,
  Database,
  Globe,
  Lock,
  RefreshCw,
  Search,
  Share2,
  Sparkles,
  Tag,
  Zap,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PLANS, formatINR } from "@/lib/plans";
import { fetchPublicPlans, type PublicPlan } from "@/lib/publicPlans";

// ── Feature data ──────────────────────────────────────────────────────────────

const coreFeatures = [
  {
    icon: Clipboard,
    title: "Clipboard history",
    description:
      "Every copy you make is captured and stored. Search, pin, and re-paste anything — no more losing that snippet you copied 10 minutes ago.",
    bullets: [
      "Unlimited entries on paid plans",
      "Pin important items to the top",
      "Search across full clipboard text",
      "One-click re-copy to clipboard",
    ],
  },
  {
    icon: Code2,
    title: "Snippet library",
    description:
      "Save and organise reusable code fragments, commands, and text blocks. Tag them, search them, and paste them without ever leaving the app.",
    bullets: [
      "Custom tags for fast filtering",
      "Syntax-aware code display",
      "Unlimited snippets on paid plans",
      "Export as JSON, CSV, or plain text",
    ],
  },
  {
    icon: Database,
    title: "Browser data inspector",
    description:
      "A built-in DevTools overlay for localStorage, sessionStorage, cookies, IndexedDB, Cache API, and Service Workers — all in one panel.",
    bullets: [
      "Read, write, and delete storage keys",
      "Export any storage dataset",
      "Cookie manager with flags visible",
      "Live refresh on every inspection",
    ],
  },
];

const secondaryFeatures = [
  {
    icon: Globe,
    title: "Cloud sync",
    description:
      "Your clipboard history and snippets follow you across every browser session, synced to your account in real time.",
  },
  {
    icon: Search,
    title: "Full-text search",
    description:
      "Instantly find anything in your clipboard history or snippet library. No folders, no manual filing.",
  },
  {
    icon: Tag,
    title: "Tag & organise",
    description:
      "Label snippets with custom tags and filter with a single click. Keeps hundreds of snippets instantly navigable.",
  },
  {
    icon: Share2,
    title: "Shared snippets (Team)",
    description:
      "Publish snippets to your whole team. Everyone stays on the same boilerplates, commands, and configs.",
  },
  {
    icon: RefreshCw,
    title: "Live storage refresh",
    description:
      "Browser inspector updates on demand. See real-time storage state while testing your own apps.",
  },
  {
    icon: Lock,
    title: "Two-factor auth",
    description:
      "Add TOTP-based 2FA to your account for an extra layer of protection. Backup codes included.",
  },
  {
    icon: Zap,
    title: "Keyboard-first UX",
    description:
      "Collapsible panels, tab navigation, and one-key copy actions keep your hands on the keyboard.",
  },
  {
    icon: Globe,
    title: "API access",
    description:
      "Programmatically read and write your snippets via REST API. Integrate into your own scripts and CI pipelines.",
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const [publicPlans, setPublicPlans] = useState<Record<string, PublicPlan>>(
    {},
  );

  useEffect(() => {
    fetchPublicPlans()
      .then((plans) => {
        const map: Record<string, PublicPlan> = {};
        for (const plan of plans) map[plan.id] = plan;
        setPublicPlans(map);
      })
      .catch(() => {
        // Keep fallback pricing from static metadata if API is unavailable.
      });
  }, []);

  const planHighlights = useMemo(
    () =>
      PLANS.map((plan) => {
        const serverPlan = publicPlans[plan.id];
        const clipboardLimit =
          serverPlan?.limits?.clipboard ?? plan.clipboardLimit;
        const snippetLimit = serverPlan?.limits?.snippets ?? plan.snippetLimit;
        const monthlyINR = serverPlan?.monthlyINR ?? plan.monthlyINR;

        const clipboard =
          clipboardLimit === -1 ? "Unlimited" : (
            `${clipboardLimit.toLocaleString("en-IN")}`
          );
        const snippets =
          snippetLimit === -1 ? "unlimited" : (
            `${snippetLimit.toLocaleString("en-IN")}`
          );

        return {
          tier: plan.name,
          price: monthlyINR === 0 ? "₹0" : `${formatINR(monthlyINR)} /mo`,
          limit: `${clipboard} clipboard items · ${snippets} snippets`,
          popular: plan.highlighted,
        };
      }),
    [publicPlans],
  );

  return (
    <div className="bg-background text-foreground">
      <main>
        {/* ── Hero ─────────────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden border-b">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(99,102,241,0.18),transparent)]" />
          <div className="relative mx-auto max-w-4xl px-4 py-24 text-center sm:px-6 sm:py-32">
            <Badge
              variant="secondary"
              className="mb-6 gap-1.5 px-3 py-1 text-xs"
            >
              <Sparkles className="h-3 w-3" /> Clipboard · Snippets · Browser
              inspector
            </Badge>

            <h1 className="mb-5 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Everything a developer
              <br />
              copies, saved and searchable.
            </h1>

            <p className="mx-auto mb-8 max-w-2xl text-base text-muted-foreground sm:text-lg">
              DevClipboard Hub is a SaaS workspace that keeps your clipboard
              history, code snippets, and browser storage data in one place —
              synced to your account, available everywhere.
            </p>

            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/app">
                <Button size="lg" className="gap-2 px-6">
                  {isAuthenticated ? "Open workspace" : "Try free — no signup"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/pricing">
                <Button size="lg" variant="outline" className="px-6">
                  See pricing
                </Button>
              </Link>
            </div>

            <p className="mt-5 text-xs text-muted-foreground">
              Free plan available · No credit card required
            </p>
          </div>
        </section>

        {/* ── Core features ──────────────────────────────────────────────────── */}
        <section id="features" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Three tools in one workspace
            </h2>
            <p className="mt-3 text-muted-foreground">
              No context switching. Everything lives in a single,
              keyboard-friendly interface.
            </p>
          </div>

          <div className="space-y-6">
            {coreFeatures.map((f, i) => (
              <Card key={f.title} className="overflow-hidden border-border/60">
                <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:gap-10 sm:p-8">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <f.icon className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        0{i + 1}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold">{f.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {f.description}
                    </p>
                  </div>
                  <div className="flex-1">
                    <ul className="space-y-2.5">
                      {f.bullets.map((b) => (
                        <li
                          key={b}
                          className="flex items-start gap-2.5 text-sm"
                        >
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Separator />

        {/* ── Secondary features ────────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Everything else you need
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Productivity details that add up every day.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {secondaryFeatures.map((f) => (
              <Card key={f.title} className="border-border/50">
                <CardContent className="space-y-3 p-5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <f.icon className="h-4 w-4" />
                  </div>
                  <p className="text-sm font-semibold">{f.title}</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {f.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Separator />

        {/* ── Plan highlights ───────────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Simple, honest pricing
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Start free. Scale when your workflow needs it.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {planHighlights.map((p) => (
              <div
                key={p.tier}
                className={`relative space-y-3 rounded-2xl border p-5 ${
                  p.popular ?
                    "border-primary shadow-md shadow-primary/10"
                  : "border-border/60"
                }`}
              >
                {p.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary px-3 text-xs text-primary-foreground">
                    Most popular
                  </Badge>
                )}
                <p className="text-base font-bold">{p.tier}</p>
                <p className="text-2xl font-extrabold">{p.price}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {p.limit}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link to="/pricing">
              <Button variant="outline" size="lg" className="gap-2">
                Full pricing details <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────────────── */}
        <section className="border-t bg-primary/5">
          <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Stop losing things you copy.
            </h2>
            <p className="mt-4 text-muted-foreground">
              DevClipboard Hub keeps your clipboard history, snippets, and
              browser data organised and instantly reachable — every session,
              every project.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/app">
                <Button size="lg" className="gap-2 px-8">
                  {isAuthenticated ? "Go to workspace" : "Try free — no signup"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

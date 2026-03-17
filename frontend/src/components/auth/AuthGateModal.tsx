/**
 * AuthGateModal — inline Login / Register dialog.
 *
 * Opens automatically via GuestContext.openAuthGate().
 * - Shown when a guest hits a usage limit or clicks "Upgrade".
 * - Contains compact login + register tabs (no page navigation needed).
 * - On successful auth the modal closes; user stays on the workspace page.
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Clipboard, Lock, Sparkles, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { useGuest, type AuthGateReason } from "@/contexts/GuestContext";
import { api, ApiError } from "@/lib/api";

// ── Copy helpers ───────────────────────────────────────────────────────────────

function getHeadline(reason: AuthGateReason): string {
  switch (reason) {
    case "clipboard-limit":
      return "Free limit reached";
    case "snippet-limit":
      return "Free limit reached";
    case "upgrade":
      return "Unlock more features";
    case "protected-feature":
      return "Sign in to continue";
    default:
      return "Create a free account";
  }
}

function getSubline(reason: AuthGateReason): string {
  switch (reason) {
    case "clipboard-limit":
      return "You've used all 25 free clipboard slots. Sign in to sync unlimited items to the cloud.";
    case "snippet-limit":
      return "You've used all 25 free snippet slots. Sign in to build a richer snippet library.";
    case "upgrade":
      return "Sign in to choose a plan and unlock cloud sync, teams, and more.";
    case "protected-feature":
      return "This feature requires an account. It only takes a second to sign up — for free.";
    default:
      return "Save your clipboard history and snippets to the cloud. Free forever.";
  }
}

// ── Login form ─────────────────────────────────────────────────────────────────

interface LoginForm { email: string; password: string }

function LoginTab({ onSuccess }: { onSuccess: () => void }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<LoginForm>();
  const [magicEmail, setMagicEmail] = useState("");
  const [magicSent, setMagicSent] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);

  const onSubmit = async (data: LoginForm) => {
    try {
      const result = await login(data.email, data.password);
      if (result.requires2FA && result.twoFactorToken) {
        onSuccess(); // close modal first
        navigate("/auth/2fa", { state: { twoFactorToken: result.twoFactorToken } });
        return;
      }
      toast.success("Welcome back!");
      onSuccess();
    } catch (err) {
      if (err instanceof ApiError && err.code === "EMAIL_NOT_VERIFIED") {
        toast.error("Please verify your email first.");
        onSuccess();
        navigate("/auth/verify-email", { state: { email: data.email } });
        return;
      }
      toast.error(err instanceof ApiError ? err.message : "Login failed");
    }
  };

  const sendMagicLink = async () => {
    if (!magicEmail) return;
    setMagicLoading(true);
    try {
      await api.post("/api/auth/magic-link", { email: magicEmail }, { skipAuth: true });
      setMagicSent(true);
      toast.success("Magic link sent! Check your inbox.");
    } catch {
      toast.error("Failed to send magic link");
    } finally {
      setMagicLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="gate-email">Email</Label>
          <Input
            id="gate-email"
            type="email"
            placeholder="you@example.com"
            {...register("email", { required: "Email is required" })}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="gate-password">Password</Label>
          <Input
            id="gate-password"
            type="password"
            placeholder="••••••••"
            {...register("password", { required: "Password is required" })}
          />
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="relative">
        <Separator />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="px-2 text-xs bg-background text-muted-foreground">
            or use a magic link
          </span>
        </span>
      </div>

      {magicSent ? (
        <p className="text-sm text-center text-muted-foreground">
          Check your inbox for a magic link ✓
        </p>
      ) : (
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="your@email.com"
            value={magicEmail}
            onChange={(e) => setMagicEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMagicLink()}
          />
          <Button
            variant="outline"
            onClick={sendMagicLink}
            disabled={magicLoading || !magicEmail}
          >
            {magicLoading ? "…" : "Send"}
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Register form ──────────────────────────────────────────────────────────────

interface RegisterForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

function RegisterTab({ onSuccess }: { onSuccess: () => void }) {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } =
    useForm<RegisterForm>();

  const onSubmit = async (data: RegisterForm) => {
    try {
      await registerUser(data.name, data.email, data.password);
      toast.success("Account created! Check your email to verify.");
      onSuccess();
      navigate("/auth/verify-email", { state: { email: data.email } });
    } catch (err) {
      if (err instanceof ApiError && err.code === "EMAIL_IN_USE") {
        toast.error("An account with that email already exists.");
        return;
      }
      toast.error(err instanceof ApiError ? err.message : "Registration failed");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="gate-name">Name</Label>
        <Input
          id="gate-name"
          placeholder="Your name"
          {...register("name", {
            required: "Name is required",
            minLength: { value: 2, message: "Min 2 characters" },
          })}
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <Label htmlFor="gate-reg-email">Email</Label>
        <Input
          id="gate-reg-email"
          type="email"
          placeholder="you@example.com"
          {...register("email", { required: "Email is required" })}
        />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <Label htmlFor="gate-reg-pass">Password</Label>
        <Input
          id="gate-reg-pass"
          type="password"
          placeholder="Min. 8 characters"
          {...register("password", {
            required: "Password is required",
            minLength: { value: 8, message: "Min 8 characters" },
          })}
        />
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <Label htmlFor="gate-confirm-pass">Confirm password</Label>
        <Input
          id="gate-confirm-pass"
          type="password"
          placeholder="Repeat password"
          {...register("confirmPassword", {
            required: "Please confirm your password",
            validate: (v) => v === watch("password") || "Passwords don't match",
          })}
        />
        {errors.confirmPassword && (
          <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Creating account…" : "Create free account"}
      </Button>
    </form>
  );
}

// ── Main modal ─────────────────────────────────────────────────────────────────

export function AuthGateModal() {
  const { authGateOpen, authGateReason, closeAuthGate } = useGuest();
  const [tab, setTab] = useState<"login" | "register">("register");

  const headline = getHeadline(authGateReason);
  const subline = getSubline(authGateReason);

  const isLimitReason =
    authGateReason === "clipboard-limit" || authGateReason === "snippet-limit";

  return (
    <Dialog open={authGateOpen} onOpenChange={(open) => !open && closeAuthGate()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center rounded-lg h-9 w-9 bg-primary/10">
              {isLimitReason ? (
                <Zap className="w-5 h-5 text-primary" />
              ) : authGateReason === "upgrade" ? (
                <Sparkles className="w-5 h-5 text-primary" />
              ) : authGateReason === "protected-feature" ? (
                <Lock className="w-5 h-5 text-primary" />
              ) : (
                <Clipboard className="w-5 h-5 text-primary" />
              )}
            </div>
            <div>
              <DialogTitle className="text-base">{headline}</DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-sm leading-relaxed">
            {subline}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "register")}>
          <TabsList className="w-full">
            <TabsTrigger value="register" className="flex-1">Sign up free</TabsTrigger>
            <TabsTrigger value="login" className="flex-1">Sign in</TabsTrigger>
          </TabsList>

          <TabsContent value="register" className="mt-4">
            <RegisterTab onSuccess={closeAuthGate} />
          </TabsContent>

          <TabsContent value="login" className="mt-4">
            <LoginTab onSuccess={closeAuthGate} />
          </TabsContent>
        </Tabs>

        <p className="pt-1 text-xs text-center text-muted-foreground">
          By signing up you agree to our terms. Free plan includes 25 clipboard
          items &amp; 25 snippets — forever.
        </p>
      </DialogContent>
    </Dialog>
  );
}

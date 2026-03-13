import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { api, ApiError } from "@/lib/api";

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname ?? "/";

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>();
  const [magicEmail, setMagicEmail] = useState("");
  const [magicSent, setMagicSent] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);

  const onSubmit = async (data: LoginForm) => {
    try {
      const result = await login(data.email, data.password);
      if (result.requires2FA && result.twoFactorToken) {
        navigate("/auth/2fa", { state: { twoFactorToken: result.twoFactorToken } });
        return;
      }
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.code === "EMAIL_NOT_VERIFIED") {
        toast.error("Please verify your email first. Check your inbox.");
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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Sign in</CardTitle>
          <CardDescription>Welcome back to DevClipboard Hub</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...register("email", { required: "Email is required" })}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/auth/forgot-password" className="text-xs text-muted-foreground hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register("password", { required: "Password is required" })}
              />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <div className="relative">
            <Separator />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="bg-card px-2 text-xs text-muted-foreground">or sign in with a magic link</span>
            </span>
          </div>

          {magicSent ? (
            <p className="text-center text-sm text-muted-foreground">
              Check your inbox for a magic link.
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
              <Button variant="outline" onClick={sendMagicLink} disabled={magicLoading || !magicEmail}>
                {magicLoading ? "..." : "Send"}
              </Button>
            </div>
          )}
        </CardContent>

        <CardFooter>
          <p className="text-sm text-muted-foreground text-center w-full">
            Don't have an account?{" "}
            <Link to="/auth/register" className="text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

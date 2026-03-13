import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { api, ApiError, setAccessToken } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export default function VerifyEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const email = (location.state as any)?.email ?? "";

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const verify = async () => {
    if (otp.length !== 6) return;
    setLoading(true);
    try {
      const data = await api.post<{ accessToken: string }>(
        "/api/auth/verify-email",
        { email, otp },
        { skipAuth: true },
      );
      setAccessToken(data.accessToken);
      await refreshUser();
      toast.success("Email verified! Welcome.");
      navigate("/");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Verification failed",
      );
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setResending(true);
    try {
      await api.post(
        "/api/auth/resend-verification",
        { email },
        { skipAuth: true },
      );
      toast.success("New code sent!");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to resend");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Check your email</CardTitle>
          <CardDescription>
            We sent a 6-digit code to{" "}
            <span className="font-medium text-foreground">
              {email || "your email"}
            </span>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={otp}
              onChange={setOtp}
              onComplete={verify}
            >
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot key={i} index={i} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>

          <Button
            className="w-full"
            onClick={verify}
            disabled={loading || otp.length < 6}
          >
            {loading ? "Verifying..." : "Verify email"}
          </Button>

          <p className="text-sm text-muted-foreground">
            Didn't receive a code?{" "}
            <button
              onClick={resend}
              disabled={resending}
              className="text-primary hover:underline disabled:opacity-50"
            >
              {resending ? "Sending..." : "Resend code"}
            </button>
          </p>

          <Link
            to="/auth/login"
            className="block text-xs text-muted-foreground hover:underline"
          >
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

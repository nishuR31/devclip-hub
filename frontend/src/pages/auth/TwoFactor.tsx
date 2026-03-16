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

export default function TwoFactorPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const twoFactorToken = (location.state as any)?.twoFactorToken ?? "";
  const from = (location.state as any)?.from?.pathname ?? "/app";

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const verify = async () => {
    if (code.length !== 6) return;
    setLoading(true);
    try {
      const data = await api.post<{ accessToken: string }>(
        "/api/auth/2fa/verify",
        { twoFactorToken, totpCode: code },
        { skipAuth: true },
      );
      setAccessToken(data.accessToken);
      await refreshUser();
      toast.success("Signed in!");
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Invalid code");
      setCode("");
    } finally {
      setLoading(false);
    }
  };

  if (!twoFactorToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm text-center">
          <CardHeader>
            <CardTitle>Invalid session</CardTitle>
            <CardDescription>
              <Link to="/auth/login" className="text-primary hover:underline">
                Back to sign in
              </Link>
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Two-factor authentication</CardTitle>
          <CardDescription>
            Enter the 6-digit code from your authenticator app
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={code}
              onChange={setCode}
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
            disabled={loading || code.length < 6}
          >
            {loading ? "Verifying..." : "Verify"}
          </Button>

          <Link
            to="/auth/login"
            className="block text-sm text-muted-foreground hover:underline"
          >
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api, ApiError, setAccessToken } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export default function MagicLinkPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      toast.error("Invalid or missing magic link token");
      navigate("/auth/login");
      return;
    }

    api
      .post<{ accessToken: string }>(
        "/api/auth/magic-link/verify",
        { token },
        { skipAuth: true },
      )
      .then(async (data) => {
        setAccessToken(data.accessToken);
        await refreshUser();
        toast.success("Signed in successfully!");
        navigate("/app");
      })
      .catch((err) => {
        toast.error(
          err instanceof ApiError ?
            err.message
          : "Magic link failed or expired",
        );
        navigate("/auth/login");
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle>Signing you in...</CardTitle>
          <CardDescription>
            Please wait while we verify your magic link.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    </div>
  );
}

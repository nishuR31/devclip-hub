import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api, ApiError } from "@/lib/api";

interface ForgotForm {
  email: string;
}

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotForm>();

  const onSubmit = async (data: ForgotForm) => {
    try {
      await api.post(
        "/api/auth/forgot-password",
        { email: data.email },
        { skipAuth: true },
      );
      toast.success("If that email exists, a reset code has been sent.");
      navigate("/auth/reset-password", { state: { email: data.email } });
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Something went wrong",
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Forgot password</CardTitle>
          <CardDescription>
            Enter your email and we'll send you a reset code
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...register("email", { required: "Email is required" })}
              />
              {errors.email && (
                <p className="text-xs text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Sending..." : "Send reset code"}
            </Button>
          </form>
        </CardContent>

        <CardFooter>
          <Link
            to="/auth/login"
            className="text-sm text-muted-foreground hover:underline mx-auto"
          >
            Back to sign in
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

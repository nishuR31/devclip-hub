import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { api, ApiError } from "@/lib/api";

interface ResetForm {
  newPassword: string;
  confirmPassword: string;
}

export default function ResetPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = (location.state as any)?.email ?? "";

  const [otp, setOtp] = useState("");
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetForm>();

  const onSubmit = async (data: ResetForm) => {
    if (otp.length < 6) {
      toast.error("Enter the 6-digit code");
      return;
    }
    try {
      await api.post(
        "/api/auth/reset-password",
        { email, otp, newPassword: data.newPassword },
        { skipAuth: true },
      );
      toast.success("Password reset! Please sign in.");
      navigate("/auth/login");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Reset failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Reset password</CardTitle>
          <CardDescription>
            Enter the code sent to{" "}
            <span className="font-medium text-foreground">
              {email || "your email"}
            </span>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <InputOTP maxLength={6} value={otp} onChange={setOtp}>
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot key={i} index={i} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Min. 8 characters"
                {...register("newPassword", {
                  required: "New password is required",
                  minLength: { value: 8, message: "Min 8 characters" },
                })}
              />
              {errors.newPassword && (
                <p className="text-xs text-destructive">
                  {errors.newPassword.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Repeat password"
                {...register("confirmPassword", {
                  required: "Please confirm",
                  validate: (v) =>
                    v === watch("newPassword") || "Passwords don't match",
                })}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Resetting..." : "Reset password"}
            </Button>
          </form>

          <Link
            to="/auth/login"
            className="block text-center text-sm text-muted-foreground hover:underline"
          >
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

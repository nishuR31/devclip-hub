import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Shield, ShieldCheck, ShieldOff } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { api, ApiError } from "@/lib/api";

interface ChangePasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function SecurityPage() {
  const { user, refreshUser } = useAuth();
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [setupStep, setSetupStep] = useState<"idle" | "qr" | "done">("idle");
  const [totpCode, setTotpCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordForm>();

  // ── Change password ──────────────────────────────────────────────────────────

  const onChangePassword = async (data: ChangePasswordForm) => {
    try {
      await api.put("/api/auth/change-password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast.success("Password updated");
      reset();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to change password",
      );
    }
  };

  // ── 2FA setup ────────────────────────────────────────────────────────────────

  const start2FASetup = async () => {
    setLoading(true);
    try {
      const data = await api.post<{ qrCodeDataUrl: string }>(
        "/api/auth/2fa/setup",
      );
      setQrUrl(data.qrCodeDataUrl);
      setSetupStep("qr");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to start 2FA setup",
      );
    } finally {
      setLoading(false);
    }
  };

  const confirm2FASetup = async () => {
    if (totpCode.length < 6) return;
    setLoading(true);
    try {
      const data = await api.post<{ backupCodes: string[] }>(
        "/api/auth/2fa/enable",
        { totpCode },
      );
      setBackupCodes(data.backupCodes);
      setSetupStep("done");
      await refreshUser();
      toast.success("Two-factor authentication enabled!");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Invalid code");
      setTotpCode("");
    } finally {
      setLoading(false);
    }
  };

  const disable2FA = async () => {
    if (!disablePassword) return;
    setLoading(true);
    try {
      await api.post("/api/auth/2fa/disable", { password: disablePassword });
      await refreshUser();
      setDisableOpen(false);
      setDisablePassword("");
      toast.success("Two-factor authentication disabled");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to disable 2FA",
      );
    } finally {
      setLoading(false);
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
          <h1 className="text-2xl font-bold">Security</h1>
          <p className="text-muted-foreground text-sm">
            Manage your password and two-factor authentication
          </p>
        </div>

        {/* Change password */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Change password</CardTitle>
            <CardDescription>Use a strong, unique password</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit(onChangePassword)}
              className="space-y-3"
            >
              <div className="space-y-1">
                <Label>Current password</Label>
                <Input
                  type="password"
                  {...register("currentPassword", { required: "Required" })}
                />
                {errors.currentPassword && (
                  <p className="text-xs text-destructive">
                    {errors.currentPassword.message}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label>New password</Label>
                <Input
                  type="password"
                  placeholder="Min 8 characters"
                  {...register("newPassword", {
                    required: "Required",
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
                <Label>Confirm new password</Label>
                <Input
                  type="password"
                  {...register("confirmPassword", {
                    required: "Required",
                    validate: (v) =>
                      v === watch("newPassword") || "Passwords do not match",
                  })}
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? "Updating..." : "Update password"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Two-factor authentication */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              {user?.twoFactorEnabled ?
                <ShieldCheck className="h-5 w-5 text-green-500" />
              : <Shield className="h-5 w-5 text-muted-foreground" />}
              Two-factor authentication
            </CardTitle>
            <CardDescription>
              {user?.twoFactorEnabled ?
                "2FA is active. Your account is protected."
              : "Add an extra layer of security with an authenticator app."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!user?.twoFactorEnabled && setupStep === "idle" && (
              <Button size="sm" onClick={start2FASetup} disabled={loading}>
                {loading ? "Loading..." : "Set up 2FA"}
              </Button>
            )}

            {setupStep === "qr" && qrUrl && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Scan this QR code with your authenticator app (Google
                  Authenticator, Authy, etc.)
                </p>
                <img
                  src={qrUrl}
                  alt="QR Code"
                  className="rounded border p-2 w-48 h-48"
                />
                <div className="space-y-2">
                  <Label>Enter the 6-digit code to confirm</Label>
                  <InputOTP
                    maxLength={6}
                    value={totpCode}
                    onChange={setTotpCode}
                    onComplete={confirm2FASetup}
                  >
                    <InputOTPGroup>
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <InputOTPSlot key={i} index={i} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                  <Button
                    size="sm"
                    onClick={confirm2FASetup}
                    disabled={loading || totpCode.length < 6}
                  >
                    {loading ? "Verifying..." : "Confirm & enable"}
                  </Button>
                </div>
              </div>
            )}

            {setupStep === "done" && backupCodes.length > 0 && (
              <div className="space-y-3">
                <div className="rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 p-4">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                    Save your backup codes
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mb-3">
                    These codes can be used to access your account if you lose
                    your authenticator. Store them safely — they won't be shown
                    again.
                  </p>
                  <div className="grid grid-cols-2 gap-1">
                    {backupCodes.map((code) => (
                      <code
                        key={code}
                        className="text-xs font-mono bg-amber-100 dark:bg-amber-900 px-2 py-1 rounded"
                      >
                        {code}
                      </code>
                    ))}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSetupStep("idle")}
                >
                  Done
                </Button>
              </div>
            )}

            {user?.twoFactorEnabled && setupStep === "idle" && (
              <Dialog open={disableOpen} onOpenChange={setDisableOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="destructive">
                    <ShieldOff className="h-4 w-4 mr-2" />
                    Disable 2FA
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Disable two-factor authentication</DialogTitle>
                    <DialogDescription>
                      Enter your password to confirm.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 pt-2">
                    <Input
                      type="password"
                      placeholder="Your password"
                      value={disablePassword}
                      onChange={(e) => setDisablePassword(e.target.value)}
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setDisableOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={disable2FA}
                        disabled={loading || !disablePassword}
                      >
                        {loading ? "Disabling..." : "Disable 2FA"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

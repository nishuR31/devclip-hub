import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { VisualSettingsProvider } from "@/contexts/VisualSettingsContext";
import { GuestProvider } from "@/contexts/GuestContext";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { GuestGuard } from "@/components/auth/GuestGuard";
import { AuthGateModal } from "@/components/auth/AuthGateModal";
import { AppChrome } from "@/components/layout/AppChrome";
import { CursorEffects } from "@/components/effects/CursorEffects";
import { AmbientBackground } from "@/components/effects/AmbientBackground";
import { SettingsPanel } from "@/components/effects/SettingsPanel";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Pricing from "./pages/Pricing";
import LandingPage from "./pages/Landing";
import LoginPage from "./pages/auth/Login";
import RegisterPage from "./pages/auth/Register";
import VerifyEmailPage from "./pages/auth/VerifyEmail";
import ForgotPasswordPage from "./pages/auth/ForgotPassword";
import ResetPasswordPage from "./pages/auth/ResetPassword";
import MagicLinkPage from "./pages/auth/MagicLink";
import TwoFactorPage from "./pages/auth/TwoFactor";
import AccountPage from "./pages/account/Account";
import BillingPage from "./pages/account/Billing";
import SecurityPage from "./pages/account/Security";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <VisualSettingsProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <GuestProvider>
            <SubscriptionProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                {/* Premium visual effects */}
                <AmbientBackground />
                <CursorEffects />
                <SettingsPanel />
                {/* Auth gate modal — shown when guest hits limit or clicks upgrade */}
                <BrowserRouter>
                  <AuthGateModal />
                  <Routes>
                    <Route element={<AppChrome />}>
                      {/* Public */}
                      <Route path="/" element={<LandingPage />} />
                      <Route path="/pricing" element={<Pricing />} />

                      {/* Guest-only */}
                      <Route
                        path="/auth/login"
                        element={
                          <GuestGuard>
                            <LoginPage />
                          </GuestGuard>
                        }
                      />
                      <Route
                        path="/auth/register"
                        element={
                          <GuestGuard>
                            <RegisterPage />
                          </GuestGuard>
                        }
                      />
                      <Route
                        path="/auth/verify-email"
                        element={<VerifyEmailPage />}
                      />
                      <Route
                        path="/auth/forgot-password"
                        element={
                          <GuestGuard>
                            <ForgotPasswordPage />
                          </GuestGuard>
                        }
                      />
                      <Route
                        path="/auth/reset-password"
                        element={<ResetPasswordPage />}
                      />
                      <Route path="/auth/magic" element={<MagicLinkPage />} />
                      <Route path="/auth/2fa" element={<TwoFactorPage />} />

                      {/* Protected — but allows guest (free without login) */}
                      <Route
                        path="/app"
                        element={
                          <AuthGuard allowGuest>
                            <Index />
                          </AuthGuard>
                        }
                      />
                      <Route
                        path="/account"
                        element={
                          <AuthGuard>
                            <AccountPage />
                          </AuthGuard>
                        }
                      />
                      <Route
                        path="/account/billing"
                        element={
                          <AuthGuard>
                            <BillingPage />
                          </AuthGuard>
                        }
                      />
                      <Route
                        path="/account/security"
                        element={
                          <AuthGuard>
                            <SecurityPage />
                          </AuthGuard>
                        }
                      />

                      <Route path="*" element={<NotFound />} />
                    </Route>
                  </Routes>
                </BrowserRouter>
              </TooltipProvider>
            </SubscriptionProvider>
          </GuestProvider>
        </AuthProvider>
      </QueryClientProvider>
    </VisualSettingsProvider>
  </ThemeProvider>
);

export default App;

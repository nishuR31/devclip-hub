import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { GuestGuard } from "@/components/auth/GuestGuard";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Pricing from "./pages/Pricing";
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
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SubscriptionProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public */}
              <Route path="/pricing" element={<Pricing />} />

              {/* Guest-only */}
              <Route
                path="/auth/login"
                element={<GuestGuard><LoginPage /></GuestGuard>}
              />
              <Route
                path="/auth/register"
                element={<GuestGuard><RegisterPage /></GuestGuard>}
              />
              <Route path="/auth/verify-email" element={<VerifyEmailPage />} />
              <Route
                path="/auth/forgot-password"
                element={<GuestGuard><ForgotPasswordPage /></GuestGuard>}
              />
              <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
              <Route path="/auth/magic" element={<MagicLinkPage />} />
              <Route path="/auth/2fa" element={<TwoFactorPage />} />

              {/* Protected */}
              <Route
                path="/"
                element={<AuthGuard><Index /></AuthGuard>}
              />
              <Route
                path="/account"
                element={<AuthGuard><AccountPage /></AuthGuard>}
              />
              <Route
                path="/account/billing"
                element={<AuthGuard><BillingPage /></AuthGuard>}
              />
              <Route
                path="/account/security"
                element={<AuthGuard><SecurityPage /></AuthGuard>}
              />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </SubscriptionProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

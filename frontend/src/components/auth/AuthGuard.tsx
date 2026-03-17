import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface AuthGuardProps {
  children: React.ReactNode;
  /** Redirect destination when unauthenticated (default: /auth/login) */
  redirectTo?: string;
  /**
   * When true, unauthenticated (guest) users are allowed through without
   * redirecting. Use this for routes that work in guest mode, e.g. /app.
   */
  allowGuest?: boolean;
}

/**
 * Wraps protected routes. Redirects to /auth/login if the user is not
 * authenticated — unless `allowGuest` is true, in which case unauthenticated
 * users are permitted through (guest / free-without-login mode).
 * Preserves the intended path in location.state so the login page can
 * redirect back after a successful sign-in.
 */
export function AuthGuard({
  children,
  redirectTo = "/auth/login",
  allowGuest = false,
}: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated && !allowGuest) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

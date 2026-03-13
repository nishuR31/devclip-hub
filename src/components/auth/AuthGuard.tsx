import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface AuthGuardProps {
  children: React.ReactNode;
  /** Redirect destination when unauthenticated (default: /auth/login) */
  redirectTo?: string;
}

/**
 * Wraps protected routes. Redirects to /auth/login if the user is not
 * authenticated. Preserves the intended path in location.state so the
 * login page can redirect back after a successful sign-in.
 */
export function AuthGuard({
  children,
  redirectTo = "/auth/login",
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

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

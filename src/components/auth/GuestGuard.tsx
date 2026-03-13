import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface GuestGuardProps {
  children: React.ReactNode;
  /** Redirect destination when authenticated (default: /) */
  redirectTo?: string;
}

/**
 * Wraps guest-only routes (login, register, etc.).
 * Redirects to the app home if the user is already signed in.
 */
export function GuestGuard({ children, redirectTo = "/" }: GuestGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}

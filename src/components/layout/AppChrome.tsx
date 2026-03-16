import { Link, Outlet } from "react-router-dom";
import { Clipboard, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

export function AppChrome() {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Clipboard className="h-4 w-4" />
            </div>
            <span className="text-sm font-bold tracking-tight">
              DevClipboard Hub
            </span>
          </Link>

          <nav className="hidden items-center gap-1 sm:flex">
            <Link to="/">
              <Button variant="ghost" size="sm">
                Home
              </Button>
            </Link>
            <Link to="/pricing">
              <Button variant="ghost" size="sm">
                Pricing
              </Button>
            </Link>
            <Link to="/app">
              <Button variant="ghost" size="sm">
                Workspace
              </Button>
            </Link>
            {isAuthenticated && (
              <Link to="/account">
                <Button variant="ghost" size="sm">
                  Account
                </Button>
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-2">
            {isAuthenticated ?
              <>
                <Link to="/account">
                  <Button
                    variant="outline"
                    size="sm"
                    className="hidden gap-1.5 sm:inline-flex"
                  >
                    <User className="h-3.5 w-3.5" />
                    {user?.name ?? user?.email?.split("@")[0]}
                  </Button>
                </Link>
                <Link to="/app">
                  <Button size="sm">Open app</Button>
                </Link>
              </>
            : <>
                <Link to="/auth/login">
                  <Button variant="ghost" size="sm">
                    Log in
                  </Button>
                </Link>
                <Link to="/auth/register">
                  <Button size="sm">Get started</Button>
                </Link>
              </>
            }
          </div>
        </div>
      </header>

      <div className="flex-1">
        <Outlet />
      </div>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} DevClipboard Hub</p>
          <div className="flex gap-4">
            <Link to="/">Home</Link>
            <Link to="/pricing">Pricing</Link>
            <Link to="/app">Workspace</Link>
            <Link to="/account">Account</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

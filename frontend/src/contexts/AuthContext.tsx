import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { api, setAccessToken, ApiError } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  avatarUrl: string | null;
  twoFactorEnabled: boolean;
  plan: string;
  createdAt: string;
}

interface LoginResult {
  requires2FA?: boolean;
  twoFactorToken?: string;
  accessToken?: string;
  user?: AuthUser;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// ── Context ────────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const initialized = useRef(false);

  // On mount: attempt silent token refresh to restore session
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    (async () => {
      try {
        const data = await api.post<{ accessToken: string; user: AuthUser }>(
          "/api/auth/refresh",
          undefined,
          { skipAuth: true },
        );
        setAccessToken(data.accessToken);
        setUser(data.user);
      } catch {
        // No valid session — that's fine
        setAccessToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<LoginResult> => {
      const data = await api.post<LoginResult>(
        "/api/auth/login",
        { email, password },
        { skipAuth: true },
      );

      if (data.requires2FA) {
        return data; // Caller handles the 2FA flow
      }

      if (data.accessToken && data.user) {
        setAccessToken(data.accessToken);
        setUser(data.user);
      }
      return data;
    },
    [],
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      await api.post(
        "/api/auth/register",
        { name, email, password },
        { skipAuth: true },
      );
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/api/auth/logout");
    } catch {
      // Ignore errors — still clear client state
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const data = await api.get<AuthUser>("/api/users/me");
      setUser(data);
    } catch {
      // Silently ignore
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: user !== null,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

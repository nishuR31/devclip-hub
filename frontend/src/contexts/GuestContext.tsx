/**
 * GuestContext — manages anonymous (unauthenticated) user sessions.
 *
 * - Assigns a persistent guestId stored in both localStorage AND a cookie so
 *   clearing localStorage alone doesn't reset the guest's quota.
 * - Tracks a cumulative "items added" counter in the cookie as a lightweight
 *   anti-exploitation measure (prevents quota-reset via localStorage clear).
 * - Provides openAuthGate / closeAuthGate to trigger the login/register modal
 *   from any component (e.g. when a limit is hit or upgrade is attempted).
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ApiError, api } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────────

export type AuthGateReason =
  | "clipboard-limit" // hit the free clipboard cap
  | "snippet-limit" // hit the free snippet cap
  | "upgrade" // user explicitly clicked upgrade/pricing
  | "protected-feature" // tried to access an account-only feature
  | null;

interface GuestContextValue {
  /** Stable UUID identifying this guest browser session */
  guestId: string;
  /**
   * Cumulative clipboard items ever added by this guest.
   * Persisted in cookie — survives localStorage clears.
   */
  guestClipboardAdded: number;
  /**
   * Cumulative snippet items ever added by this guest.
   * Persisted in cookie — survives localStorage clears.
   */
  guestSnippetAdded: number;
  /** Increment the cumulative clipboard counter (call on every successful add) */
  incrementClipboardAdded: () => void;
  /** Increment the cumulative snippet counter */
  incrementSnippetAdded: () => void;
  /** Whether the auth gate (login/register modal) is currently visible */
  authGateOpen: boolean;
  /** The reason the gate was opened — used to tailor copy/messaging */
  authGateReason: AuthGateReason;
  /** Open the auth gate with an optional reason */
  openAuthGate: (reason?: AuthGateReason) => void;
  /** Close the auth gate */
  closeAuthGate: () => void;
}

// ── Cookie helpers ─────────────────────────────────────────────────────────────

const COOKIE_ID_KEY = "devclip_guest_id";
const COOKIE_USAGE_KEY = "devclip_guest_usage";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year in seconds

function readCookie(name: string): string | null {
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

function writeCookie(name: string, value: string, maxAge = COOKIE_MAX_AGE) {
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAge}; SameSite=Strict; path=/`;
}

// ── Usage cookie: { cb: number; sn: number } ──────────────────────────────────

interface GuestUsage {
  cb: number; // clipboard items added (cumulative)
  sn: number; // snippet items added (cumulative)
}

function readUsageCookie(): GuestUsage {
  try {
    const raw = readCookie(COOKIE_USAGE_KEY);
    if (!raw) return { cb: 0, sn: 0 };
    const parsed = JSON.parse(raw);
    return {
      cb: typeof parsed.cb === "number" ? parsed.cb : 0,
      sn: typeof parsed.sn === "number" ? parsed.sn : 0,
    };
  } catch {
    return { cb: 0, sn: 0 };
  }
}

function writeUsageCookie(usage: GuestUsage) {
  writeCookie(COOKIE_USAGE_KEY, JSON.stringify(usage));
}

// ── GuestId ────────────────────────────────────────────────────────────────────

const LS_GUEST_ID = "devclip_guest_id";

function getOrCreateGuestId(): string {
  // Prefer cookie (persists beyond localStorage clears)
  const fromCookie = readCookie(COOKIE_ID_KEY);
  if (fromCookie) {
    // Keep localStorage in sync
    try {
      localStorage.setItem(LS_GUEST_ID, fromCookie);
    } catch {
      /* ignore */
    }
    return fromCookie;
  }

  // Fall back to localStorage
  try {
    const fromLS = localStorage.getItem(LS_GUEST_ID);
    if (fromLS) {
      writeCookie(COOKIE_ID_KEY, fromLS);
      return fromLS;
    }
  } catch {
    /* ignore */
  }

  // Create fresh guest id
  const id = crypto.randomUUID();
  writeCookie(COOKIE_ID_KEY, id);
  try {
    localStorage.setItem(LS_GUEST_ID, id);
  } catch {
    /* ignore */
  }
  return id;
}

// ── Context ────────────────────────────────────────────────────────────────────

const GuestContext = createContext<GuestContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────────────────────

export function GuestProvider({ children }: { children: React.ReactNode }) {
  const [guestId] = useState<string>(getOrCreateGuestId);
  const [usage, setUsage] = useState<GuestUsage>(readUsageCookie);
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [authGateReason, setAuthGateReason] = useState<AuthGateReason>(null);

  const openAuthGate = useCallback((reason: AuthGateReason = null) => {
    setAuthGateReason(reason);
    setAuthGateOpen(true);
  }, []);

  const closeAuthGate = useCallback(() => {
    setAuthGateOpen(false);
    setAuthGateReason(null);
  }, []);

  const syncWithServer = useCallback(async () => {
    try {
      const data = await api.get<{
        usage?: { clipboard?: number; snippet?: number };
      }>(`/api/guest/usage?guestId=${encodeURIComponent(guestId)}`, {
        skipAuth: true,
      });

      setUsage((prev) => ({
        cb: Math.max(prev.cb, Number(data.usage?.clipboard ?? 0)),
        sn: Math.max(prev.sn, Number(data.usage?.snippet ?? 0)),
      }));
    } catch {
      // ignore sync failures
    }
  }, [guestId]);

  const reportUsage = useCallback(
    async (event: "clipboard" | "snippet") => {
      try {
        const data = await api.post<{
          usage?: { clipboard?: number; snippet?: number };
        }>(
          "/api/guest/track",
          { guestId, event, delta: 1 },
          { skipAuth: true },
        );

        setUsage((prev) => ({
          cb: Math.max(prev.cb, Number(data.usage?.clipboard ?? 0)),
          sn: Math.max(prev.sn, Number(data.usage?.snippet ?? 0)),
        }));
      } catch (error) {
        if (error instanceof ApiError && error.code === "GUEST_LIMIT_REACHED") {
          openAuthGate(
            event === "clipboard" ? "clipboard-limit" : "snippet-limit",
          );
        }
      }
    },
    [guestId, openAuthGate],
  );

  // Keep cookie up to date whenever usage changes
  useEffect(() => {
    writeUsageCookie(usage);
  }, [usage]);

  useEffect(() => {
    void syncWithServer();
  }, [syncWithServer]);

  const incrementClipboardAdded = useCallback(() => {
    setUsage((prev) => ({ ...prev, cb: prev.cb + 1 }));
    void reportUsage("clipboard");
  }, [reportUsage]);

  const incrementSnippetAdded = useCallback(() => {
    setUsage((prev) => ({ ...prev, sn: prev.sn + 1 }));
    void reportUsage("snippet");
  }, [reportUsage]);

  const value = useMemo<GuestContextValue>(
    () => ({
      guestId,
      guestClipboardAdded: usage.cb,
      guestSnippetAdded: usage.sn,
      incrementClipboardAdded,
      incrementSnippetAdded,
      authGateOpen,
      authGateReason,
      openAuthGate,
      closeAuthGate,
    }),
    [
      guestId,
      usage,
      incrementClipboardAdded,
      incrementSnippetAdded,
      authGateOpen,
      authGateReason,
      openAuthGate,
      closeAuthGate,
    ],
  );

  return (
    <GuestContext.Provider value={value}>{children}</GuestContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useGuest(): GuestContextValue {
  const ctx = useContext(GuestContext);
  if (!ctx) throw new Error("useGuest must be used inside <GuestProvider>");
  return ctx;
}

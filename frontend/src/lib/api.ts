const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(
  /\/$/,
  "",
);

function toApiUrl(url: string): string {
  if (/^https?:\/\//.test(url)) return url;
  return `${API_BASE_URL}${url}`;
}

let _accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  _accessToken = token;
}

export function getAccessToken(): string | null {
  return _accessToken;
}

// ── Core fetcher ───────────────────────────────────────────────────────────────

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch(toApiUrl("/api/auth/refresh"), {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) {
      _accessToken = null;
      return null;
    }
    const data = await res.json();
    _accessToken = data.accessToken ?? null;
    return _accessToken;
  } catch {
    _accessToken = null;
    return null;
  }
}

export async function apiFetch<T = unknown>(
  url: string,
  options: FetchOptions = {},
): Promise<T> {
  const { skipAuth = false, headers: extraHeaders = {}, ...rest } = options;

  const buildHeaders = (token: string | null) => ({
    "Content-Type": "application/json",
    ...(!skipAuth && token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extraHeaders as Record<string, string>),
  });

  let res = await fetch(toApiUrl(url), {
    ...rest,
    credentials: "include",
    headers: buildHeaders(_accessToken),
  });

  // Silent refresh on 401
  if (res.status === 401 && !skipAuth) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      res = await fetch(toApiUrl(url), {
        ...rest,
        credentials: "include",
        headers: buildHeaders(newToken),
      });
    }
  }

  if (!res.ok) {
    let errorBody: { message?: string; code?: string } = {};
    try {
      errorBody = await res.json();
    } catch {
      // ignore parse failure
    }
    const err = new ApiError(
      errorBody.message ?? `HTTP ${res.status}`,
      res.status,
      errorBody.code,
    );
    throw err;
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

// ── ApiError ───────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ── Convenience helpers ────────────────────────────────────────────────────────

export const api = {
  get: <T>(url: string, opts?: FetchOptions) =>
    apiFetch<T>(url, { method: "GET", ...opts }),

  post: <T>(url: string, body?: unknown, opts?: FetchOptions) =>
    apiFetch<T>(url, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...opts,
    }),

  put: <T>(url: string, body?: unknown, opts?: FetchOptions) =>
    apiFetch<T>(url, {
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...opts,
    }),

  delete: <T>(url: string, opts?: FetchOptions) =>
    apiFetch<T>(url, { method: "DELETE", ...opts }),
};

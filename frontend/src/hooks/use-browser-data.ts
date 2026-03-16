import { useState, useCallback, useEffect } from "react";

export interface StorageItem {
  key: string;
  value: string;
}

export interface CookieItem {
  name: string;
  value: string;
  path?: string;
  domain?: string;
  expires?: string;
}

export interface BrowserInfo {
  userAgent: string;
  platform: string;
  language: string;
  languages: string[];
  cookieEnabled: boolean;
  onLine: boolean;
  screenWidth: number;
  screenHeight: number;
  windowWidth: number;
  windowHeight: number;
  devicePixelRatio: number;
  colorDepth: number;
  maxTouchPoints: number;
  vendor: string;
  hardwareConcurrency: number;
  deviceMemory: number | null;
  connection: {
    effectiveType: string;
    downlink: number;
    rtt: number;
  } | null;
}

function getStorageItems(storage: Storage): StorageItem[] {
  const items: StorageItem[] = [];
  try {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key) {
        items.push({ key, value: storage.getItem(key) || "" });
      }
    }
  } catch (e) {
    console.error("Storage access error:", e);
  }
  return items.sort((a, b) => a.key.localeCompare(b.key));
}

function parseCookies(): CookieItem[] {
  try {
    if (!document.cookie) return [];
    return document.cookie
      .split(";")
      .map((c) => {
        const [name, ...rest] = c.trim().split("=");
        return { name: name.trim(), value: decodeURIComponent(rest.join("=")) };
      })
      .filter((c) => c.name);
  } catch {
    return [];
  }
}

function getBrowserInfo(): BrowserInfo {
  const nav = navigator as any;
  const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform || "Unknown",
    language: navigator.language,
    languages: [...(navigator.languages || [])],
    cookieEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine,
    screenWidth: screen.width,
    screenHeight: screen.height,
    windowWidth: window.innerWidth,
    windowHeight: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio,
    colorDepth: screen.colorDepth,
    maxTouchPoints: navigator.maxTouchPoints || 0,
    vendor: navigator.vendor || "Unknown",
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    deviceMemory: nav.deviceMemory || null,
    connection:
      conn ?
        {
          effectiveType: conn.effectiveType || "unknown",
          downlink: conn.downlink || 0,
          rtt: conn.rtt || 0,
        }
      : null,
  };
}

export function useBrowserData() {
  const [localStorageItems, setLocalStorageItems] = useState<StorageItem[]>(
    () => getStorageItems(localStorage),
  );
  const [sessionStorageItems, setSessionStorageItems] = useState<StorageItem[]>(
    () => getStorageItems(sessionStorage),
  );
  const [cookies, setCookies] = useState<CookieItem[]>(() => parseCookies());
  const [browserInfo, setBrowserInfo] = useState<BrowserInfo>(() =>
    getBrowserInfo(),
  );

  const refresh = useCallback(() => {
    setLocalStorageItems(getStorageItems(localStorage));
    setSessionStorageItems(getStorageItems(sessionStorage));
    setCookies(parseCookies());
    setBrowserInfo(getBrowserInfo());
  }, []);

  // Auto-refresh on window resize and online/offline
  useEffect(() => {
    const handleResize = () => setBrowserInfo(getBrowserInfo());
    const handleStorage = () => refresh();
    window.addEventListener("resize", handleResize);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("online", handleResize);
    window.addEventListener("offline", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("online", handleResize);
      window.removeEventListener("offline", handleResize);
    };
  }, [refresh]);

  const setStorageValue = useCallback(
    (storage: "local" | "session", key: string, value: string) => {
      const s = storage === "local" ? localStorage : sessionStorage;
      s.setItem(key, value);
      refresh();
    },
    [refresh],
  );

  const deleteStorageItem = useCallback(
    (storage: "local" | "session", key: string) => {
      const s = storage === "local" ? localStorage : sessionStorage;
      s.removeItem(key);
      refresh();
    },
    [refresh],
  );

  const deleteCookie = useCallback(
    (name: string) => {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      refresh();
    },
    [refresh],
  );

  const exportData = useCallback(
    (
      type: "localStorage" | "sessionStorage" | "cookies" | "sharedStorage",
      format: "json" | "csv" | "txt",
    ) => {
      let data: any[];
      if (type === "localStorage") data = localStorageItems;
      else if (type === "sessionStorage") data = sessionStorageItems;
      else if (type === "cookies") data = cookies;
      else data = [];

      if (data.length === 0) return;

      let content: string;
      let mime: string;
      if (format === "json") {
        content = JSON.stringify(data, null, 2);
        mime = "application/json";
      } else if (format === "csv") {
        const headers = Object.keys(data[0] || {}).join(",");
        const rows = data.map((d) =>
          Object.values(d)
            .map((v) => `"${String(v).replace(/"/g, '""')}"`)
            .join(","),
        );
        content = [headers, ...rows].join("\n");
        mime = "text/csv";
      } else {
        content = data
          .map((d) =>
            Object.entries(d)
              .map(([k, v]) => `${k}: ${v}`)
              .join("\n"),
          )
          .join("\n\n");
        mime = "text/plain";
      }

      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [localStorageItems, sessionStorageItems, cookies],
  );

  return {
    localStorageItems,
    sessionStorageItems,
    cookies,
    browserInfo,
    refresh,
    setStorageValue,
    deleteStorageItem,
    deleteCookie,
    exportData,
  };
}

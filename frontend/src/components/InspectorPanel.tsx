import {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useDeferredValue,
} from "react";
import { StorageItem, CookieItem, BrowserInfo } from "@/hooks/use-browser-data";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Trash2,
  Edit2,
  Check,
  X,
  RefreshCw,
  Download,
  HardDrive,
  Database,
  Cookie,
  Monitor,
  Wifi,
  WifiOff,
  Cpu,
  Globe,
  Smartphone,
  Languages,
  ChevronRight,
  Plus,
  Loader2,
  Settings,
} from "lucide-react";

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  localStorageItems: StorageItem[];
  sessionStorageItems: StorageItem[];
  sharedStorageItems?: StorageItem[];
  cookies: CookieItem[];
  browserInfo: BrowserInfo;
  onRefresh: () => void;
  onSetStorage: (type: "local" | "session", key: string, value: string) => void;
  onDeleteStorage: (type: "local" | "session", key: string) => void;
  onDeleteCookie: (name: string) => void;
  onExport: (
    type: "localStorage" | "sessionStorage" | "cookies" | "sharedStorage",
    format: "json" | "csv" | "txt",
  ) => void;
}

// ── JSON Preview ───────────────────────────────────────────────────────────────

function JsonPreview({ value }: { value: string }) {
  const [expanded, setExpanded] = useState(false);

  let parsed: unknown = null;
  let isJson = false;
  try {
    parsed = JSON.parse(value);
    isJson = typeof parsed === "object" && parsed !== null;
  } catch {
    /* not JSON */
  }

  if (!isJson) {
    return (
      <p className="mt-0.5 font-mono text-muted-foreground break-all line-clamp-2 text-[11px]">
        {value}
      </p>
    );
  }

  return (
    <div>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="mt-0.5 flex items-center gap-1 text-[10px] text-primary hover:opacity-80"
      >
        <ChevronRight
          className={`h-3 w-3 transition-transform ${expanded ? "rotate-90" : ""}`}
        />
        {expanded ? "Collapse JSON" : "Preview JSON"}
      </button>
      {expanded ?
        <pre className="mt-1 max-h-40 overflow-auto rounded bg-muted p-2 text-[10px] font-mono text-foreground/80 leading-relaxed">
          {JSON.stringify(parsed, null, 2)}
        </pre>
      : <p className="mt-0.5 font-mono text-muted-foreground break-all line-clamp-1 text-[10px]">
          {value}
        </p>
      }
    </div>
  );
}

// ── Add Entry Row ──────────────────────────────────────────────────────────────

function AddEntryRow({
  type,
  onAdd,
}: {
  type: "local" | "session";
  onAdd: (type: "local" | "session", key: string, value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");

  if (!open) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="h-7 gap-1 text-[10px]"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-3 w-3" /> Add entry
      </Button>
    );
  }

  return (
    <div className="flex gap-1 items-center flex-wrap">
      <Input
        value={key}
        onChange={(e) => setKey(e.target.value)}
        placeholder="Key"
        className="h-7 text-xs w-28 shrink-0"
      />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Value"
        className="h-7 text-xs flex-1 min-w-0"
      />
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 shrink-0"
        disabled={!key}
        onClick={() => {
          if (!key) return;
          onAdd(type, key, value);
          setKey("");
          setValue("");
          setOpen(false);
        }}
      >
        <Check className="h-3 w-3" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 shrink-0"
        onClick={() => setOpen(false)}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

// ── Storage Table ──────────────────────────────────────────────────────────────

function StorageTable({
  items,
  type,
  search,
  onSet,
  onDel,
}: {
  items: StorageItem[];
  type: "local" | "session" | "shared";
  search: string;
  onSet: (type: "local" | "session", key: string, value: string) => void;
  onDel: (type: "local" | "session", key: string) => void;
}) {
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");

  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(
      (i) =>
        i.key.toLowerCase().includes(q) || i.value.toLowerCase().includes(q),
    );
  }, [items, search]);

  return (
    <div className="space-y-1.5">
      {filtered.length === 0 ?
        <p className="py-8 text-center text-xs text-muted-foreground">
          No entries found
        </p>
      : filtered.map((item) => (
          <div
            key={item.key}
            className="flex items-start gap-2 rounded-md border bg-card p-2.5 text-xs animate-fade-in"
          >
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground truncate">
                {item.key}
              </p>

              {editKey === item.key ?
                <div className="mt-1 flex gap-1">
                  <Input
                    value={editVal}
                    onChange={(e) => setEditVal(e.target.value)}
                    className="h-7 text-xs font-mono flex-1"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 shrink-0"
                    onClick={() => {
                      onSet(type as "local" | "session", item.key, editVal);
                      setEditKey(null);
                    }}
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 shrink-0"
                    onClick={() => setEditKey(null)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              : <JsonPreview value={item.value} />}
            </div>

            {type !== "shared" && (
              <div className="flex gap-0.5 shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => {
                    setEditVal(item.value);
                    setEditKey(item.key);
                  }}
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => onDel(type as "local" | "session", item.key)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        ))
      }
    </div>
  );
}

// ── Browser Info Panel ─────────────────────────────────────────────────────────

function BrowserInfoPanel({ info }: { info: BrowserInfo }) {
  const getBrowserName = (ua: string) => {
    if (ua.includes("OPR") || ua.includes("Opera")) return "Opera";
    if (ua.includes("Edg")) return "Edge";
    if (ua.includes("Chrome")) return "Chrome";
    if (ua.includes("Firefox")) return "Firefox";
    if (ua.includes("Safari")) return "Safari";
    return "Unknown";
  };

  const getOSName = (ua: string) => {
    const uaPlatform = info.userAgentData?.platform?.toLowerCase();
    const uaPlatformVersion = info.userAgentData?.platformVersion;

    if (uaPlatform === "android") {
      if (uaPlatformVersion) {
        const major = uaPlatformVersion.split(".")[0];
        return major ? `Android ${major}` : "Android";
      }
      return "Android";
    }

    if (ua.includes("Android")) {
      const match = ua.match(/Android\s([\d.]+)/);
      return match?.[1] ? `Android ${match[1]}` : "Android";
    }
    if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
    if (ua.includes("Windows")) return "Windows";
    if (ua.includes("Mac")) return "macOS";
    if (ua.includes("Linux")) return "Linux";
    if (info.userAgentData?.platform) return info.userAgentData.platform;
    return info.platform;
  };

  const browser = getBrowserName(info.userAgent);
  const os = getOSName(info.userAgent);
  const isMobileDevice =
    info.userAgentData?.mobile === true ||
    info.maxTouchPoints > 0 ||
    /Android|iPhone|iPad/i.test(info.userAgent);

  const rows = [
    { icon: Globe, label: "Browser", value: browser },
    {
      icon: isMobileDevice ? Smartphone : Monitor,
      label: "OS / Platform",
      value: os,
    },
    {
      icon: Monitor,
      label: "Screen",
      value: `${info.screenWidth}×${info.screenHeight}`,
    },
    {
      icon: Monitor,
      label: "Viewport",
      value: `${info.windowWidth}×${info.windowHeight}`,
    },
    { icon: Monitor, label: "Pixel Ratio", value: `${info.devicePixelRatio}x` },
    { icon: Cpu, label: "CPU Cores", value: info.hardwareConcurrency || "N/A" },
    ...(info.deviceMemory ?
      [{ icon: Cpu, label: "Device Memory", value: `${info.deviceMemory} GB` }]
    : []),
    { icon: Languages, label: "Language", value: info.language },
    { icon: Monitor, label: "Color Depth", value: `${info.colorDepth}-bit` },
    { icon: Smartphone, label: "Touch Points", value: info.maxTouchPoints },
    {
      icon: info.onLine ? Wifi : WifiOff,
      label: "Status",
      value: info.onLine ? "Online" : "Offline",
    },
    {
      icon: Cookie,
      label: "Cookies",
      value: info.cookieEnabled ? "Enabled" : "Disabled",
    },
  ];

  return (
    <div className="space-y-1.5">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-center gap-2 rounded-md border bg-card p-2.5 text-xs animate-fade-in"
        >
          <row.icon className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-muted-foreground">{row.label}</span>
          <span className="ml-auto font-medium text-foreground truncate max-w-[60%] text-right">
            {String(row.value)}
          </span>
        </div>
      ))}
      {info.connection && (
        <>
          <div className="flex items-center gap-2 rounded-md border bg-card p-2.5 text-xs">
            <Wifi className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-muted-foreground">Network (estimate)</span>
            <span className="ml-auto font-medium text-foreground">
              {info.connection.effectiveType}
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-md border bg-card p-2.5 text-xs">
            <Wifi className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-muted-foreground">Transport</span>
            <span className="ml-auto font-medium text-foreground">
              {info.connection.transportType || "unknown"}
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-md border bg-card p-2.5 text-xs">
            <Wifi className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-muted-foreground">Downlink</span>
            <span className="ml-auto font-medium text-foreground">
              {info.connection.downlink} Mbps
            </span>
          </div>
        </>
      )}
      <div className="rounded-md border bg-card p-2.5">
        <p className="text-[10px] text-muted-foreground mb-1">User Agent</p>
        <p className="font-mono text-[10px] text-foreground/70 break-all leading-relaxed">
          {info.userAgent}
        </p>
      </div>
      <p className="text-[10px] text-muted-foreground px-1">
        Network and OS details are browser-reported hints. Wi-Fi SSID/name and
        exact transport are often hidden by browser privacy rules.
      </p>
    </div>
  );
}

// ── IndexedDB Panel ────────────────────────────────────────────────────────────

function IndexedDBPanel() {
  const [dbs, setDbs] = useState<{ name: string; version: number }[]>([]);
  const [selectedDb, setSelectedDb] = useState<string | null>(null);
  const [stores, setStores] = useState<string[]>([]);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [records, setRecords] = useState<{ key: unknown; value: unknown }[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!("indexedDB" in window)) return;
    if (typeof indexedDB.databases !== "function") {
      setError(
        "indexedDB.databases() not supported in this browser (use Chrome/Edge)",
      );
      return;
    }
    indexedDB
      .databases()
      .then((list) =>
        setDbs(
          list
            .filter((d) => d.name)
            .map((d) => ({ name: d.name!, version: d.version! })),
        ),
      )
      .catch(() => setError("Could not list databases"));
  }, []);

  const openIDB = useCallback(
    (dbName: string): Promise<IDBDatabase> =>
      new Promise((resolve, reject) => {
        const req = indexedDB.open(dbName);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
    [],
  );

  const handleSelectDb = useCallback(
    async (name: string) => {
      setLoading(true);
      setSelectedDb(name);
      setSelectedStore(null);
      setRecords([]);
      setError(null);
      try {
        const db = await openIDB(name);
        setStores(Array.from(db.objectStoreNames));
        db.close();
      } catch {
        setError("Could not open database");
      } finally {
        setLoading(false);
      }
    },
    [openIDB],
  );

  const handleSelectStore = useCallback(
    async (dbName: string, storeName: string) => {
      setLoading(true);
      setSelectedStore(storeName);
      setError(null);
      try {
        const db = await openIDB(dbName);
        const recs: { key: unknown; value: unknown }[] = [];
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(storeName, "readonly");
          const store = tx.objectStore(storeName);
          const req = store.openCursor();
          req.onsuccess = (e) => {
            const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
            if (cursor) {
              if (recs.length < 300)
                recs.push({ key: cursor.key, value: cursor.value });
              cursor.continue();
            } else {
              resolve();
            }
          };
          req.onerror = () => reject(req.error);
        });
        setRecords(recs);
        db.close();
      } catch {
        setError("Could not read store");
      } finally {
        setLoading(false);
      }
    },
    [openIDB],
  );

  const deleteRecord = useCallback(
    async (key: unknown) => {
      if (!selectedDb || !selectedStore) return;
      try {
        const db = await openIDB(selectedDb);
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(selectedStore, "readwrite");
          const req = tx.objectStore(selectedStore).delete(key as IDBValidKey);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
        db.close();
        handleSelectStore(selectedDb, selectedStore);
      } catch {
        setError("Could not delete record");
      }
    },
    [selectedDb, selectedStore, openIDB, handleSelectStore],
  );

  if (!("indexedDB" in window)) {
    return (
      <p className="py-8 text-center text-xs text-muted-foreground">
        IndexedDB not supported
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {/* Breadcrumb */}
      {(selectedDb || selectedStore) && (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground flex-wrap pb-1 border-b">
          <button
            className="hover:text-foreground"
            onClick={() => {
              setSelectedDb(null);
              setSelectedStore(null);
              setStores([]);
              setRecords([]);
            }}
          >
            Databases
          </button>
          {selectedDb && (
            <>
              <ChevronRight className="h-3 w-3" />
              <button
                className="hover:text-foreground"
                onClick={() => {
                  setSelectedStore(null);
                  setRecords([]);
                }}
              >
                {selectedDb}
              </button>
            </>
          )}
          {selectedStore && (
            <>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground font-medium">
                {selectedStore}
              </span>
            </>
          )}
        </div>
      )}

      {error && <p className="text-[10px] text-destructive">{error}</p>}

      {loading && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground py-2">
          <Loader2 className="h-3 w-3 animate-spin" /> Loading…
        </div>
      )}

      {/* Database list */}
      {!selectedDb &&
        !loading &&
        (dbs.length === 0 ?
          <p className="py-8 text-center text-xs text-muted-foreground">
            No IndexedDB databases found
          </p>
        : dbs.map((db) => (
            <button
              key={db.name}
              onClick={() => handleSelectDb(db.name)}
              className="w-full flex items-center gap-2 rounded-md border bg-card p-2.5 text-xs hover:bg-accent text-left"
            >
              <Database className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="flex-1 font-medium">{db.name}</span>
              <Badge variant="outline" className="text-[10px] h-4 shrink-0">
                v{db.version}
              </Badge>
              <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
            </button>
          )))}

      {/* Object store list */}
      {selectedDb &&
        !selectedStore &&
        !loading &&
        (stores.length === 0 ?
          <p className="py-8 text-center text-xs text-muted-foreground">
            No object stores
          </p>
        : stores.map((store) => (
            <button
              key={store}
              onClick={() => handleSelectStore(selectedDb, store)}
              className="w-full flex items-center gap-2 rounded-md border bg-card p-2.5 text-xs hover:bg-accent text-left"
            >
              <HardDrive className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="flex-1 font-medium">{store}</span>
              <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
            </button>
          )))}

      {/* Records */}
      {selectedStore &&
        !loading &&
        (records.length === 0 ?
          <p className="py-8 text-center text-xs text-muted-foreground">
            No records found
          </p>
        : <>
            {records.length === 300 && (
              <p className="text-[10px] text-muted-foreground">
                Showing first 300 records
              </p>
            )}
            {records.map((rec, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded-md border bg-card p-2.5 text-xs"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold font-mono text-muted-foreground truncate">
                    {String(rec.key)}
                  </p>
                  <JsonPreview
                    value={
                      typeof rec.value === "string" ?
                        rec.value
                      : JSON.stringify(rec.value)
                    }
                  />
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                  onClick={() => deleteRecord(rec.key)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </>)}
    </div>
  );
}

// ── Cache Storage Panel ────────────────────────────────────────────────────────

function CacheStoragePanel() {
  const [cacheNames, setCacheNames] = useState<string[]>([]);
  const [selectedCache, setSelectedCache] = useState<string | null>(null);
  const [entries, setEntries] = useState<
    { url: string; method: string; status: number; contentType: string }[]
  >([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!("caches" in window)) return;
    caches
      .keys()
      .then(setCacheNames)
      .catch(() => {});
  }, []);

  const openCache = useCallback(async (name: string) => {
    setLoading(true);
    setSelectedCache(name);
    try {
      const cache = await caches.open(name);
      const keys = await cache.keys();
      const items = await Promise.all(
        keys.slice(0, 200).map(async (req) => {
          const res = await cache.match(req);
          return {
            url: req.url,
            method: req.method,
            status: res?.status ?? 0,
            contentType: res?.headers.get("content-type") ?? "unknown",
          };
        }),
      );
      setEntries(items);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteEntry = useCallback(
    async (cacheName: string, url: string) => {
      try {
        const cache = await caches.open(cacheName);
        await cache.delete(url);
        openCache(cacheName);
      } catch {
        /* ignore */
      }
    },
    [openCache],
  );

  const deleteWholeCache = useCallback(
    async (name: string) => {
      try {
        await caches.delete(name);
        setCacheNames((prev) => prev.filter((n) => n !== name));
        if (selectedCache === name) {
          setSelectedCache(null);
          setEntries([]);
        }
      } catch {
        /* ignore */
      }
    },
    [selectedCache],
  );

  if (!("caches" in window)) {
    return (
      <p className="py-8 text-center text-xs text-muted-foreground">
        Cache Storage not supported
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {/* Breadcrumb */}
      {selectedCache && (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground pb-1 border-b">
          <button
            className="hover:text-foreground"
            onClick={() => {
              setSelectedCache(null);
              setEntries([]);
            }}
          >
            Caches
          </button>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium">{selectedCache}</span>
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground py-2">
          <Loader2 className="h-3 w-3 animate-spin" /> Loading…
        </div>
      )}

      {/* Cache list */}
      {!selectedCache &&
        !loading &&
        (cacheNames.length === 0 ?
          <p className="py-8 text-center text-xs text-muted-foreground">
            No caches found
          </p>
        : cacheNames.map((name) => (
            <div
              key={name}
              className="flex items-center gap-2 rounded-md border bg-card p-2.5 text-xs"
            >
              <button
                onClick={() => openCache(name)}
                className="flex flex-1 items-center gap-2 text-left hover:opacity-80 min-w-0"
              >
                <HardDrive className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="flex-1 font-medium truncate">{name}</span>
                <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
              </button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                title="Delete cache"
                onClick={() => deleteWholeCache(name)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )))}

      {/* Entries */}
      {selectedCache &&
        !loading &&
        (entries.length === 0 ?
          <p className="py-8 text-center text-xs text-muted-foreground">
            No cached entries
          </p>
        : entries.map((entry, i) => (
            <div
              key={i}
              className="flex items-start gap-2 rounded-md border bg-card p-2.5 text-xs"
            >
              <div className="flex-1 min-w-0">
                <p className="font-mono text-[10px] text-foreground truncate">
                  {entry.url}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-[10px] h-4">
                    {entry.method}
                  </Badge>
                  <Badge
                    variant={
                      entry.status >= 200 && entry.status < 300 ?
                        "default"
                      : "destructive"
                    }
                    className="text-[10px] h-4"
                  >
                    {entry.status}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {entry.contentType}
                  </span>
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                onClick={() => deleteEntry(selectedCache, entry.url)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )))}
    </div>
  );
}

// ── Service Workers Panel ──────────────────────────────────────────────────────

function ServiceWorkersPanel() {
  const [registrations, setRegistrations] = useState<
    { scope: string; scriptURL: string; state: string }[]
  >([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!("serviceWorker" in navigator)) return;
    setLoading(true);
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      setRegistrations(
        regs.map((r) => ({
          scope: r.scope,
          scriptURL:
            (r.active || r.waiting || r.installing)?.scriptURL ?? "unknown",
          state:
            r.active ? "active"
            : r.waiting ? "waiting"
            : r.installing ? "installing"
            : "unknown",
        })),
      );
    } catch {
      setRegistrations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const unregister = useCallback(
    async (scope: string) => {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        const reg = regs.find((r) => r.scope === scope);
        if (reg) {
          await reg.unregister();
          load();
        }
      } catch {
        /* ignore */
      }
    },
    [load],
  );

  if (!("serviceWorker" in navigator)) {
    return (
      <p className="py-8 text-center text-xs text-muted-foreground">
        Service Workers not supported
      </p>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground py-2">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading…
      </div>
    );
  }

  if (registrations.length === 0) {
    return (
      <p className="py-8 text-center text-xs text-muted-foreground">
        No service workers registered
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      {registrations.map((reg) => (
        <div
          key={reg.scope}
          className="flex items-start gap-2 rounded-md border bg-card p-2.5 text-xs"
        >
          <Settings className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{reg.scope}</p>
            <p className="font-mono text-[10px] text-muted-foreground truncate mt-0.5">
              {reg.scriptURL}
            </p>
            <Badge
              variant={reg.state === "active" ? "default" : "secondary"}
              className="mt-1 text-[10px] h-4"
            >
              {reg.state}
            </Badge>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
            title="Unregister"
            onClick={() => unregister(reg.scope)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}

// ── Main Panel ─────────────────────────────────────────────────────────────────

export function InspectorPanel({
  localStorageItems,
  sessionStorageItems,
  sharedStorageItems = [],
  cookies,
  browserInfo,
  onRefresh,
  onSetStorage,
  onDeleteStorage,
  onDeleteCookie,
  onExport,
}: Props) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b p-3">
        <Database className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Browser Inspector</h2>
        <Badge variant="secondary" className="ml-1 h-5 text-[10px]">
          {localStorageItems.length +
            sessionStorageItems.length +
            cookies.length +
            sharedStorageItems.length}{" "}
          items
        </Badge>
        <Button
          size="icon"
          variant="ghost"
          className="ml-auto h-7 w-7"
          onClick={onRefresh}
          title="Refresh"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Search */}
      <div className="border-b p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search keys & values…"
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        defaultValue="browser"
        className="flex-1 flex flex-col overflow-hidden"
      >
        {/* Horizontally scrollable tab bar */}
        <div className="overflow-x-auto scrollbar-none px-3 mt-2 shrink-0">
          <TabsList className="inline-flex h-8 w-max gap-0.5">
            <TabsTrigger value="browser" className="gap-1 text-xs h-6 px-2">
              <Monitor className="h-3 w-3" />
              <span>Device</span>
            </TabsTrigger>

            <TabsTrigger value="local" className="gap-1 text-xs h-6 px-2">
              <HardDrive className="h-3 w-3" />
              <span>Local</span>
              <span className="rounded-full bg-muted px-1 text-[10px]">
                {localStorageItems.length}
              </span>
            </TabsTrigger>

            <TabsTrigger value="session" className="gap-1 text-xs h-6 px-2">
              <Database className="h-3 w-3" />
              <span>Session</span>
              <span className="rounded-full bg-muted px-1 text-[10px]">
                {sessionStorageItems.length}
              </span>
            </TabsTrigger>

            <TabsTrigger value="cookies" className="gap-1 text-xs h-6 px-2">
              <Cookie className="h-3 w-3" />
              <span>Cookies</span>
              <span className="rounded-full bg-muted px-1 text-[10px]">
                {cookies.length}
              </span>
            </TabsTrigger>

            <TabsTrigger
              value="sharedStorage"
              className="gap-1 text-xs h-6 px-2"
            >
              <Database className="h-3 w-3" />
              <span>Shared</span>
              <span className="rounded-full bg-muted px-1 text-[10px]">
                {sharedStorageItems.length}
              </span>
            </TabsTrigger>

            <TabsTrigger value="indexeddb" className="gap-1 text-xs h-6 px-2">
              <Database className="h-3 w-3" />
              <span>IDB</span>
            </TabsTrigger>

            <TabsTrigger value="cache" className="gap-1 text-xs h-6 px-2">
              <HardDrive className="h-3 w-3" />
              <span>Cache</span>
            </TabsTrigger>

            <TabsTrigger value="sw" className="gap-1 text-xs h-6 px-2">
              <Settings className="h-3 w-3" />
              <span>Workers</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Device */}
        <TabsContent
          value="browser"
          className="flex-1 overflow-y-auto px-3 pb-3 mt-2"
        >
          <BrowserInfoPanel info={browserInfo} />
        </TabsContent>

        {/* Local Storage */}
        <TabsContent
          value="local"
          className="flex-1 overflow-y-auto px-3 pb-3 mt-2"
        >
          <div className="mb-2 flex flex-wrap items-center gap-1">
            <AddEntryRow type="local" onAdd={onSetStorage} />
            <div className="ml-auto flex gap-1">
              {(["json", "csv", "txt"] as const).map((f) => (
                <Button
                  key={f}
                  size="sm"
                  variant="ghost"
                  className="h-6 gap-1 text-[10px]"
                  onClick={() => onExport("localStorage", f)}
                >
                  <Download className="h-2.5 w-2.5" /> {f.toUpperCase()}
                </Button>
              ))}
            </div>
          </div>
          <StorageTable
            items={localStorageItems}
            type="local"
            search={deferredSearch}
            onSet={onSetStorage}
            onDel={onDeleteStorage}
          />
        </TabsContent>

        {/* Session Storage */}
        <TabsContent
          value="session"
          className="flex-1 overflow-y-auto px-3 pb-3 mt-2"
        >
          <div className="mb-2 flex flex-wrap items-center gap-1">
            <AddEntryRow type="session" onAdd={onSetStorage} />
            <div className="ml-auto flex gap-1">
              {(["json", "csv", "txt"] as const).map((f) => (
                <Button
                  key={f}
                  size="sm"
                  variant="ghost"
                  className="h-6 gap-1 text-[10px]"
                  onClick={() => onExport("sessionStorage", f)}
                >
                  <Download className="h-2.5 w-2.5" /> {f.toUpperCase()}
                </Button>
              ))}
            </div>
          </div>
          <StorageTable
            items={sessionStorageItems}
            type="session"
            search={deferredSearch}
            onSet={onSetStorage}
            onDel={onDeleteStorage}
          />
        </TabsContent>

        {/* Cookies */}
        <TabsContent
          value="cookies"
          className="flex-1 overflow-y-auto px-3 pb-3 mt-2"
        >
          <div className="mb-2 flex gap-1 justify-end">
            {(["json", "csv", "txt"] as const).map((f) => (
              <Button
                key={f}
                size="sm"
                variant="ghost"
                className="h-6 gap-1 text-[10px]"
                onClick={() => onExport("cookies", f)}
              >
                <Download className="h-2.5 w-2.5" /> {f.toUpperCase()}
              </Button>
            ))}
          </div>
          <div className="space-y-1.5">
            {cookies.length === 0 ?
              <p className="py-8 text-center text-xs text-muted-foreground">
                No cookies found for this domain
              </p>
            : cookies
                .filter(
                  (c) =>
                    !deferredSearch ||
                    c.name
                      .toLowerCase()
                      .includes(deferredSearch.toLowerCase()) ||
                    c.value
                      .toLowerCase()
                      .includes(deferredSearch.toLowerCase()),
                )
                .map((c) => (
                  <div
                    key={c.name}
                    className="flex items-start gap-2 rounded-md border bg-card p-2.5 text-xs animate-fade-in"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground">{c.name}</p>
                      <p className="mt-0.5 font-mono text-muted-foreground break-all line-clamp-2">
                        {c.value}
                      </p>
                      {/* Cookie metadata */}
                      {(c.path || c.domain || c.expires) && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {c.path && (
                            <Badge
                              variant="outline"
                              className="text-[10px] h-4"
                            >
                              path: {c.path}
                            </Badge>
                          )}
                          {c.domain && (
                            <Badge
                              variant="outline"
                              className="text-[10px] h-4"
                            >
                              {c.domain}
                            </Badge>
                          )}
                          {c.expires && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] h-4"
                            >
                              exp: {c.expires}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                      onClick={() => onDeleteCookie(c.name)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))
            }
          </div>
        </TabsContent>

        {/* Shared Storage — fixed: value was "shared", now matches trigger "sharedStorage" */}
        <TabsContent
          value="sharedStorage"
          className="flex-1 overflow-y-auto px-3 pb-3 mt-2"
        >
          <div className="mb-2 flex gap-1 justify-end">
            {(["json", "csv", "txt"] as const).map((f) => (
              <Button
                key={f}
                size="sm"
                variant="ghost"
                className="h-6 gap-1 text-[10px]"
                onClick={() => onExport("sharedStorage", f)}
              >
                <Download className="h-2.5 w-2.5" /> {f.toUpperCase()}
              </Button>
            ))}
          </div>
          {sharedStorageItems.length === 0 ?
            <p className="py-8 text-center text-xs text-muted-foreground">
              Shared Storage is not available in this browser or origin
            </p>
          : <StorageTable
              items={sharedStorageItems}
              type="shared"
              search={deferredSearch}
              onSet={onSetStorage}
              onDel={onDeleteStorage}
            />
          }
        </TabsContent>

        {/* IndexedDB */}
        <TabsContent
          value="indexeddb"
          className="flex-1 overflow-y-auto px-3 pb-3 mt-2"
        >
          <IndexedDBPanel />
        </TabsContent>

        {/* Cache Storage */}
        <TabsContent
          value="cache"
          className="flex-1 overflow-y-auto px-3 pb-3 mt-2"
        >
          <CacheStoragePanel />
        </TabsContent>

        {/* Service Workers */}
        <TabsContent
          value="sw"
          className="flex-1 overflow-y-auto px-3 pb-3 mt-2"
        >
          <ServiceWorkersPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// import { StorageItem, CookieItem, BrowserInfo } from "@/hooks/use-browser-data";
// import { Input } from "@/components/ui/input";
// import { Button } from "@/components/ui/button";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Badge } from "@/components/ui/badge";
// import {
//   Search,
//   Trash2,
//   Edit2,
//   Check,
//   X,
//   RefreshCw,
//   Download,
//   HardDrive,
//   Database,
//   Cookie,
//   Monitor,
//   Wifi,
//   WifiOff,
//   Cpu,
//   Globe,
//   Smartphone,
//   Languages,
// } from "lucide-react";
// interface Props {
//   localStorageItems: StorageItem[];
//   sessionStorageItems: StorageItem[];
//   sharedStorageItems: StorageItem[];
//   cookies: CookieItem[];
//   browserInfo: BrowserInfo;
//   onRefresh: () => void;
//   onSetStorage: (type: "local" | "session", key: string, value: string) => void;
//   onDeleteStorage: (type: "local" | "session", key: string) => void;
//   onDeleteCookie: (name: string) => void;
//   onExport: (
//     type: "localStorage" | "sessionStorage" | "cookies" | "sharedStorage",
//     format: "json" | "csv" | "txt",
//   ) => void;
// }

// function StorageTable({
//   items,
//   type,
//   search,
//   onSet,
//   onDel,
// }: {
//   items: StorageItem[];
//   type: "local" | "session" | "shared";
//   search: string;
//   onSet: (
//     type: "local" | "session" | "shared",
//     key: string,
//     value: string,
//   ) => void;
//   onDel: (type: "local" | "session" | "shared", key: string) => void;
// }) {
//   const [editKey, setEditKey] = useState<string | null>(null);
//   const [editVal, setEditVal] = useState("");

//   const filtered = useMemo(() => {
//     if (!search) return items;
//     const q = search.toLowerCase();
//     return items.filter(
//       (i) =>
//         i.key.toLowerCase().includes(q) || i.value.toLowerCase().includes(q),
//     );
//   }, [items, search]);

//   return (
//     <div className="space-y-1.5">
//       {filtered.length === 0 ?
//         <p className="py-8 text-center text-xs text-muted-foreground">
//           No entries found
//         </p>
//       : filtered.map((item) => (
//           <div
//             key={item.key}
//             className="flex items-start gap-2 rounded-md border bg-card p-2.5 text-xs animate-fade-in"
//           >
//             <div className="min-w-0 flex-1">
//               <p className="font-semibold text-foreground truncate">
//                 {item.key}
//               </p>
//               {editKey === item.key ?
//                 <div className="mt-1 flex gap-1">
//                   <Input
//                     value={editVal}
//                     onChange={(e) => setEditVal(e.target.value)}
//                     className="h-7 text-xs font-mono flex-1"
//                   />
//                   <Button
//                     size="icon"
//                     variant="ghost"
//                     className="h-7 w-7 shrink-0"
//                     onClick={() => {
//                       onSet(type, item.key, editVal);
//                       setEditKey(null);
//                     }}
//                   >
//                     <Check className="h-3 w-3" />
//                   </Button>
//                   <Button
//                     size="icon"
//                     variant="ghost"
//                     className="h-7 w-7 shrink-0"
//                     onClick={() => setEditKey(null)}
//                   >
//                     <X className="h-3 w-3" />
//                   </Button>
//                 </div>
//               : <p className="mt-0.5 font-mono text-muted-foreground break-all line-clamp-2">
//                   {item.value}
//                 </p>
//               }
//             </div>
//             <div className="flex gap-0.5 shrink-0">
//               <Button
//                 size="icon"
//                 variant="ghost"
//                 className="h-7 w-7"
//                 onClick={() => {
//                   setEditVal(item.value);
//                   setEditKey(item.key);
//                 }}
//               >
//                 <Edit2 className="h-3 w-3" />
//               </Button>
//               <Button
//                 size="icon"
//                 variant="ghost"
//                 className="h-7 w-7 text-destructive hover:text-destructive"
//                 onClick={() => onDel(type, item.key)}
//               >
//                 <Trash2 className="h-3 w-3" />
//               </Button>
//             </div>
//           </div>
//         ))
//       }
//     </div>
//   );
// }

// function BrowserInfoPanel({ info }: { info: BrowserInfo }) {
//   // Detect browser name from UA
//   const getBrowserName = (ua: string) => {
//     if (ua.includes("OPR") || ua.includes("Opera")) return "Opera";
//     if (ua.includes("Edg")) return "Edge";
//     if (ua.includes("Chrome")) return "Chrome";
//     if (ua.includes("Firefox")) return "Firefox";
//     if (ua.includes("Safari")) return "Safari";
//     return "Unknown";
//   };

//   const getOSName = (ua: string) => {
//     if (ua.includes("Android")) {
//       const match = ua.match(/Android\s([\d.]+)/);
//       return `Android ${match?.[1] || ""}`;
//     }
//     if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
//     if (ua.includes("Windows")) return "Windows";
//     if (ua.includes("Mac")) return "macOS";
//     if (ua.includes("Linux")) return "Linux";
//     return info.platform;
//   };

//   const browser = getBrowserName(info.userAgent);
//   const os = getOSName(info.userAgent);
//   const isMobileDevice =
//     info.maxTouchPoints > 0 || /Android|iPhone|iPad/i.test(info.userAgent);

//   const rows = [
//     { icon: Globe, label: "Browser", value: browser },
//     {
//       icon: isMobileDevice ? Smartphone : Monitor,
//       label: "OS / Platform",
//       value: os,
//     },
//     {
//       icon: Monitor,
//       label: "Screen",
//       value: `${info.screenWidth}×${info.screenHeight}`,
//     },
//     {
//       icon: Monitor,
//       label: "Viewport",
//       value: `${info.windowWidth}×${info.windowHeight}`,
//     },
//     { icon: Monitor, label: "Pixel Ratio", value: `${info.devicePixelRatio}x` },
//     { icon: Cpu, label: "CPU Cores", value: info.hardwareConcurrency || "N/A" },
//     ...(info.deviceMemory ?
//       [{ icon: Cpu, label: "Device Memory", value: `${info.deviceMemory} GB` }]
//     : []),
//     { icon: Languages, label: "Language", value: info.language },
//     { icon: Monitor, label: "Color Depth", value: `${info.colorDepth}-bit` },
//     { icon: Smartphone, label: "Touch Points", value: info.maxTouchPoints },
//     {
//       icon: info.onLine ? Wifi : WifiOff,
//       label: "Status",
//       value: info.onLine ? "Online" : "Offline",
//     },
//     {
//       icon: Cookie,
//       label: "Cookies",
//       value: info.cookieEnabled ? "Enabled" : "Disabled",
//     },
//   ];

//   return (
//     <div className="space-y-1.5">
//       {rows.map((row) => (
//         <div
//           key={row.label}
//           className="flex items-center gap-2 rounded-md border bg-card p-2.5 text-xs animate-fade-in"
//         >
//           <row.icon className="h-3.5 w-3.5 text-primary shrink-0" />
//           <span className="text-muted-foreground">{row.label}</span>
//           <span className="ml-auto font-medium text-foreground truncate max-w-[60%] text-right">
//             {String(row.value)}
//           </span>
//         </div>
//       ))}
//       {info.connection && (
//         <>
//           <div className="flex items-center gap-2 rounded-md border bg-card p-2.5 text-xs">
//             <Wifi className="h-3.5 w-3.5 text-primary shrink-0" />
//             <span className="text-muted-foreground">Connection</span>
//             <span className="ml-auto font-medium text-foreground">
//               {info.connection.effectiveType}
//             </span>
//           </div>
//           <div className="flex items-center gap-2 rounded-md border bg-card p-2.5 text-xs">
//             <Wifi className="h-3.5 w-3.5 text-primary shrink-0" />
//             <span className="text-muted-foreground">Downlink</span>
//             <span className="ml-auto font-medium text-foreground">
//               {info.connection.downlink} Mbps
//             </span>
//           </div>
//         </>
//       )}
//       {/* Full UA string */}
//       <div className="rounded-md border bg-card p-2.5">
//         <p className="text-[10px] text-muted-foreground mb-1">User Agent</p>
//         <p className="font-mono text-[10px] text-foreground/70 break-all leading-relaxed">
//           {info.userAgent}
//         </p>
//       </div>
//     </div>
//   );
// }

// export function InspectorPanel({
//   localStorageItems,
//   sessionStorageItems,
//   sharedStorageItems,
//   cookies,
//   browserInfo,
//   onRefresh,
//   onSetStorage,
//   onDeleteStorage,
//   onDeleteCookie,
//   onExport,
// }: Props) {
//   const [search, setSearch] = useState("");

//   return (
//     <div className="flex h-full flex-col">
//       <div className="flex items-center gap-2 border-b p-3">
//         <Database className="h-4 w-4 text-primary" />
//         <h2 className="text-sm font-semibold">Browser Inspector</h2>
//         <Badge variant="secondary" className="ml-1 h-5 text-[10px]">
//           {localStorageItems.length +
//             sessionStorageItems.length +
//             cookies.length}
//           {/* sharedStorageItems.length
//             {" "} */}
//           items
//         </Badge>
//         <Button
//           size="icon"
//           variant="ghost"
//           className="ml-auto h-7 w-7"
//           onClick={onRefresh}
//           title="Refresh"
//         >
//           <RefreshCw className="h-3.5 w-3.5" />
//         </Button>
//       </div>

//       <div className="border-b p-3">
//         <div className="relative">
//           <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
//           <Input
//             value={search}
//             onChange={(e) => setSearch(e.target.value)}
//             placeholder="Search keys & values…"
//             className="h-8 pl-8 text-xs"
//           />
//         </div>
//       </div>

//       <Tabs
//         defaultValue="browser"
//         className="flex-1 flex flex-col overflow-hidden"
//       >
//         <TabsList className="mx-3 mt-2 h-8 shrink-0">
//           <TabsTrigger value="browser" className="gap-1 text-xs h-6">
//             <Monitor className="h-3 w-3" /> Device
//           </TabsTrigger>
//           <TabsTrigger value="local" className="gap-1 text-xs h-6">
//             <HardDrive className="h-3 w-3" />
//             <span className="hidden sm:inline">Local</span>
//             <span className="rounded-full bg-muted px-1 text-[10px]">
//               {localStorageItems.length}
//             </span>
//           </TabsTrigger>
//           <TabsTrigger value="session" className="gap-1 text-xs h-6">
//             <Database className="h-3 w-3" />
//             <span className="hidden sm:inline">Session</span>
//             <span className="rounded-full bg-muted px-1 text-[10px]">
//               {sessionStorageItems.length}
//             </span>
//           </TabsTrigger>
//           <TabsTrigger value="cookies" className="gap-1 text-xs h-6">
//             <Cookie className="h-3 w-3" />
//             <span className="rounded-full bg-muted px-1 text-[10px]">
//               {cookies.length}
//             </span>
//           </TabsTrigger>
//           <TabsTrigger value="sharedStorage" className="gap-1 text-xs h-6">
//             <Database className="h-3 w-3" />
//             <span className="rounded-full bg-muted px-1 text-[10px]">
//               {sharedStorageItems.length}
//             </span>
//           </TabsTrigger>
//         </TabsList>

//         <TabsContent
//           value="browser"
//           className="flex-1 overflow-y-auto px-3 pb-3"
//         >
//           <BrowserInfoPanel info={browserInfo} />
//         </TabsContent>

//         <TabsContent value="local" className="flex-1 overflow-y-auto px-3 pb-3">
//           <div className="mb-2 flex gap-1">
//             {(["json", "csv", "txt"] as const).map((f) => (
//               <Button
//                 key={f}
//                 size="sm"
//                 variant="ghost"
//                 className="h-6 gap-1 text-[10px]"
//                 onClick={() => onExport("localStorage", f)}
//               >
//                 <Download className="h-2.5 w-2.5" /> {f.toUpperCase()}
//               </Button>
//             ))}
//           </div>
//           <StorageTable
//             items={localStorageItems}
//             type="local"
//             search={search}
//             onSet={onSetStorage}
//             onDel={onDeleteStorage}
//           />
//         </TabsContent>
//         <TabsContent
//           value="shared"
//           className="flex-1 overflow-y-auto px-3 pb-3"
//         >
//           <div className="mb-2 flex gap-1">
//             {(["json", "csv", "txt"] as const).map((f) => (
//               <Button
//                 key={f}
//                 size="sm"
//                 variant="ghost"
//                 className="h-6 gap-1 text-[10px]"
//                 onClick={() => onExport("sharedStorage", f)}
//               >
//                 <Download className="h-2.5 w-2.5" /> {f.toUpperCase()}
//               </Button>
//             ))}
//           </div>
//           <StorageTable
//             items={sharedStorageItems}
//             type="shared"
//             search={search}
//             onSet={onSetStorage}
//             onDel={onDeleteStorage}
//           />
//         </TabsContent>

//         <TabsContent
//           value="session"
//           className="flex-1 overflow-y-auto px-3 pb-3"
//         >
//           <div className="mb-2 flex gap-1">
//             {(["json", "csv", "txt"] as const).map((f) => (
//               <Button
//                 key={f}
//                 size="sm"
//                 variant="ghost"
//                 className="h-6 gap-1 text-[10px]"
//                 onClick={() => onExport("sessionStorage", f)}
//               >
//                 <Download className="h-2.5 w-2.5" /> {f.toUpperCase()}
//               </Button>
//             ))}
//           </div>
//           <StorageTable
//             items={sessionStorageItems}
//             type="session"
//             search={search}
//             onSet={onSetStorage}
//             onDel={onDeleteStorage}
//           />
//         </TabsContent>

//         <TabsContent
//           value="cookies"
//           className="flex-1 overflow-y-auto px-3 pb-3"
//         >
//           <div className="mb-2 flex gap-1">
//             {(["json", "csv", "txt"] as const).map((f) => (
//               <Button
//                 key={f}
//                 size="sm"
//                 variant="ghost"
//                 className="h-6 gap-1 text-[10px]"
//                 onClick={() => onExport("cookies", f)}
//               >
//                 <Download className="h-2.5 w-2.5" /> {f.toUpperCase()}
//               </Button>
//             ))}
//           </div>
//           <div className="space-y-1.5">
//             {cookies.length === 0 ?
//               <p className="py-8 text-center text-xs text-muted-foreground">
//                 No cookies found for this domain
//               </p>
//             : cookies
//                 .filter(
//                   (c) =>
//                     !search ||
//                     c.name.toLowerCase().includes(search.toLowerCase()),
//                 )
//                 .map((c) => (
//                   <div
//                     key={c.name}
//                     className="flex items-start gap-2 rounded-md border bg-card p-2.5 text-xs animate-fade-in"
//                   >
//                     <div className="min-w-0 flex-1">
//                       <p className="font-semibold text-foreground">{c.name}</p>
//                       <p className="mt-0.5 font-mono text-muted-foreground break-all line-clamp-2">
//                         {c.value}
//                       </p>
//                     </div>
//                     <Button
//                       size="icon"
//                       variant="ghost"
//                       className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
//                       onClick={() => onDeleteCookie(c.name)}
//                     >
//                       <Trash2 className="h-3 w-3" />
//                     </Button>
//                   </div>
//                 ))
//             }
//           </div>
//         </TabsContent>
//       </Tabs>
//     </div>
//   );
// }

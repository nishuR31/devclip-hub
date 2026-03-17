import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useClipboard } from "../hooks/use-clipboard";
import { useSnippets } from "../hooks/use-snippets";
import { useBrowserData } from "@/hooks/use-browser-data";
import { api } from "@/lib/api";
import { ClipboardPanel } from "@/components/ClipboardPanel";
import { SnippetPanel } from "@/components/SnippetPanel";
import { InspectorPanel } from "@/components/InspectorPanel";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Clipboard,
  Code2,
  Database,
  Sun,
  Moon,
  PanelLeftClose,
  PanelRightClose,
  Shield,
  PanelLeft,
  PanelRight,
  Home,
  ArrowLeft,
  User,
  CreditCard,
  LogOut,
  Settings,
  LogIn,
  Zap,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { useGuest } from "@/contexts/GuestContext";

const Index = () => {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const { openAuthGate, guestClipboardAdded, guestSnippetAdded } = useGuest();
  const [darkMode, setDarkMode] = useState(true);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [leftTab, setLeftTab] = useState<"clipboard" | "snippets">("clipboard");
  const [mobileView, setMobileView] = useState<
    "main" | "clipboard" | "snippets" | "inspector"
  >("main");
  const isMobile = useIsMobile();

  const clipboard = useClipboard();
  const snippets = useSnippets();
  const browserData = useBrowserData();
  const [workspaceCapabilities, setWorkspaceCapabilities] = useState<{
    source: "localStorage" | "db+redis";
    canUseTeams: boolean;
  }>({ source: "localStorage", canUseTeams: false });
  const [teamCount, setTeamCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const capabilities = await api.get<{
          source: "localStorage" | "db+redis";
          canUseTeams: boolean;
        }>("/api/workspace/capabilities");
        if (!mounted) return;
        setWorkspaceCapabilities(capabilities);

        if (capabilities.canUseTeams) {
          const team = await api.get<{ count: number }>(
            "/api/workspace/team-members",
          );
          if (!mounted) return;
          setTeamCount(team.count ?? 0);
        }
      } catch {
        // Ignore capability fetch failures (e.g. guest view)
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle("dark", !darkMode);
  };

  const mobileTitle = {
    main: "DevClipboard",
    clipboard: "Clipboard History",
    snippets: "Snippets",
    inspector: "Browser Inspector",
  };

  // Mobile layout
  if (isMobile) {
    return (
      <div className="flex h-[100dvh] flex-col bg-background text-foreground">
        {/* Mobile header */}
        <header className="flex items-center h-12 gap-2 px-3 border-b shrink-0">
          {mobileView !== "main" && (
            <Button
              size="icon"
              variant="ghost"
              className="w-8 h-8 shrink-0"
              onClick={() => setMobileView("main")}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <div className="flex items-center min-w-0 gap-2">
            {mobileView === "main" && (
              <div className="flex items-center justify-center rounded-md h-7 w-7 bg-primary shrink-0">
                <Clipboard className="w-4 h-4 text-primary-foreground" />
              </div>
            )}
            <h1 className="text-sm font-bold tracking-tight truncate">
              {mobileTitle[mobileView]}
            </h1>
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <Button
              size="icon"
              variant="ghost"
              className="w-8 h-8"
              onClick={toggleTheme}
            >
              {darkMode ?
                <Sun className="w-4 h-4" />
              : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </header>

        {/* Mobile content */}
        <div className="flex-1 overflow-y-auto">
          {mobileView === "main" && (
            <div className="p-4 space-y-4">
              <div className="p-6 text-center border rounded-xl bg-card">
                <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 rounded-xl bg-primary/10">
                  <Clipboard className="w-6 h-6 text-primary" />
                </div>
                <h2 className="mb-1.5 text-xl font-bold tracking-tight">
                  DevClipboard Hub
                </h2>
                <p className="text-xs text-muted-foreground">
                  Clipboard manager & browser data inspector
                </p>
                <div className="flex flex-col gap-2 mt-4">
                  <Button
                    onClick={clipboard.readClipboard}
                    className="w-full gap-2"
                  >
                    <Clipboard className="w-4 h-4" /> Read Clipboard
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setMobileView("clipboard")}
                      className="gap-1.5 text-xs"
                    >
                      <Clipboard className="h-3.5 w-3.5" /> History
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setMobileView("snippets")}
                      className="gap-1.5 text-xs"
                    >
                      <Code2 className="h-3.5 w-3.5" /> Snippets
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setMobileView("inspector");
                      browserData.refresh();
                    }}
                    className="w-full gap-2"
                  >
                    <Database className="w-4 h-4" /> Inspect Storage
                  </Button>
                </div>
              </div>

              {clipboard.currentClipboard && (
                <div className="p-4 border rounded-xl bg-card animate-fade-in">
                  <h3 className="mb-2 text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                    Current Clipboard
                  </h3>
                  <pre className="p-3 overflow-y-auto font-mono text-xs break-all whitespace-pre-wrap rounded-lg bg-muted text-foreground/80 max-h-48">
                    {clipboard.currentClipboard}
                  </pre>
                </div>
              )}

              {clipboard.clipboardError && (
                <div className="p-3 border rounded-lg border-warning/30 bg-warning/5">
                  <p className="text-xs text-warning">
                    {clipboard.clipboardError}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    label: "Clipboard",
                    value: clipboard.entries.length,
                    icon: Clipboard,
                    tap: () => setMobileView("clipboard"),
                  },
                  {
                    label: "Snippets",
                    value: snippets.snippets.length,
                    icon: Code2,
                    tap: () => setMobileView("snippets"),
                  },
                  {
                    label: "Storage",
                    value:
                      browserData.localStorageItems.length +
                      browserData.sessionStorageItems.length,
                    icon: Database,
                    tap: () => {
                      setMobileView("inspector");
                      browserData.refresh();
                    },
                  },
                ].map((stat) => (
                  <button
                    key={stat.label}
                    onClick={stat.tap}
                    className="p-3 text-center transition-colors border rounded-lg bg-card hover:border-primary/30 active:bg-muted"
                  >
                    <stat.icon className="mx-auto mb-1.5 h-4 w-4 text-primary" />
                    <p className="text-lg font-bold">{stat.value}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {stat.label}
                    </p>
                  </button>
                ))}
              </div>

              <div className="p-3 text-center border rounded-lg border-primary/20 bg-primary/5">
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  <Shield className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[10px] font-semibold text-primary">
                    {workspaceCapabilities.source === "db+redis" ?
                      "Cloud + Redis Sync"
                    : "Local Storage Mode"}
                  </span>
                </div>
                {workspaceCapabilities.canUseTeams && (
                  <p className="text-[10px] text-muted-foreground">
                    Team members: {teamCount}
                  </p>
                )}
              </div>
            </div>
          )}

          {mobileView === "clipboard" && (
            <ClipboardPanel
              entries={clipboard.entries}
              clipboardError={clipboard.clipboardError}
              onReadClipboard={clipboard.readClipboard}
              onPaste={clipboard.handlePaste}
              onAddEntry={clipboard.addEntry}
              onDelete={clipboard.deleteEntry}
              onUpdate={clipboard.updateEntry}
              onTogglePin={clipboard.togglePin}
              onCopy={clipboard.copyToClipboard}
              onClearHistory={clipboard.clearHistory}
              canEdit={clipboard.canEdit}
              plan={clipboard.plan}
              isTeam={clipboard.isTeam}
            />
          )}

          {mobileView === "snippets" && (
            <SnippetPanel
              snippets={snippets.snippets}
              allTags={snippets.allTags}
              onAdd={snippets.addSnippet}
              onUpdate={snippets.updateSnippet}
              onDelete={snippets.deleteSnippet}
              onCopy={clipboard.copyToClipboard}
              canEdit={snippets.canEdit}
              plan={snippets.plan}
              isTeam={snippets.isTeam}
            />
          )}

          {mobileView === "inspector" && (
            <InspectorPanel
              localStorageItems={browserData.localStorageItems}
              sessionStorageItems={browserData.sessionStorageItems}
              cookies={browserData.cookies}
              browserInfo={browserData.browserInfo}
              onRefresh={browserData.refresh}
              onSetStorage={browserData.setStorageValue}
              onDeleteStorage={browserData.deleteStorageItem}
              onDeleteCookie={browserData.deleteCookie}
              onExport={browserData.exportData}
            />
          )}
        </div>

        {/* Mobile bottom nav */}
        <nav className="flex items-center justify-around border-t h-14 shrink-0 bg-card safe-area-bottom">
          {[
            { key: "main" as const, icon: Home, label: "Home" },
            { key: "clipboard" as const, icon: Clipboard, label: "Clipboard" },
            { key: "snippets" as const, icon: Code2, label: "Snippets" },
            { key: "inspector" as const, icon: Database, label: "Inspector" },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => {
                setMobileView(item.key);
                if (item.key === "inspector") browserData.refresh();
              }}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors active:scale-95 ${
                mobileView === item.key ?
                  "text-primary"
                : "text-muted-foreground"
              }`}
            >
              <item.icon
                className={`h-5 w-5 ${mobileView === item.key ? "text-primary" : ""}`}
              />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <header className="flex items-center gap-3 px-4 border-b h-11 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center rounded-md h-7 w-7 bg-primary">
            <Clipboard className="w-4 h-4 text-primary-foreground" />
          </div>
          <h1 className="hidden text-sm font-bold tracking-tight sm:block">
            DevClipboard Hub
          </h1>
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => setLeftOpen(!leftOpen)}
          >
            {leftOpen ?
              <PanelLeftClose className="h-3.5 w-3.5" />
            : <PanelLeft className="h-3.5 w-3.5" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => setRightOpen(!rightOpen)}
          >
            {rightOpen ?
              <PanelRightClose className="h-3.5 w-3.5" />
            : <PanelRight className="h-3.5 w-3.5" />}
          </Button>
          <div className="w-px h-4 mx-1 bg-border" />
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={toggleTheme}
          >
            {darkMode ?
              <Sun className="h-3.5 w-3.5" />
            : <Moon className="h-3.5 w-3.5" />}
          </Button>
          {/* Guest: usage badge + Sign In / authenticated: user dropdown */}
          {isAuthenticated ?
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-7 gap-1.5 px-2 text-xs">
                  <User className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline max-w-[120px] truncate">
                    {user?.name ?? user?.email}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => navigate("/account")}>
                  <Settings className="mr-2 h-3.5 w-3.5" /> Account
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/account/billing")}>
                  <CreditCard className="mr-2 h-3.5 w-3.5" /> Billing
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    await logout();
                    navigate("/");
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-3.5 w-3.5" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          : <div className="flex items-center gap-1.5">
              {/* Show usage pill so guests know how much quota they've used */}
              <span
                className="hidden sm:inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                title="Free guest quota"
                onClick={() => openAuthGate("upgrade")}
              >
                <Zap className="h-2.5 w-2.5 text-amber-400" />
                {Math.min(guestClipboardAdded, 25)}/25 free
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 px-2 text-xs"
                onClick={() => openAuthGate(null)}
              >
                <LogIn className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign in</span>
              </Button>
              <Button
                size="sm"
                className="h-7 gap-1.5 px-2 text-xs"
                onClick={() => openAuthGate("upgrade")}
              >
                <Zap className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Upgrade</span>
              </Button>
            </div>
          }
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {leftOpen && (
          <aside className="flex flex-col overflow-hidden border-r w-72 lg:w-80 shrink-0 animate-fade-in">
            <Tabs
              value={leftTab}
              onValueChange={(v) => setLeftTab(v as "clipboard" | "snippets")}
              className="flex flex-col h-full"
            >
              <TabsList className="h-8 mx-3 mt-2 shrink-0">
                <TabsTrigger value="clipboard" className="h-6 gap-1 text-xs">
                  <Clipboard className="w-3 h-3" /> Clipboard
                </TabsTrigger>
                <TabsTrigger value="snippets" className="h-6 gap-1 text-xs">
                  <Code2 className="w-3 h-3" /> Snippets
                </TabsTrigger>
              </TabsList>
              <TabsContent value="clipboard" className="flex-1 overflow-hidden">
                <ClipboardPanel
                  entries={clipboard.entries}
                  clipboardError={clipboard.clipboardError}
                  onReadClipboard={clipboard.readClipboard}
                  onPaste={clipboard.handlePaste}
                  onAddEntry={clipboard.addEntry}
                  onDelete={clipboard.deleteEntry}
                  onUpdate={clipboard.updateEntry}
                  onTogglePin={clipboard.togglePin}
                  onCopy={clipboard.copyToClipboard}
                  onClearHistory={clipboard.clearHistory}
                  canEdit={clipboard.canEdit}
                  plan={clipboard.plan}
                  isTeam={clipboard.isTeam}
                />
              </TabsContent>
              <TabsContent value="snippets" className="flex-1 overflow-hidden">
                <SnippetPanel
                  snippets={snippets.snippets}
                  allTags={snippets.allTags}
                  onAdd={snippets.addSnippet}
                  onUpdate={snippets.updateSnippet}
                  onDelete={snippets.deleteSnippet}
                  onCopy={clipboard.copyToClipboard}
                  canEdit={snippets.canEdit}
                  plan={snippets.plan}
                  isTeam={snippets.isTeam}
                />
              </TabsContent>
            </Tabs>
          </aside>
        )}

        <main className="flex-1 p-4 overflow-y-auto lg:p-6">
          <div className="max-w-3xl mx-auto space-y-4 lg:space-y-6">
            <div className="p-6 text-center border rounded-xl bg-card lg:p-8">
              <div className="flex items-center justify-center mx-auto mb-4 h-14 w-14 rounded-2xl bg-primary/10">
                <Clipboard className="h-7 w-7 text-primary" />
              </div>
              <h2 className="mb-2 text-xl font-bold tracking-tight lg:text-2xl">
                DevClipboard Hub
              </h2>
              <p className="max-w-md mx-auto text-xs lg:text-sm text-muted-foreground">
                Your developer clipboard manager & browser data inspector.
                Capture clipboard content, manage snippets, and inspect browser
                storage — all in one place.
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-4 lg:mt-6">
                <Button onClick={clipboard.readClipboard} className="gap-2">
                  <Clipboard className="w-4 h-4" /> Read Clipboard
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setLeftOpen(true);
                    setLeftTab("snippets");
                  }}
                  className="gap-2"
                >
                  <Code2 className="w-4 h-4" /> Manage Snippets
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setRightOpen(true);
                    browserData.refresh();
                  }}
                  className="gap-2"
                >
                  <Database className="w-4 h-4" /> Inspect Storage
                </Button>
              </div>
            </div>

            {clipboard.currentClipboard && (
              <div className="p-4 border rounded-xl bg-card lg:p-5 animate-fade-in">
                <h3 className="mb-2 text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                  Current Clipboard
                </h3>
                <pre className="p-3 overflow-y-auto font-mono text-xs break-all whitespace-pre-wrap rounded-lg bg-muted lg:p-4 lg:text-sm text-foreground/80 max-h-64">
                  {clipboard.currentClipboard}
                </pre>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 lg:gap-3">
              {[
                {
                  label: "Clipboard Entries",
                  value: clipboard.entries.length,
                  icon: Clipboard,
                },
                {
                  label: "Snippets",
                  value: snippets.snippets.length,
                  icon: Code2,
                },
                {
                  label: "Storage Keys",
                  value:
                    browserData.localStorageItems.length +
                    browserData.sessionStorageItems.length,
                  icon: Database,
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="p-3 text-center border rounded-lg bg-card lg:p-4"
                >
                  <stat.icon className="mx-auto mb-1.5 lg:mb-2 h-4 lg:h-5 w-4 lg:w-5 text-primary" />
                  <p className="text-xl font-bold lg:text-2xl">{stat.value}</p>
                  <p className="text-[10px] lg:text-xs text-muted-foreground">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            <div className="p-3 text-center border rounded-lg border-primary/20 bg-primary/5">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Shield className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-primary">
                  {workspaceCapabilities.source === "db+redis" ?
                    "Cloud + Redis Sync"
                  : "Local Storage Mode"}
                </span>
              </div>
              <p className="text-[10px] lg:text-xs text-muted-foreground">
                {workspaceCapabilities.source === "db+redis" ?
                  "Paid workspace is optimized with DB storage and Redis cache."
                : "Free workspace uses localStorage with preview-first mode."}
                {workspaceCapabilities.canUseTeams && (
                  <> Team members: {teamCount}</>
                )}
              </p>
            </div>
          </div>
        </main>

        {rightOpen && (
          <aside className="overflow-hidden border-l w-72 lg:w-80 shrink-0 animate-slide-in-right">
            <InspectorPanel
              localStorageItems={browserData.localStorageItems}
              sessionStorageItems={browserData.sessionStorageItems}
              cookies={browserData.cookies}
              browserInfo={browserData.browserInfo}
              onRefresh={browserData.refresh}
              onSetStorage={browserData.setStorageValue}
              onDeleteStorage={browserData.deleteStorageItem}
              onDeleteCookie={browserData.deleteCookie}
              onExport={browserData.exportData}
            />
          </aside>
        )}
      </div>
    </div>
  );
};

export default Index;

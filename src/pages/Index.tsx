import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useClipboard } from "@/hooks/use-clipboard";
import { useSnippets } from "@/hooks/use-snippets";
import { useBrowserData } from "@/hooks/use-browser-data";
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
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
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
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
          {mobileView !== "main" && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0"
              onClick={() => setMobileView("main")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="flex items-center gap-2 min-w-0">
            {mobileView === "main" && (
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary shrink-0">
                <Clipboard className="h-4 w-4 text-primary-foreground" />
              </div>
            )}
            <h1 className="text-sm font-bold tracking-tight truncate">
              {mobileTitle[mobileView]}
            </h1>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={toggleTheme}
            >
              {darkMode ?
                <Sun className="h-4 w-4" />
              : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </header>

        {/* Mobile content */}
        <div className="flex-1 overflow-y-auto">
          {mobileView === "main" && (
            <div className="p-4 space-y-4">
              <div className="rounded-xl border bg-card p-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Clipboard className="h-6 w-6 text-primary" />
                </div>
                <h2 className="mb-1.5 text-xl font-bold tracking-tight">
                  DevClipboard Hub
                </h2>
                <p className="text-xs text-muted-foreground">
                  Clipboard manager & browser data inspector
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  <Button
                    onClick={clipboard.readClipboard}
                    className="gap-2 w-full"
                  >
                    <Clipboard className="h-4 w-4" /> Read Clipboard
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
                    className="gap-2 w-full"
                  >
                    <Database className="h-4 w-4" /> Inspect Storage
                  </Button>
                </div>
              </div>

              {clipboard.currentClipboard && (
                <div className="rounded-xl border bg-card p-4 animate-fade-in">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Current Clipboard
                  </h3>
                  <pre className="rounded-lg bg-muted p-3 font-mono text-xs whitespace-pre-wrap break-all text-foreground/80 max-h-48 overflow-y-auto">
                    {clipboard.currentClipboard}
                  </pre>
                </div>
              )}

              {clipboard.clipboardError && (
                <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
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
                    className="rounded-lg border bg-card p-3 text-center transition-colors hover:border-primary/30 active:bg-muted"
                  >
                    <stat.icon className="mx-auto mb-1.5 h-4 w-4 text-primary" />
                    <p className="text-lg font-bold">{stat.value}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {stat.label}
                    </p>
                  </button>
                ))}
              </div>

              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  <Shield className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[10px] font-semibold text-primary">
                    Cloud Synced
                  </span>
                </div>
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
        <nav className="flex h-14 shrink-0 items-center justify-around border-t bg-card safe-area-bottom">
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
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex h-11 shrink-0 items-center gap-3 border-b px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <Clipboard className="h-4 w-4 text-primary-foreground" />
          </div>
          <h1 className="text-sm font-bold tracking-tight hidden sm:block">
            DevClipboard Hub
          </h1>
        </div>
        <div className="ml-auto flex items-center gap-1">
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
          <div className="mx-1 h-4 w-px bg-border" />
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
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {leftOpen && (
          <aside className="w-72 lg:w-80 shrink-0 border-r flex flex-col animate-fade-in overflow-hidden">
            <Tabs
              value={leftTab}
              onValueChange={(v) => setLeftTab(v as any)}
              className="flex flex-col h-full"
            >
              <TabsList className="mx-3 mt-2 h-8 shrink-0">
                <TabsTrigger value="clipboard" className="gap-1 text-xs h-6">
                  <Clipboard className="h-3 w-3" /> Clipboard
                </TabsTrigger>
                <TabsTrigger value="snippets" className="gap-1 text-xs h-6">
                  <Code2 className="h-3 w-3" /> Snippets
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
                />
              </TabsContent>
            </Tabs>
          </aside>
        )}

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="mx-auto max-w-3xl space-y-4 lg:space-y-6">
            <div className="rounded-xl border bg-card p-6 lg:p-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <Clipboard className="h-7 w-7 text-primary" />
              </div>
              <h2 className="mb-2 text-xl lg:text-2xl font-bold tracking-tight">
                DevClipboard Hub
              </h2>
              <p className="text-xs lg:text-sm text-muted-foreground max-w-md mx-auto">
                Your developer clipboard manager & browser data inspector.
                Capture clipboard content, manage snippets, and inspect browser
                storage — all in one place.
              </p>
              <div className="mt-4 lg:mt-6 flex flex-wrap justify-center gap-2">
                <Button onClick={clipboard.readClipboard} className="gap-2">
                  <Clipboard className="h-4 w-4" /> Read Clipboard
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setLeftOpen(true);
                    setLeftTab("snippets");
                  }}
                  className="gap-2"
                >
                  <Code2 className="h-4 w-4" /> Manage Snippets
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setRightOpen(true);
                    browserData.refresh();
                  }}
                  className="gap-2"
                >
                  <Database className="h-4 w-4" /> Inspect Storage
                </Button>
              </div>
            </div>

            {clipboard.currentClipboard && (
              <div className="rounded-xl border bg-card p-4 lg:p-5 animate-fade-in">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Current Clipboard
                </h3>
                <pre className="rounded-lg bg-muted p-3 lg:p-4 font-mono text-xs lg:text-sm whitespace-pre-wrap break-all text-foreground/80 max-h-64 overflow-y-auto">
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
                  className="rounded-lg border bg-card p-3 lg:p-4 text-center"
                >
                  <stat.icon className="mx-auto mb-1.5 lg:mb-2 h-4 lg:h-5 w-4 lg:w-5 text-primary" />
                  <p className="text-xl lg:text-2xl font-bold">{stat.value}</p>
                  <p className="text-[10px] lg:text-xs text-muted-foreground">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold text-primary">
                  Cloud Synced
                </span>
              </div>
              <p className="text-[10px] lg:text-xs text-muted-foreground">
                Your data is securely stored in the cloud and synced across
                devices.
              </p>
            </div>
          </div>
        </main>

        {rightOpen && (
          <aside className="w-72 lg:w-80 shrink-0 border-l animate-slide-in-right overflow-hidden">
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

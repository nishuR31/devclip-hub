import { useState } from "react";
import {
  Settings2,
  Sun,
  Moon,
  Monitor,
  Sparkles,
  MousePointer2,
  Layers,
  Wind,
  RotateCcw,
  Snowflake,
  Leaf,
  Flower2,
  CloudSun,
} from "lucide-react";
import { useTheme } from "next-themes";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  useVisualSettings,
  type CursorEffect,
  type AnimationIntensity,
} from "@/contexts/VisualSettingsContext";

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2">
      {children}
    </p>
  );
}

function OptionButton<T extends string>({
  value,
  current,
  onClick,
  children,
}: {
  value: T;
  current: T;
  onClick: (v: T) => void;
  children: React.ReactNode;
}) {
  const active = value === current;
  return (
    <button
      onClick={() => onClick(value)}
      className={[
        "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition-all",
        "hover:border-primary/50 hover:bg-primary/5 hover:text-primary",
        active ?
          "border-primary bg-primary/10 text-primary ring-1 ring-primary/30"
        : "border-border bg-card/50 text-muted-foreground",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

// ── Theme section ──────────────────────────────────────────────────────────────

function ThemeSection() {
  const { theme, setTheme } = useTheme();
  const current = (theme ?? "system") as "light" | "dark" | "system";

  const options: Array<{
    value: "light" | "dark" | "system";
    icon: React.ReactNode;
    label: string;
  }> = [
    { value: "light", icon: <Sun className="h-5 w-5" />, label: "Light" },
    { value: "dark", icon: <Moon className="h-5 w-5" />, label: "Dark" },
    {
      value: "system",
      icon: <Monitor className="h-5 w-5" />,
      label: "System",
    },
  ];

  return (
    <div className="space-y-2">
      <SectionHeading>Theme</SectionHeading>
      <div className="grid grid-cols-3 gap-2">
        {options.map((o) => (
          <OptionButton
            key={o.value}
            value={o.value}
            current={current}
            onClick={setTheme}
          >
            {o.icon}
            <span>{o.label}</span>
          </OptionButton>
        ))}
      </div>
    </div>
  );
}

// ── Cursor effects section ─────────────────────────────────────────────────────

const CURSOR_OPTIONS: Array<{
  value: CursorEffect;
  icon: React.ReactNode;
  label: string;
}> = [
  {
    value: "none",
    icon: <MousePointer2 className="h-5 w-5" />,
    label: "Off",
  },
  {
    value: "trail",
    icon: (
      <span className="relative h-5 w-5 flex items-center justify-center">
        <span className="absolute h-3 w-3 rounded-full bg-current opacity-70 -top-0.5 -left-0.5" />
        <span className="absolute h-2 w-2 rounded-full bg-current opacity-40 top-1 left-1.5" />
        <span className="absolute h-1 w-1 rounded-full bg-current opacity-20 top-2 left-3" />
      </span>
    ),
    label: "Trail",
  },
  {
    value: "magnetic",
    icon: (
      <span className="relative h-5 w-5 flex items-center justify-center">
        <span className="absolute h-5 w-5 rounded-full border-2 border-current opacity-60" />
        <span className="absolute h-1.5 w-1.5 rounded-full bg-current" />
      </span>
    ),
    label: "Magnetic",
  },
  {
    value: "sparkle",
    icon: <Sparkles className="h-5 w-5" />,
    label: "Sparkle",
  },
  {
    value: "ripple",
    icon: (
      <span className="relative h-5 w-5 flex items-center justify-center">
        <span className="absolute h-5 w-5 rounded-full border border-current opacity-30" />
        <span className="absolute h-3 w-3 rounded-full border border-current opacity-60" />
        <span className="absolute h-1 w-1 rounded-full bg-current" />
      </span>
    ),
    label: "Ripple",
  },
];

function CursorSection() {
  const { cursorEffect, setCursorEffect } = useVisualSettings();
  return (
    <div className="space-y-2">
      <SectionHeading>Cursor Effect</SectionHeading>
      <div className="grid grid-cols-5 gap-1.5">
        {CURSOR_OPTIONS.map((o) => (
          <OptionButton
            key={o.value}
            value={o.value}
            current={cursorEffect}
            onClick={setCursorEffect}
          >
            {o.icon}
            <span className="text-[10px]">{o.label}</span>
          </OptionButton>
        ))}
      </div>
    </div>
  );
}

// ── Animation intensity ────────────────────────────────────────────────────────

const INTENSITY_OPTIONS: Array<{
  value: AnimationIntensity;
  label: string;
}> = [
  { value: "none", label: "Off" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Med" },
  { value: "high", label: "High" },
];

function IntensitySection() {
  const { animationIntensity, setAnimationIntensity } = useVisualSettings();
  return (
    <div className="space-y-2">
      <SectionHeading>Animation Speed</SectionHeading>
      <div className="grid grid-cols-4 gap-1.5">
        {INTENSITY_OPTIONS.map((o) => (
          <OptionButton
            key={o.value}
            value={o.value}
            current={animationIntensity}
            onClick={setAnimationIntensity}
          >
            <span className="text-sm font-semibold">{o.label}</span>
          </OptionButton>
        ))}
      </div>
    </div>
  );
}

// ── Visual toggles ────────────────────────────────────────────────────────────

function VisualToggles() {
  const {
    glassmorphism,
    setGlassmorphism,
    ambientBackground,
    setAmbientBackground,
  } = useVisualSettings();

  return (
    <div className="space-y-2">
      <SectionHeading>Visual Effects</SectionHeading>
      <div className="space-y-3 rounded-xl border border-border bg-card/50 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <div>
              <Label className="text-sm font-medium cursor-pointer">
                Glassmorphism
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Frosted glass panels
              </p>
            </div>
          </div>
          <Switch checked={glassmorphism} onCheckedChange={setGlassmorphism} />
        </div>
        <Separator />
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Wind className="h-4 w-4 text-primary" />
            <div>
              <Label className="text-sm font-medium cursor-pointer">
                Ambient Glow
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Floating colour orbs
              </p>
            </div>
          </div>
          <Switch
            checked={ambientBackground}
            onCheckedChange={setAmbientBackground}
          />
        </div>
      </div>
    </div>
  );
}

// ── Seasonal tweaks ────────────────────────────────────────────────────────────

const SEASON_META = {
  winter: {
    icon: <Snowflake className="h-4 w-4" />,
    label: "Winter",
    desc: "Snowflakes",
    colour: "text-sky-400",
  },
  autumn: {
    icon: <Leaf className="h-4 w-4" />,
    label: "Autumn",
    desc: "Falling leaves",
    colour: "text-orange-400",
  },
  spring: {
    icon: <Flower2 className="h-4 w-4" />,
    label: "Spring",
    desc: "Cherry petals",
    colour: "text-pink-400",
  },
  summer: {
    icon: <CloudSun className="h-4 w-4" />,
    label: "Summer",
    desc: "Clear skies",
    colour: "text-yellow-400",
  },
} as const;

function SeasonalSection() {
  const { seasonalEffects, setSeasonalEffects, currentSeason } =
    useVisualSettings();
  const meta = SEASON_META[currentSeason];

  return (
    <div className="space-y-2">
      <SectionHeading>Seasonal Tweaks</SectionHeading>
      <div className="rounded-xl border border-border bg-card/50 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className={meta.colour}>{meta.icon}</span>
            <div>
              <Label className="text-sm font-medium cursor-pointer">
                {meta.label} Effects
              </Label>
              <p className="text-[11px] text-muted-foreground">{meta.desc}</p>
            </div>
          </div>
          <Switch
            checked={seasonalEffects}
            onCheckedChange={setSeasonalEffects}
          />
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            Auto-detects season
          </Badge>
        </div>
      </div>
    </div>
  );
}

// ── Main panel ─────────────────────────────────────────────────────────────────

export function SettingsPanel() {
  const [open, setOpen] = useState(false);
  const { resetToDefaults } = useVisualSettings();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className={[
            "fixed bottom-6 right-6 z-[9997]",
            "flex h-12 w-12 items-center justify-center rounded-2xl",
            "bg-primary/90 text-primary-foreground shadow-lg shadow-primary/30",
            "backdrop-blur-sm border border-primary/20",
            "hover:bg-primary hover:scale-110 hover:shadow-xl hover:shadow-primary/40",
            "active:scale-95 transition-all duration-200",
            "glass-enabled:bg-primary/70 glass-enabled:backdrop-blur-md",
          ].join(" ")}
          aria-label="Open visual settings"
        >
          <Settings2 className="h-5 w-5" />
        </button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-80 flex flex-col glass-panel overflow-y-auto"
      >
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Visual Settings
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 space-y-5 pb-4">
          <ThemeSection />
          <Separator />
          <CursorSection />
          <Separator />
          <IntensitySection />
          <Separator />
          <VisualToggles />
          <Separator />
          <SeasonalSection />
        </div>

        <div className="pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="w-full gap-2 text-muted-foreground hover:text-foreground"
            onClick={resetToDefaults}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to defaults
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

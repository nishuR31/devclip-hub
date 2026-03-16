import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";

export type CursorEffect = "none" | "trail" | "magnetic" | "sparkle" | "ripple";
export type AnimationIntensity = "none" | "low" | "medium" | "high";
export type Season = "spring" | "summer" | "autumn" | "winter";

export interface VisualSettings {
  cursorEffect: CursorEffect;
  glassmorphism: boolean;
  seasonalEffects: boolean;
  animationIntensity: AnimationIntensity;
  ambientBackground: boolean;
}

interface VisualSettingsContextValue extends VisualSettings {
  currentSeason: Season;
  setCursorEffect: (e: CursorEffect) => void;
  setGlassmorphism: (v: boolean) => void;
  setSeasonalEffects: (v: boolean) => void;
  setAnimationIntensity: (v: AnimationIntensity) => void;
  setAmbientBackground: (v: boolean) => void;
  resetToDefaults: () => void;
}

const DEFAULTS: VisualSettings = {
  cursorEffect: "trail",
  glassmorphism: true,
  seasonalEffects: true,
  animationIntensity: "medium",
  ambientBackground: true,
};

const STORAGE_KEY = "devclip-visual-v1";

function detectSeason(): Season {
  const m = new Date().getMonth(); // 0-based
  if (m >= 2 && m <= 4) return "spring";
  if (m >= 5 && m <= 7) return "summer";
  if (m >= 8 && m <= 10) return "autumn";
  return "winter";
}

const VisualSettingsContext = createContext<VisualSettingsContextValue | null>(
  null,
);

export function VisualSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<VisualSettings>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
    } catch {
      return DEFAULTS;
    }
  });

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  // Apply CSS flags to <html> for style hooks
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("glass-enabled", settings.glassmorphism);
    root.dataset.animIntensity = settings.animationIntensity;
  }, [settings.glassmorphism, settings.animationIntensity]);

  const patch = useCallback(
    <K extends keyof VisualSettings>(key: K, value: VisualSettings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  return (
    <VisualSettingsContext.Provider
      value={{
        ...settings,
        currentSeason: detectSeason(),
        setCursorEffect: (e) => patch("cursorEffect", e),
        setGlassmorphism: (v) => patch("glassmorphism", v),
        setSeasonalEffects: (v) => patch("seasonalEffects", v),
        setAnimationIntensity: (v) => patch("animationIntensity", v),
        setAmbientBackground: (v) => patch("ambientBackground", v),
        resetToDefaults: () => setSettings(DEFAULTS),
      }}
    >
      {children}
    </VisualSettingsContext.Provider>
  );
}

export function useVisualSettings() {
  const ctx = useContext(VisualSettingsContext);
  if (!ctx)
    throw new Error(
      "useVisualSettings must be used within VisualSettingsProvider",
    );
  return ctx;
}

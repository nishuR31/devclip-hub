import { useMemo } from "react";
import {
  useVisualSettings,
  type Season,
} from "@/contexts/VisualSettingsContext";

// ── Seasonal particle configs ──────────────────────────────────────────────────

interface ParticleDef {
  id: number;
  left: number; // percent
  delay: number; // seconds
  duration: number; // seconds
  size: number; // px
  drift: number; // px horizontal
}

function useParticles(count: number): ParticleDef[] {
  return useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 12,
        duration: Math.random() * 10 + 12,
        size: Math.random() * 8 + 4,
        drift: (Math.random() - 0.5) * 120,
      })),
    [count],
  );
}

function WinterSnow({ count }: { count: number }) {
  const flakes = useParticles(count);
  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden z-[1]"
      aria-hidden="true"
    >
      {flakes.map((f) => (
        <div
          key={f.id}
          className="absolute rounded-full bg-white/50 dark:bg-white/30 animate-snowfall"
          style={
            {
              left: `${f.left}%`,
              top: "-16px",
              width: f.size,
              height: f.size,
              animationDelay: `${f.delay}s`,
              animationDuration: `${f.duration}s`,
              "--drift": `${f.drift}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

function AutumnLeaves({ count }: { count: number }) {
  const leaves = useParticles(count);
  const emoji = ["🍂", "🍁", "🍃"];
  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden z-[1] opacity-50"
      aria-hidden="true"
    >
      {leaves.map((l) => (
        <div
          key={l.id}
          className="absolute animate-leaffall select-none"
          style={
            {
              left: `${l.left}%`,
              top: "-40px",
              fontSize: `${l.size}px`,
              animationDelay: `${l.delay}s`,
              animationDuration: `${l.duration}s`,
              "--drift": `${l.drift}px`,
            } as React.CSSProperties
          }
        >
          {emoji[l.id % 3]}
        </div>
      ))}
    </div>
  );
}

function SpringPetals({ count }: { count: number }) {
  const petals = useParticles(count);
  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden z-[1] opacity-40"
      aria-hidden="true"
    >
      {petals.map((p) => (
        <div
          key={p.id}
          className="absolute animate-petalfall bg-pink-300 dark:bg-pink-400/70"
          style={
            {
              left: `${p.left}%`,
              top: "-16px",
              width: p.size * 1.4,
              height: p.size,
              borderRadius: "50% 50% 50% 0",
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              "--drift": `${p.drift}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

function SeasonalLayer({ season, count }: { season: Season; count: number }) {
  if (season === "winter") return <WinterSnow count={count} />;
  if (season === "autumn") return <AutumnLeaves count={count} />;
  if (season === "spring") return <SpringPetals count={count} />;
  return null; // summer — no particles, just ambient orbs
}

// ── Ambient orbs ──────────────────────────────────────────────────────────────

function AmbientOrbs() {
  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden -z-10"
      aria-hidden="true"
    >
      {/* Top-right purple orb */}
      <div className="absolute -top-48 -right-48 h-[700px] w-[700px] rounded-full blur-[130px] animate-float-slow orb-primary opacity-[var(--orb-opacity,0.08)]" />
      {/* Bottom-left blue orb */}
      <div className="absolute -bottom-64 -left-48 h-[600px] w-[600px] rounded-full blur-[110px] animate-float-slower orb-secondary opacity-[var(--orb-opacity,0.07)]" />
      {/* Center accent */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[450px] w-[450px] rounded-full blur-[90px] animate-pulse-slow orb-accent opacity-[var(--orb-accent-opacity,0.04)]" />
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function AmbientBackground() {
  const {
    ambientBackground,
    seasonalEffects,
    currentSeason,
    animationIntensity,
  } = useVisualSettings();

  const particleCount =
    animationIntensity === "high" ? 40
    : animationIntensity === "medium" ? 20
    : animationIntensity === "low" ? 10
    : 0;

  return (
    <>
      {ambientBackground && <AmbientOrbs />}
      {seasonalEffects && animationIntensity !== "none" && (
        <SeasonalLayer season={currentSeason} count={particleCount} />
      )}
    </>
  );
}

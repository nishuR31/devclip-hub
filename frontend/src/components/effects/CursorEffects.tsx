import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { useVisualSettings } from "@/contexts/VisualSettingsContext";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // 1 → 0
  size: number;
}

/**
 * Renders a fixed canvas overlay with premium cursor effects.
 * - trail    : coloured dot trail that fades out
 * - magnetic : a lagging ring + precise inner dot
 * - sparkle  : sparkle particles on move + burst on click
 * - ripple   : expanding rings on click only
 */
export function CursorEffects() {
  const { resolvedTheme } = useTheme();
  const { cursorEffect, animationIntensity } = useVisualSettings();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const mouse = useRef({ x: -200, y: -200 });
  const ring = useRef({ x: -200, y: -200 });
  const trail = useRef<Array<{ x: number; y: number; t: number }>>([]);
  const sparks = useRef<Particle[]>([]);
  const ripples = useRef<
    Array<{ x: number; y: number; r: number; maxR: number; life: number }>
  >([]);

  useEffect(() => {
    if (cursorEffect === "none") return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const isDark = resolvedTheme === "dark";
    const H = 263; // primary hue (purple)
    const primaryColor = (alpha: number, l = isDark ? 68 : 52) =>
      `hsla(${H},70%,${l}%,${alpha})`;

    const sparkCount =
      animationIntensity === "high" ? 4
      : animationIntensity === "medium" ? 2
      : 1;

    const onMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY };

      if (cursorEffect === "trail") {
        trail.current.push({ x: e.clientX, y: e.clientY, t: Date.now() });
        if (trail.current.length > 40) trail.current.shift();
      }

      if (cursorEffect === "sparkle" && animationIntensity !== "none") {
        for (let i = 0; i < sparkCount; i++) {
          sparks.current.push({
            x: e.clientX,
            y: e.clientY,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4 - 1.5,
            life: 1,
            size: Math.random() * 4 + 2,
          });
        }
      }
    };

    const onClick = (e: MouseEvent) => {
      if (cursorEffect === "sparkle") {
        const burst =
          animationIntensity === "high" ? 24
          : animationIntensity === "medium" ? 14
          : 8;
        for (let i = 0; i < burst; i++) {
          const angle = (i / burst) * Math.PI * 2;
          const speed = Math.random() * 5 + 2;
          sparks.current.push({
            x: e.clientX,
            y: e.clientY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1,
            size: Math.random() * 6 + 2,
          });
        }
      }
      if (cursorEffect === "ripple") {
        ripples.current.push({
          x: e.clientX,
          y: e.clientY,
          r: 0,
          maxR: 80,
          life: 1,
        });
      }
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("click", onClick);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const now = Date.now();

      // ── Trail ────────────────────────────────────────────────────
      if (cursorEffect === "trail") {
        const TTL = 600;
        trail.current = trail.current.filter((p) => now - p.t < TTL);
        const len = trail.current.length;
        for (let i = 0; i < len; i++) {
          const pt = trail.current[i];
          const age = (now - pt.t) / TTL;
          const alpha = Math.max(0, (1 - age) * 0.7);
          const size = ((i + 1) / len) * 9;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, size * (1 - age * 0.5), 0, Math.PI * 2);
          ctx.fillStyle = primaryColor(alpha);
          ctx.fill();
        }
        // Bright tip dot
        ctx.beginPath();
        ctx.arc(mouse.current.x, mouse.current.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = primaryColor(0.9);
        ctx.fill();
      }

      // ── Magnetic ─────────────────────────────────────────────────
      if (cursorEffect === "magnetic") {
        const { x: mx, y: my } = mouse.current;
        let { x: rx, y: ry } = ring.current;
        rx += (mx - rx) * 0.1;
        ry += (my - ry) * 0.1;
        ring.current = { x: rx, y: ry };

        // Outer animated ring
        ctx.beginPath();
        ctx.arc(rx, ry, 22, 0, Math.PI * 2);
        ctx.strokeStyle = primaryColor(0.65);
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Inner slightly smaller ring
        ctx.beginPath();
        ctx.arc(rx, ry, 14, 0, Math.PI * 2);
        ctx.strokeStyle = primaryColor(0.25);
        ctx.lineWidth = 1;
        ctx.stroke();

        // Precise cursor dot
        ctx.beginPath();
        ctx.arc(mx, my, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = primaryColor(1);
        ctx.fill();
      }

      // ── Sparkle ──────────────────────────────────────────────────
      if (cursorEffect === "sparkle") {
        sparks.current = sparks.current.filter((p) => p.life > 0);
        for (const p of sparks.current) {
          p.life -= 0.022;
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.07; // gravity
          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(0, p.size * p.life), 0, Math.PI * 2);
          ctx.fillStyle = primaryColor(p.life * 0.85);
          ctx.fill();
        }
        // Cursor dot
        ctx.beginPath();
        ctx.arc(mouse.current.x, mouse.current.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = primaryColor(0.8);
        ctx.fill();
      }

      // ── Ripple ───────────────────────────────────────────────────
      if (cursorEffect === "ripple") {
        ripples.current = ripples.current.filter((r) => r.life > 0);
        for (const r of ripples.current) {
          r.r += 3;
          r.life = Math.max(0, 1 - r.r / r.maxR);
          ctx.beginPath();
          ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
          ctx.strokeStyle = primaryColor(r.life * 0.7);
          ctx.lineWidth = 2 * r.life + 0.5;
          ctx.stroke();
        }
        // Cursor dot
        ctx.beginPath();
        ctx.arc(mouse.current.x, mouse.current.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = primaryColor(0.75);
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("click", onClick);
      window.removeEventListener("resize", resize);
      // Reset refs
      trail.current = [];
      sparks.current = [];
      ripples.current = [];
      ring.current = { x: -200, y: -200 };
    };
  }, [cursorEffect, resolvedTheme, animationIntensity]);

  if (cursorEffect === "none") return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[9998]"
      aria-hidden="true"
    />
  );
}

import React, { useEffect, useRef, useCallback, useMemo } from "react";
import { useScene, usePerformanceTier } from "@/context/SceneContext";
import type { CursorPreset } from "@/data/themes/sceneSpecs";

interface TrailPoint {
  x: number;
  y: number;
  timestamp: number;
  streak: number;
  intensity: number;
}

interface UseCursorTrailOptions {
  /** Maximum number of trail points to keep */
  maxPoints?: number;
  /** Trail decay time in ms */
  decayTime?: number;
  /** Custom container for coordinate mapping */
  containerRef?: React.RefObject<HTMLElement>;
}

/**
 * useCursorTrail - Manages streak-reactive cursor trail system
 * Features:
 * - Smooth interpolated trail points
 * - Streak-reactive intensity and color shifting
 * - Click burst particles
 * - Performance tier awareness
 * - Canvas or DOM rendering support
 */
export function useCursorTrail(options: UseCursorTrailOptions = {}) {
  const {
    maxPoints = 30,
    decayTime = 800,
    containerRef,
  } = options;

  const { currentScene, cursorPosition, streak, performanceTier } = useScene();
  const cursor = currentScene.cursor;
  const perf = currentScene.performance[performanceTier];

  // State
  const trailRef = useRef<TrailPoint[]>([]);
  const lastTimestampRef = useRef(performance.now());
  const animationRef = useRef<number | null>(null);
  const containerSizeRef = useRef({ width: 0, height: 0 });

  // Streak intensity mapping
  const getStreakIntensity = useCallback(
    (streakCount: number): number => {
      const mapping = cursor.streakIntensityMapping;
      if (streakCount >= 20) return mapping[20];
      if (streakCount >= 10) return mapping[10];
      if (streakCount >= 5) return mapping[5];
      if (streakCount >= 3) return mapping[3];
      return mapping[0];
    },
    [cursor.streakIntensityMapping]
  );

  // Streak color shift
  const getStreakColor = useCallback(
    (streakCount: number): { color: string; glow: string } => {
      const baseColor = cursor.trailColor;
      const baseGlow = cursor.trailGlow;

      for (const shift of cursor.streakColorShift) {
        if (streakCount >= shift.threshold) {
          return { color: shift.color, glow: shift.glow };
        }
      }
      return { color: baseColor, glow: baseGlow };
    },
    [cursor.trailColor, cursor.trailGlow, cursor.streakColorShift]
  );

  // Update container size
  const updateContainerSize = useCallback(() => {
    if (containerRef?.current) {
      const rect = containerRef.current.getBoundingClientRect();
      containerSizeRef.current = { width: rect.width, height: rect.height };
    } else {
      containerSizeRef.current = {
        width: window.innerWidth,
        height: window.innerHeight,
      };
    }
  }, [containerRef]);

  // Add point to trail
  const addTrailPoint = useCallback(
    (x: number, y: number, currentStreak: number) => {
      if (!cursor.trailEnabled || !perf.cursorTrail) return;

      const now = performance.now();
      const intensity = getStreakIntensity(currentStreak);
      const { color, glow } = getStreakColor(currentStreak);

      trailRef.current.push({
        x,
        y,
        timestamp: now,
        streak: currentStreak,
        intensity,
      });

      // Limit trail length
      if (trailRef.current.length > maxPoints) {
        trailRef.current.shift();
      }
    },
    [cursor.trailEnabled, perf.cursorTrail, maxPoints, getStreakIntensity, getStreakColor]
  );

  // Clean old points
  const cleanTrail = useCallback(() => {
    const now = performance.now();
    trailRef.current = trailRef.current.filter(
      (point) => now - point.timestamp < decayTime
    );
  }, [decayTime]);

  // Animation loop for smooth interpolation
  useEffect(() => {
    if (!cursor.trailEnabled || !perf.cursorTrail || performanceTier === "static") {
      trailRef.current = [];
      return;
    }

    updateContainerSize();
    window.addEventListener("resize", updateContainerSize);

    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      const dt = currentTime - lastTime;
      lastTime = currentTime;

      cleanTrail();

      // Add interpolated points for smooth motion
      const trail = trailRef.current;
      if (trail.length >= 2) {
        const last = trail[trail.length - 1];
        const prev = trail[trail.length - 2];
        const timeDiff = last.timestamp - prev.timestamp;

        if (timeDiff > 16 && timeDiff < 100) {
          // Interpolate between last two points
          const steps = Math.ceil(timeDiff / 16);
          for (let i = 1; i < steps; i++) {
            const t = i / steps;
            trailRef.current.push({
              x: prev.x + (last.x - prev.x) * t,
              y: prev.y + (last.y - prev.y) * t,
              timestamp: prev.timestamp + timeDiff * t,
              streak: last.streak,
              intensity: last.intensity,
            });
          }
        }
      }

      // Re-limit after interpolation
      if (trailRef.current.length > maxPoints * 2) {
        trailRef.current = trailRef.current.slice(-maxPoints);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", updateContainerSize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [
    cursor.trailEnabled,
    perf.cursorTrail,
    performanceTier,
    maxPoints,
    cleanTrail,
    updateContainerSize,
  ]);

  // Mouse move handler to add trail points
  useEffect(() => {
    if (!cursor.trailEnabled || !perf.cursorTrail) return;

    const handleMouseMove = (e: MouseEvent) => {
      addTrailPoint(e.clientX, e.clientY, streak);
    };

    document.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => document.removeEventListener("mousemove", handleMouseMove);
  }, [cursor.trailEnabled, perf.cursorTrail, streak, addTrailPoint]);

  // Click handler for burst effect
  useEffect(() => {
    if (!cursor.clickBurst || !perf.cursorTrail) return;

    const handleClick = (e: MouseEvent) => {
      // Create burst particles at click position
      // This would typically dispatch to a particle system
      // For now, we just add intense trail points
      for (let i = 0; i < cursor.clickBurstParticleCount; i++) {
        const angle = (i / cursor.clickBurstParticleCount) * Math.PI * 2;
        const distance = 20 + Math.random() * 30;
        addTrailPoint(
          e.clientX + Math.cos(angle) * distance,
          e.clientY + Math.sin(angle) * distance,
          streak
        );
      }
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [cursor.clickBurst, perf.cursorTrail, cursor.clickBurstParticleCount, streak, addTrailPoint]);

  // Computed values for rendering
  const computedTrail = useMemo(() => {
    if (!cursor.trailEnabled || !perf.cursorTrail || performanceTier === "static") {
      return [];
    }

    const now = performance.now();
    return trailRef.current.map((point) => {
      const age = now - point.timestamp;
      const life = 1 - age / decayTime;
      const { color, glow } = getStreakColor(point.streak);

      return {
        ...point,
        life: Math.max(0, life),
        color,
        glow,
        size: Math.max(1, point.intensity * life * 8), // Base size scaled by intensity and life
      };
    });
  }, [
    cursor.trailEnabled,
    perf.cursorTrail,
    performanceTier,
    decayTime,
    getStreakColor,
    streak,
  ]);

  // Cursor style properties for CSS
  const cursorStyle = useMemo(() => {
    if (!cursor.trailEnabled || !perf.cursorTrail) return {};

    return {
      "--cursor-trail-color": cursor.trailColor,
      "--cursor-trail-glow": cursor.trailGlow,
      "--cursor-trail-length": String(maxPoints),
      "--cursor-streak-intensity": String(getStreakIntensity(streak)),
    };
  }, [
    cursor.trailEnabled,
    perf.cursorTrail,
    cursor.trailColor,
    cursor.trailGlow,
    maxPoints,
    getStreakIntensity,
    streak,
  ]);

  return {
    /** Current trail points with computed life, color, size */
    trail: computedTrail,
    /** Current streak count */
    streak,
    /** Current cursor position */
    position: cursorPosition,
    /** Cursor style CSS custom properties */
    cursorStyle,
    /** Trail configuration */
    config: {
      enabled: cursor.trailEnabled && perf.cursorTrail && performanceTier !== "static",
      style: cursor.trailStyle,
      maxPoints,
      decayTime,
    },
    /** Trigger a click burst manually */
    triggerBurst: useCallback(
      (x: number, y: number) => {
        if (cursor.clickBurst && perf.cursorTrail) {
          for (let i = 0; i < cursor.clickBurstParticleCount; i++) {
            const angle = (i / cursor.clickBurstParticleCount) * Math.PI * 2;
            const distance = 20 + Math.random() * 30;
            addTrailPoint(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance, streak);
          }
        }
      },
      [cursor.clickBurst, perf.cursorTrail, cursor.clickBurstParticleCount, streak, addTrailPoint]
    ),
    /** Clear the trail */
    clear: useCallback(() => {
      trailRef.current = [];
    }, []),
  };
}

/**
 * CursorTrailRenderer - Canvas-based trail renderer component
 * Uses the trail data from useCursorTrail
 */
interface CursorTrailRendererProps {
  trail: ReturnType<typeof useCursorTrail>["trail"];
  config: ReturnType<typeof useCursorTrail>["config"];
  className?: string;
}

export const CursorTrailRenderer = React.memo(function CursorTrailRenderer({
  trail,
  config,
  className,
}: CursorTrailRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dpr = typeof window !== "undefined" ? devicePixelRatio : 1;

  useEffect(() => {
    if (!config.enabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = "100vw";
      canvas.style.height = "100vh";
    };

    resize();
    window.addEventListener("resize", resize);

    const animate = () => {
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw trail segments
      for (let i = 1; i < trail.length; i++) {
        const prev = trail[i - 1];
        const curr = trail[i];

        if (prev.life <= 0 || curr.life <= 0) continue;

        const avgLife = (prev.life + curr.life) * 0.5;
        const size = ((prev.size + curr.size) * 0.5) * dpr;

        ctx.beginPath();
        ctx.moveTo(prev.x * dpr, prev.y * dpr);
        ctx.lineTo(curr.x * dpr, curr.y * dpr);

        // Gradient stroke
        const gradient = ctx.createLinearGradient(
          prev.x * dpr,
          prev.y * dpr,
          curr.x * dpr,
          curr.y * dpr
        );
        gradient.addColorStop(0, prev.color.replace(/[\d.]+\)$/, `${(prev.life * 0.8).toFixed(2)})`));
        gradient.addColorStop(1, curr.color.replace(/[\d.]+\)$/, `${(curr.life * 0.8).toFixed(2)})`));

        ctx.strokeStyle = gradient;
        ctx.lineWidth = size;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.globalCompositeOperation = "screen";
        ctx.stroke();
      }

      // Draw glow points
      for (const point of trail) {
        if (point.life <= 0.1) continue;

        const glowGradient = ctx.createRadialGradient(
          point.x * dpr,
          point.y * dpr,
          0,
          point.x * dpr,
          point.y * dpr,
          point.size * 3 * dpr
        );
        glowGradient.addColorStop(0, point.glow.replace(/[\d.]+\)$/, `${(point.life * 0.5).toFixed(2)})`));
        glowGradient.addColorStop(1, "transparent");

        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(point.x * dpr, point.y * dpr, point.size * 3 * dpr, 0, Math.PI * 2);
        ctx.fill();
      }

      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
    };
  }, [trail, config.enabled, dpr]);

  if (!config.enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 9998, // Above content, below UI
      }}
      aria-hidden="true"
    />
  );
});

CursorTrailRenderer.displayName = "CursorTrailRenderer";
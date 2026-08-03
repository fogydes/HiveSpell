import React, { useEffect, useRef, memo } from "react";
import { useScene, usePerformanceTier } from "@/context/SceneContext";

/**
 * AmbientBase - Renders the base ambient layer with gradients, glows, and patterns
 * This is the foundation layer that sits behind all other content
 */
export const AmbientBase = memo(function AmbientBase() {
  const { currentScene, cursorPosition } = useScene();
  const performanceTier = usePerformanceTier();
  const ambient = currentScene.ambient;
  const perf = currentScene.performance[performanceTier];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastCursorRef = useRef(cursorPosition);

  // Canvas-based ambient glow animation
  useEffect(() => {
    if (!perf.ambientGlow || performanceTier === "static") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth * devicePixelRatio;
      canvas.height = window.innerHeight * devicePixelRatio;
      canvas.style.width = "100vw";
      canvas.style.height = "100vh";
    };

    resize();
    window.addEventListener("resize", resize);

    let time = 0;
    const animate = () => {
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      const dpr = devicePixelRatio;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Draw ambient glow following cursor (subtle)
      const cursorX = lastCursorRef.current.x * dpr;
      const cursorY = lastCursorRef.current.y * dpr;

      // Main glow orb
      const glowGradient = ctx.createRadialGradient(
        cursorX,
        cursorY,
        0,
        cursorX,
        cursorY,
        Math.max(width, height) * 0.6
      );
      // Parse primary color for gradient
      const primaryRgb = currentScene.colorTokens.primaryRgb.split(",").map(Number);
      glowGradient.addColorStop(0, `rgba(${primaryRgb[0]}, ${primaryRgb[1]}, ${primaryRgb[2]}, ${ambient.glowIntensity * 0.3})`);
      glowGradient.addColorStop(0.5, `rgba(${primaryRgb[0]}, ${primaryRgb[1]}, ${primaryRgb[2]}, ${ambient.glowIntensity * 0.1})`);
      glowGradient.addColorStop(1, `rgba(${primaryRgb[0]}, ${primaryRgb[1]}, ${primaryRgb[2]}, 0)`);

      ctx.fillStyle = glowGradient;
      ctx.fillRect(0, 0, width, height);

      // Secondary glow (accent color) pulsing slowly
      const accentRgb = currentScene.colorTokens.accent
        .replace("#", "")
        .match(/.{2}/g)
        ?.map((hex: string) => parseInt(hex, 16)) ?? [245, 158, 11];
      const pulseIntensity = 0.5 + Math.sin(time * 0.5) * 0.3;
      const accentGradient = ctx.createRadialGradient(
        width * 0.8,
        height * 0.2,
        0,
        width * 0.8,
        height * 0.2,
        Math.max(width, height) * 0.5
      );
      accentGradient.addColorStop(0, `rgba(${accentRgb[0]}, ${accentRgb[1]}, ${accentRgb[2]}, ${ambient.glowIntensity * 0.15 * pulseIntensity})`);
      accentGradient.addColorStop(1, `rgba(${accentRgb[0]}, ${accentRgb[1]}, ${accentRgb[2]}, 0)`);

      ctx.fillStyle = accentGradient;
      ctx.fillRect(0, 0, width, height);

      time += 0.016;
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [currentScene, performanceTier, perf.ambientGlow, ambient.glowIntensity]);

  // Update cursor ref for glow tracking
  useEffect(() => {
    lastCursorRef.current = cursorPosition;
  }, [cursorPosition]);

  // Overlay pattern (CSS-based, more performant)
  const showPattern = perf.overlayPattern && ambient.overlayPattern !== "none";

  return (
    <div className="ambient-base" data-tier={performanceTier}>
      {/* Canvas for animated glows */}
      {perf.ambientGlow && performanceTier !== "static" && (
        <canvas
          ref={canvasRef}
          className="ambient-glow-canvas"
          aria-hidden="true"
        />
      )}

      {/* CSS-based overlay pattern */}
      {showPattern && (
        <div
          className="ambient-pattern"
          style={{
            backgroundImage: ambient.overlayPattern,
            opacity: ambient.patternOpacity * (performanceTier === "full" ? 1 : 0.5),
          }}
          aria-hidden="true"
        />
      )}

      {/* Vignette overlay for depth */}
      <div className="ambient-vignette" aria-hidden="true" />
    </div>
  );
});

AmbientBase.displayName = "AmbientBase";
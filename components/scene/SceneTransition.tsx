import React, { useEffect, useRef, useState, memo, useCallback } from "react";
import { useScene, usePerformanceTier } from "@/context/SceneContext";
import type { ScenePackage } from "@/data/themes/sceneSpecs";

/**
 * SceneTransition - Handles scene enter/exit transitions
 * Supports: iris, morph, slide, fade, particle
 */
export interface SceneTransitionProps {
  type: "enter" | "exit";
  onComplete?: () => void;
  scene?: ScenePackage;
}

export const SceneTransition = memo(function SceneTransition({
  type,
  onComplete,
  scene,
}: SceneTransitionProps) {
  const { currentScene, performanceTier } = useScene();
  const activeScene = scene ?? currentScene;
  const [isActive, setIsActive] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef(performance.now());

  const transition = type === "enter" ? activeScene.transitions.enter : activeScene.transitions.exit;
  const durationMs = parseInt(transition.duration);
  const perf = activeScene.performance[performanceTier];

  // Skip animation for static tier
  useEffect(() => {
    if (performanceTier === "static" || !perf.ambientGlow) {
      setIsActive(false);
      onComplete?.();
      return;
    }

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
    startTimeRef.current = performance.now();

    const animate = (currentTime: number) => {
      if (!ctx) return;

      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / durationMs, 1);
      const easedProgress = ease(progress, transition.easing);

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw transition based on type
      drawTransition(ctx, transition.type, type, easedProgress, progress, canvas.width, canvas.height, transition.color);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsActive(false);
        onComplete?.();
      }
    };

    animate(performance.now());

    return () => {
      window.removeEventListener("resize", resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [type, transition, durationMs, performanceTier, perf.ambientGlow, onComplete, activeScene]);

  if (!isActive) return null;

  return (
    <canvas
      ref={canvasRef}
      className="scene-transition-overlay"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 9999,
      }}
      aria-hidden="true"
    />
  );
});

SceneTransition.displayName = "SceneTransition";

/**
 * DifficultyChangeTransition - Handles difficulty change transitions
 * Supports: morph, particle, pulse
 */
export interface DifficultyChangeTransitionProps {
  onComplete?: () => void;
}

export const DifficultyChangeTransition = memo(function DifficultyChangeTransition({
  onComplete,
}: DifficultyChangeTransitionProps) {
  const { currentScene, performanceTier } = useScene();
  const [isActive, setIsActive] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef(performance.now());

  const transition = currentScene.transitions.difficultyChange;
  const durationMs = parseInt(transition.duration);
  const perf = currentScene.performance[performanceTier];

  useEffect(() => {
    if (performanceTier === "static" || !perf.ambientGlow) {
      setIsActive(false);
      onComplete?.();
      return;
    }

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
    startTimeRef.current = performance.now();

    const animate = (currentTime: number) => {
      if (!ctx) return;

      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / durationMs, 1);
      const easedProgress = ease(progress, transition.easing);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      drawDifficultyTransition(ctx, transition.type, easedProgress, progress, canvas.width, canvas.height, currentScene);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsActive(false);
        onComplete?.();
      }
    };

    animate(performance.now());

    return () => {
      window.removeEventListener("resize", resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [transition, durationMs, performanceTier, perf.ambientGlow, onComplete, currentScene]);

  if (!isActive) return null;

  return (
    <canvas
      ref={canvasRef}
      className="difficulty-transition-overlay"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 9999,
      }}
      aria-hidden="true"
    />
  );
});

DifficultyChangeTransition.displayName = "DifficultyChangeTransition";

/**
 * RoundTransition - Handles round start/end transitions
 * Supports: pulse, reveal (start) | fade, collapse (end)
 */
export interface RoundTransitionProps {
  type: "start" | "end";
  onComplete?: () => void;
}

export const RoundTransition = memo(function RoundTransition({
  type,
  onComplete,
}: RoundTransitionProps) {
  const { currentScene, performanceTier } = useScene();
  const [isActive, setIsActive] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef(performance.now());

  const transition = type === "start" ? currentScene.transitions.roundStart : currentScene.transitions.roundEnd;
  const durationMs = parseInt(transition.duration);
  const perf = currentScene.performance[performanceTier];

  useEffect(() => {
    if (performanceTier === "static" || !perf.ambientGlow) {
      setIsActive(false);
      onComplete?.();
      return;
    }

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
    startTimeRef.current = performance.now();

    const animate = (currentTime: number) => {
      if (!ctx) return;

      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / durationMs, 1);
      const easedProgress = ease(progress, "cubic-bezier(0.2, 0.8, 0.2, 1)");

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (type === "start") {
        drawRoundStartTransition(ctx, transition.type, easedProgress, progress, canvas.width, canvas.height, currentScene);
      } else {
        drawRoundEndTransition(ctx, transition.type, easedProgress, progress, canvas.width, canvas.height, currentScene);
      }

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsActive(false);
        onComplete?.();
      }
    };

    animate(performance.now());

    return () => {
      window.removeEventListener("resize", resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [type, transition, durationMs, performanceTier, perf.ambientGlow, onComplete, currentScene]);

  if (!isActive) return null;

  return (
    <canvas
      ref={canvasRef}
      className="round-transition-overlay"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 9999,
      }}
      aria-hidden="true"
    />
  );
});

RoundTransition.displayName = "RoundTransition";

// Easing functions
function ease(t: number, easing: string): number {
  // Parse cubic-bezier
  const match = easing.match(/cubic-bezier\(([^)]+)\)/);
  if (match) {
    const [x1, y1, x2, y2] = match[1].split(",").map(Number);
    return cubicBezier(t, x1, y1, x2, y2);
  }

  // Named easings
  switch (easing) {
    case "ease-in":
      return t * t;
    case "ease-out":
      return 1 - (1 - t) * (1 - t);
    case "ease-in-out":
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    default:
      return t;
  }
}

function cubicBezier(t: number, x1: number, y1: number, x2: number, y2: number): number {
  // Newton-Raphson approximation for cubic bezier
  const xForT = (t: number) =>
    3 * Math.pow(1 - t, 2) * t * x1 + 3 * (1 - t) * Math.pow(t, 2) * x2 + Math.pow(t, 3);
  const yForT = (t: number) =>
    3 * Math.pow(1 - t, 2) * t * y1 + 3 * (1 - t) * Math.pow(t, 2) * y2 + Math.pow(t, 3);

  // Binary search for t given x
  let start = 0;
  let end = 1;
  for (let i = 0; i < 8; i++) {
    const mid = (start + end) / 2;
    if (xForT(mid) < t) start = mid;
    else end = mid;
  }
  return yForT((start + end) / 2);
}

// Transition drawing functions
function drawTransition(
  ctx: CanvasRenderingContext2D,
  type: string,
  direction: "enter" | "exit",
  progress: number,
  rawProgress: number,
  width: number,
  height: number,
  color: string
) {
  const centerX = width / 2;
  const centerY = height / 2;
  const maxRadius = Math.sqrt(width * width + height * height) / 2;

  // Parse color
  const [r, g, b] = color.startsWith("#")
    ? color.match(/.{2}/g)!.map((h) => parseInt(h, 16))
    : color.match(/\d+/g)!.map(Number);

  switch (type) {
    case "iris": {
      // Iris effect - expanding/contracting circle
      const radius = direction === "enter" ? maxRadius * (1 - progress) : maxRadius * progress;
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 1)`);
      gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      break;
    }
    case "morph": {
      // Morphing shape transition
      const sides = 6;
      const radius = direction === "enter" ? maxRadius * 1.5 * (1 - progress) : maxRadius * 1.5 * progress;
      drawPolygon(ctx, centerX, centerY, radius, sides, Math.PI * 2 * rawProgress);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.3 * (1 - progress)})`;
      ctx.fill();
      break;
    }
    case "slide": {
      // Slide from edge
      const offset = direction === "enter" ? width * (1 - progress) : width * progress;
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.4)`;
      ctx.fillRect(-offset, 0, width + offset * 2, height);
      break;
    }
    case "fade": {
      // Simple fade
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${direction === "enter" ? 1 - progress : progress})`;
      ctx.fillRect(0, 0, width, height);
      break;
    }
    case "particle": {
      // Particle burst
      const particleCount = 50;
      for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2;
        const radius = maxRadius * progress;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        const size = (1 - progress) * 20 * devicePixelRatio;

        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${1 - progress})`;
        ctx.fill();
      }
      break;
    }
  }
}

function drawPolygon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  sides: number,
  rotation: number
) {
  ctx.beginPath();
  for (let i = 0; i <= sides; i++) {
    const angle = (i / sides) * Math.PI * 2 + rotation;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawDifficultyTransition(
  ctx: CanvasRenderingContext2D,
  type: string,
  progress: number,
  rawProgress: number,
  width: number,
  height: number,
  scene: ScenePackage
) {
  const centerX = width / 2;
  const centerY = height / 2;
  const maxDim = Math.max(width, height);
  const primaryRgb = scene.colorTokens.primaryRgb.split(",").map(Number);
  const accentRgb = scene.colorTokens.accent.replace("#", "").match(/.{2}/g)!.map((h) => parseInt(h, 16));

  switch (type) {
    case "morph": {
      // Morphing hexagon to circle
      const sides = 6;
      const radius = maxDim * 0.6 * (1 - progress);
      drawPolygon(ctx, centerX, centerY, radius, sides, Math.PI * 2 * progress);
      ctx.fillStyle = `rgba(${primaryRgb[0]}, ${primaryRgb[1]}, ${primaryRgb[2]}, ${0.4 * (1 - progress)})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(${accentRgb[0]}, ${accentRgb[1]}, ${accentRgb[2]}, ${0.6 * (1 - progress)})`;
      ctx.lineWidth = 3 * devicePixelRatio;
      ctx.stroke();
      break;
    }
    case "particle": {
      // Hexagonal particle burst
      const hexCount = 30;
      for (let i = 0; i < hexCount; i++) {
        const angle = (i / hexCount) * Math.PI * 2;
        const currentRadius = maxDim * 0.6 * progress;
        const x = centerX + Math.cos(angle) * currentRadius;
        const y = centerY + Math.sin(angle) * currentRadius;
        const size = (1 - progress) * 15 * devicePixelRatio;
        const rotation = Math.PI * 2 * rawProgress * 2 + i * 0.5;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        drawPolygon(ctx, 0, 0, size, 6, 0);
        ctx.fillStyle = `rgba(${primaryRgb[0]}, ${primaryRgb[1]}, ${primaryRgb[2]}, ${1 - progress})`;
        ctx.fill();
        ctx.restore();
      }
      break;
    }
    case "pulse": {
      // Expanding/contracting pulse rings
      const ringCount = 3;
      for (let i = 0; i < ringCount; i++) {
        const delay = i * 0.15;
        const ringProgress = Math.min(Math.max((progress - delay) / (1 - delay), 0), 1);
        const radius = maxDim * 0.8 * ringProgress;
        const alpha = (1 - ringProgress) * 0.4;

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${accentRgb[0]}, ${accentRgb[1]}, ${accentRgb[2]}, ${alpha})`;
        ctx.lineWidth = 4 * devicePixelRatio;
        ctx.stroke();
      }
      break;
    }
  }
}

function drawRoundStartTransition(
  ctx: CanvasRenderingContext2D,
  type: string,
  progress: number,
  rawProgress: number,
  width: number,
  height: number,
  scene: ScenePackage
) {
  const centerX = width / 2;
  const centerY = height / 2;
  const maxDim = Math.max(width, height);
  const primaryRgb = scene.colorTokens.primaryRgb.split(",").map(Number);
  const accentRgb = scene.colorTokens.accent.replace("#", "").match(/.{2}/g)!.map((h) => parseInt(h, 16));

  if (type === "pulse") {
    // Pulse wave from center
    const ringCount = 5;
    for (let i = 0; i < ringCount; i++) {
      const delay = i * 0.1;
      const ringProgress = Math.min(Math.max((progress - delay) / (1 - delay), 0), 1);
      const radius = maxDim * 0.9 * ringProgress;
      const alpha = (1 - ringProgress) * 0.3;

      ctx.beginPath();
      const gradient = ctx.createRadialGradient(centerX, centerY, radius * 0.9, centerX, centerY, radius);
      gradient.addColorStop(0, `rgba(${primaryRgb[0]}, ${primaryRgb[1]}, ${primaryRgb[2]}, 0)`);
      gradient.addColorStop(0.5, `rgba(${accentRgb[0]}, ${accentRgb[1]}, ${accentRgb[2]}, ${alpha})`);
      gradient.addColorStop(1, `rgba(${primaryRgb[0]}, ${primaryRgb[1]}, ${primaryRgb[2]}, 0)`);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 3 * devicePixelRatio;
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (type === "reveal") {
    // Reveal from center
    const radius = maxDim * 1.2 * progress;
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, `rgba(${primaryRgb[0]}, ${primaryRgb[1]}, ${primaryRgb[2]}, 1)`);
    gradient.addColorStop(1, `rgba(${primaryRgb[0]}, ${primaryRgb[1]}, ${primaryRgb[2]}, 0)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }
}

function drawRoundEndTransition(
  ctx: CanvasRenderingContext2D,
  type: string,
  progress: number,
  rawProgress: number,
  width: number,
  height: number,
  scene: ScenePackage
) {
  const centerX = width / 2;
  const centerY = height / 2;
  const maxDim = Math.max(width, height);
  const primaryRgb = scene.colorTokens.primaryRgb.split(",").map(Number);

  if (type === "fade") {
    // Fade to scene color
    ctx.fillStyle = `rgba(${primaryRgb[0]}, ${primaryRgb[1]}, ${primaryRgb[2]}, ${progress})`;
    ctx.fillRect(0, 0, width, height);
  } else if (type === "collapse") {
    // Collapse to center
    const radius = maxDim * 1.2 * (1 - progress);
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, `rgba(${primaryRgb[0]}, ${primaryRgb[1]}, ${primaryRgb[2]}, 1)`);
    gradient.addColorStop(1, `rgba(${primaryRgb[0]}, ${primaryRgb[1]}, ${primaryRgb[2]}, 0)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }
}

/**
 * Hook for triggering transitions
 */
export function useTransitions() {
  const { currentScene } = useScene();
  const showingEnterRef = useRef(false);
  const showingExitRef = useRef(false);

  const triggerEnter = useCallback((onComplete?: () => void) => {
    if (showingEnterRef.current) return;
    showingEnterRef.current = true;
    // The SceneTransition component handles this via CSS custom properties
    // This is a helper for programmatic triggering
    setTimeout(() => {
      showingEnterRef.current = false;
      onComplete?.();
    }, parseInt(currentScene.transitions.enter.duration));
  }, [currentScene.transitions.enter.duration]);

  const triggerExit = useCallback((onComplete?: () => void) => {
    if (showingExitRef.current) return;
    showingExitRef.current = true;
    setTimeout(() => {
      showingExitRef.current = false;
      onComplete?.();
    }, parseInt(currentScene.transitions.exit.duration));
  }, [currentScene.transitions.exit.duration]);

  const triggerDifficultyChange = useCallback((onComplete?: () => void) => {
    setTimeout(() => {
      onComplete?.();
    }, parseInt(currentScene.transitions.difficultyChange.duration));
  }, [currentScene.transitions.difficultyChange.duration]);

  const triggerRoundStart = useCallback((onComplete?: () => void) => {
    setTimeout(() => {
      onComplete?.();
    }, parseInt(currentScene.transitions.roundStart.duration));
  }, [currentScene.transitions.roundStart.duration]);

  const triggerRoundEnd = useCallback((onComplete?: () => void) => {
    setTimeout(() => {
      onComplete?.();
    }, parseInt(currentScene.transitions.roundEnd.duration));
  }, [currentScene.transitions.roundEnd.duration]);

  return {
    triggerEnter,
    triggerExit,
    triggerDifficultyChange,
    triggerRoundStart,
    triggerRoundEnd,
  };
}
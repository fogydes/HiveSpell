import React, { useEffect, useState } from "react";
import { useOnGameplayEvent } from "@/hooks/useGameplayEvents";
import { useScene } from "@/context/SceneContext";
import type { ColorTokenSet } from "@/data/themes/sceneSpecs";
import { useReduceMotion } from "@/hooks/useAccessibility";
import { useTranslation } from "react-i18next";

export interface VictorySequenceProps {
  onComplete?: () => void;
}

/**
 * VictorySequence - Theater component for VICTORY events
 * Full-screen victory celebration with confetti, stats, and haptic feedback
 */
export const VictorySequence: React.FC<VictorySequenceProps> = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [eventData, setEventData] = useState<{
    winnerId: string;
    finalStats: Record<string, unknown>;
    timestamp: number;
  } | null>(null);
  const [showStats, setShowStats] = useState(false);
  const { currentScene, performanceTier } = useScene();
  const reduceMotion = useReduceMotion();
  const { t } = useTranslation();

  // Listen for VICTORY events
  useOnGameplayEvent(
    "VICTORY",
    (event) => {
      setEventData({
        winnerId: event.winnerId,
        finalStats: event.finalStats,
        timestamp: event.timestamp,
      });
      setIsVisible(true);
    },
    []
  );

  // Trigger haptic feedback on mobile
  useEffect(() => {
    if (eventData && "vibrate" in navigator) {
      navigator.vibrate([100, 50, 100, 50, 200]);
    }
  }, [eventData]);

  // Show stats after initial burst
  useEffect(() => {
    if (eventData) {
      setTimeout(() => setShowStats(true), 1500);
    }
  }, [eventData]);

  // Auto-hide after full sequence
  useEffect(() => {
    if (isVisible) {
      const duration = 5000;
      const timer = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  if (!isVisible || !eventData) return null;

  const { winnerId, finalStats } = eventData;
  const disableAnimations = performanceTier === "static" || reduceMotion;

  // Generate confetti particles
  const confettiCount = disableAnimations ? 0 : 50;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center pointer-events-none"
      style={{
        animation: disableAnimations ? "none" : undefined,
      }}
      aria-hidden="true"
    >
      {/* Full screen overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at center, ${currentScene.colorTokens.primary}/20 0%, transparent 70%)`,
          animation: disableAnimations
            ? "none"
            : `victoryBgPulse 2s ${currentScene.transitions.enter.easing} infinite alternate`,
        }}
      />

      {/* Confetti canvas */}
      {!disableAnimations && (
        <ConfettiCanvas
          colorTokens={currentScene.colorTokens}
          particleCount={confettiCount}
        />
      )}

      {/* Main content */}
      <div
        className="relative z-10 text-center flex-1 flex flex-col items-center justify-center p-8"
        style={{
          animation: disableAnimations
            ? "none"
            : `victoryEnter 1s ${currentScene.transitions.enter.easing} forwards`,
        }}
      >
        {/* Crown/Victory icon */}
        <div
          className="mb-6 text-6xl sm:text-8xl animate-bounce"
          style={{
            animation: disableAnimations
              ? "none"
              : `crownReveal 0.8s ${currentScene.transitions.enter.easing} 0.2s forwards`,
            opacity: 0,
          }}
        >
          👑
        </div>

        {/* Victory title */}
        <h1
          className="mb-2 text-3xl sm:text-5xl md:text-7xl font-bold tracking-tight"
          style={{
            color: currentScene.colorTokens.textMain,
            textShadow: `
              0 0 30px ${currentScene.colorTokens.primary},
              0 0 60px ${currentScene.colorTokens.primary},
              0 0 90px ${currentScene.colorTokens.primary}
            `,
            animation: disableAnimations
              ? "none"
              : `victoryTitleIn 0.8s ${currentScene.transitions.enter.easing} 0.3s forwards`,
            opacity: 0,
          }}
        >
          {t("victorySequence.title")}
        </h1>

        {/* Winner name */}
        <div
          className="mb-4 text-lg sm:text-xl text-primary/90 font-medium"
          style={{
            animation: disableAnimations
              ? "none"
              : `fadeSlideUp 0.4s ${currentScene.transitions.enter.easing} 0.5s forwards`,
            opacity: 0,
          }}
        >
          {t("victorySequence.winnerClaims", { winner: winnerId })}
        </div>

        {/* Stats panel */}
        {showStats && (
          <div
            className="w-full max-w-md mx-auto p-6 rounded-2xl border border-primary/30 bg-panel/90 backdrop-blur-xl"
            style={{
              animation: disableAnimations
                ? "none"
                : `statsSlideUp 0.6s ${currentScene.transitions.enter.easing} 0.8s forwards`,
              opacity: 0,
              transform: "translateY(30px)",
            }}
          >
            <div className="grid grid-cols-3 gap-4 text-center">
              <StatCard
                label={t("victorySequence.words")}
                value={String(finalStats.correctWords || "?")}
                color={currentScene.colorTokens.success}
              />
              <StatCard
                label={t("victorySequence.avgWpm")}
                value={String(finalStats.avgWpm || "?")}
                color={currentScene.colorTokens.primary}
              />
              <StatCard
                label={t("victorySequence.streak")}
                value={String(finalStats.maxStreak || "?")}
                color={currentScene.colorTokens.warning}
              />
            </div>
          </div>
        )}

        {/* Continue prompt */}
        <div
          className="mt-8 text-sm text-text-muted/60 animate-pulse"
          style={{
            animation: disableAnimations
              ? "none"
              : `fadeIn 0.5s ${currentScene.transitions.enter.easing} 2s forwards`,
            opacity: 0,
          }}
        >
          {t("victorySequence.pressToContinue")}
        </div>
      </div>

      <style>{`
        @keyframes victoryBgPulse {
          0% { opacity: 0.3; }
          100% { opacity: 0.6; }
        }

        @keyframes victoryEnter {
          0% {
            opacity: 0;
            transform: scale(0.9);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes crownReveal {
          0% {
            opacity: 0;
            transform: scale(0.3) rotate(-15deg);
          }
          50% {
            transform: scale(1.1) rotate(5deg);
          }
          100% {
            opacity: 1;
            transform: scale(1) rotate(0deg);
          }
        }

        @keyframes victoryTitleIn {
          0% {
            opacity: 0;
            transform: translateY(30px) scale(0.9);
            filter: blur(10px);
          }
          60% {
            transform: translateY(-5px) scale(1.02);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
        }

        @keyframes fadeSlideUp {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes statsSlideUp {
          0% {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes fadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

interface StatCardProps {
  label: string;
  value: string;
  color: string;
}

function StatCard({ label, value, color }: StatCardProps) {
  return (
    <div className="flex flex-col items-center">
      <div
        className="text-3xl font-bold font-mono mb-1"
        style={{ color, textShadow: `0 0 15px ${color}` }}
      >
        {value}
      </div>
      <div className="text-xs uppercase tracking-wider text-text-muted">
        {label}
      </div>
    </div>
  );
}

// Confetti Canvas Component
interface ConfettiCanvasProps {
  colorTokens: ColorTokenSet;
  particleCount: number;
}

function ConfettiCanvas({ colorTokens, particleCount }: ConfettiCanvasProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const particlesRef = React.useRef<
    Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      rotation: number;
      rotationSpeed: number;
      shape: "square" | "circle" | "triangle";
    }>
  >([]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Initialize particles
    const colors = [
      colorTokens.primary,
      colorTokens.accent,
      colorTokens.success,
      colorTokens.warning,
      colorTokens.info,
    ];

    particlesRef.current = Array.from({ length: particleCount }, () => ({
      x: Math.random() * canvas.width,
      y: -Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 3,
      vy: Math.random() * 3 + 1,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.2,
      shape: ["square", "circle", "triangle"][Math.floor(Math.random() * 3)] as
        | "square"
        | "circle"
        | "triangle",
    }));

    let animationId: number;

    const animate = () => {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05; // gravity
        p.rotation += p.rotationSpeed;

        // Reset if off screen
        if (p.y > canvas.height + 20) {
          p.y = -20;
          p.x = Math.random() * canvas.width;
          p.vy = Math.random() * 3 + 1;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;

        switch (p.shape) {
          case "square":
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            break;
          case "circle":
            ctx.beginPath();
            ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
            ctx.fill();
            break;
          case "triangle":
            ctx.beginPath();
            ctx.moveTo(0, -p.size / 2);
            ctx.lineTo(p.size / 2, p.size / 2);
            ctx.lineTo(-p.size / 2, p.size / 2);
            ctx.closePath();
            ctx.fill();
            break;
        }

        ctx.restore();
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationId);
    };
  }, [colorTokens, particleCount]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ width: "100%", height: "100%" }}
    />
  );
}

export default VictorySequence;
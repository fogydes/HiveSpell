import React, { useEffect, useState } from "react";
import { useOnGameplayEvent } from "@/hooks/useGameplayEvents";
import { useScene } from "@/context/SceneContext";
import type { ColorTokenSet } from "@/data/themes/sceneSpecs";
import { useTranslation } from "react-i18next";

export interface IntermissionCardProps {
  onComplete?: () => void;
}

/**
 * IntermissionCard - Theater component for INTERMISSION_START events
 * Shows round summary, next round countdown, and round transition
 */
export const IntermissionCard: React.FC<IntermissionCardProps> = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [eventData, setEventData] = useState<{
    duration: number;
    streak: number;
    timestamp: number;
  } | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const { currentScene, performanceTier } = useScene();
  const { t } = useTranslation();

  // Listen for INTERMISSION_START events
  useOnGameplayEvent(
    "INTERMISSION_START",
    (event) => {
      const durationSec = Math.ceil(event.duration / 1000);

      setEventData({
        duration: durationSec,
        streak: event.streak,
        timestamp: event.timestamp,
      });
      setTimeLeft(durationSec);
      setIsVisible(true);
    },
    []
  );

  // Countdown timer
  useEffect(() => {
    if (!isVisible || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          setIsVisible(false);
          onComplete?.();
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible, timeLeft, onComplete]);

  if (!isVisible || !eventData) return null;

  const { streak } = eventData;
  const disableAnimations = performanceTier === "static";

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none"
      style={{
        animation: disableAnimations ? "none" : undefined,
      }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at center, ${currentScene.colorTokens.primary}/10 0%, ${currentScene.colorTokens.app} 100%)`,
          animation: disableAnimations
            ? "none"
            : `backdropFadeIn 0.5s ${currentScene.transitions.enter.easing} forwards`,
        }}
      />

      {/* Floating particles */}
      {!disableAnimations && (
        <IntermissionParticles
          colorTokens={currentScene.colorTokens}
          streak={streak}
        />
      )}

      <div
        className="relative z-10 w-full max-w-md mx-6 p-6 sm:p-8 rounded-3xl border border-primary/20 bg-panel/95 backdrop-blur-xl shadow-2xl"
        style={{
          animation: disableAnimations
            ? "none"
            : `cardEnter 0.6s ${currentScene.transitions.enter.easing} forwards`,
          opacity: 0,
          transform: "translateY(30px) scale(0.95)",
        }}
      >
        {/* Round end header */}
        <div
          className="mb-6 text-center"
          style={{
            animation: disableAnimations
              ? "none"
              : `fadeSlideDown 0.4s ${currentScene.transitions.enter.easing} 0.1s forwards`,
            opacity: 0,
          }}
        >
          <div className="mb-2 text-xs font-bold tracking-widest uppercase text-primary/70">
            {t("intermissionCard.roundComplete")}
          </div>
          {streak > 0 && (
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl">🔥</span>
              <span className="text-xl font-bold text-text-main">{streak}</span>
              <span className="text-sm text-text-muted uppercase tracking-wide">{t("intermissionCard.streak")}</span>
            </div>
          )}
        </div>

        {/* Countdown timer */}
        <div
          className="mb-6 relative"
          style={{
            animation: disableAnimations
              ? "none"
              : `countdownReveal 0.5s ${currentScene.transitions.enter.easing} 0.3s forwards`,
            opacity: 0,
          }}
        >
          <div className="relative">
            {/* Circular progress */}
            <svg
              className="w-32 h-32 mx-auto transform -rotate-90"
              viewBox="0 0 128 128"
            >
              <circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke={currentScene.colorTokens.border}
                strokeWidth="4"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke={currentScene.colorTokens.primary}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={352} // 2 * π * 56
                strokeDashoffset={
                  352 * (1 - timeLeft / Math.max(eventData.duration, 1))
                }
                style={{
                  transition: "stroke-dashoffset 1s linear",
                  filter: `drop-shadow(0 0 8px ${currentScene.colorTokens.primary})`,
                }}
              />
            </svg>

            {/* Time display */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className="text-4xl sm:text-6xl font-bold font-mono"
                style={{
                  color: currentScene.colorTokens.textMain,
                  textShadow: `0 0 20px ${currentScene.colorTokens.primary}`,
                }}
              >
                {timeLeft}s
              </span>
            </div>
          </div>

          <div className="mt-3 text-center text-sm text-text-muted uppercase tracking-wide">
            {t("intermissionCard.nextRoundBeginsIn")}
          </div>
        </div>

        {/* Round stats preview */}
        <div
          className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-surface/50 border border-border"
          style={{
            animation: disableAnimations
              ? "none"
              : `fadeSlideUp 0.4s ${currentScene.transitions.enter.easing} 0.5s forwards`,
            opacity: 0,
          }}
        >
          <div className="text-center">
            <div className="text-lg font-bold font-mono text-primary">◉</div>
            <div className="text-xs text-text-muted uppercase tracking-wide">{t("intermissionCard.active")}</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold font-mono text-success">🐝</div>
            <div className="text-xs text-text-muted uppercase tracking-wide">{t("intermissionCard.hive")}</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold font-mono text-accent">⚡</div>
            <div className="text-xs text-text-muted uppercase tracking-wide">{t("intermissionCard.ready")}</div>
          </div>
        </div>

        {/* Tip of the round */}
        <div
          className="mt-6 p-4 rounded-xl bg-primary/10 border border-primary/20"
          style={{
            animation: disableAnimations
              ? "none"
              : `fadeSlideUp 0.4s ${currentScene.transitions.enter.easing} 0.7s forwards`,
            opacity: 0,
          }}
        >
          <div className="flex items-center gap-2 text-sm text-primary mb-1">
            <span>💡</span>
            <span className="font-bold tracking-wide">{t("intermissionCard.tip")}</span>
          </div>
          <p className="text-sm text-text-muted">
            {t(`intermissionCard.tips.${Math.floor(Math.random() * 8)}`)}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes backdropFadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }

        @keyframes cardEnter {
          0% {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes fadeSlideDown {
          0% {
            opacity: 0;
            transform: translateY(-15px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes countdownReveal {
          0% {
            opacity: 0;
            transform: scale(0.8);
          }
          60% {
            transform: scale(1.05);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes fadeSlideUp {
          0% {
            opacity: 0;
            transform: translateY(15px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

// Ambient particles during intermission
interface IntermissionParticlesProps {
  colorTokens: ColorTokenSet;
  streak: number;
}

function IntermissionParticles({ colorTokens, streak }: IntermissionParticlesProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const particlesRef = React.useRef<
    Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      opacity: number;
      life: number;
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

    // More particles for higher streaks
    const particleCount = 20 + streak * 2;

    const colors = [
      colorTokens.primary,
      colorTokens.accent,
      colorTokens.success,
    ];

    particlesRef.current = Array.from({ length: particleCount }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -Math.random() * 0.3 - 0.1,
      size: Math.random() * 3 + 1,
      color: colors[Math.floor(Math.random() * colors.length)],
      opacity: Math.random() * 0.5 + 0.2,
      life: Math.random() * 100 + 50,
    }));

    let animationId: number;

    const animate = () => {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 1;
        p.opacity = Math.max(0, p.life / 150);

        if (p.life <= 0 || p.y < -10) {
          // Respawn at bottom
          p.x = Math.random() * canvas.width;
          p.y = canvas.height + 10;
          p.vx = (Math.random() - 0.5) * 0.5;
          p.vy = -Math.random() * 0.3 - 0.1;
          p.life = Math.random() * 100 + 50;
          p.opacity = Math.random() * 0.5 + 0.2;
        }

        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationId);
    };
  }, [colorTokens, streak]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ width: "100%", height: "100%" }}
    />
  );
}

export default IntermissionCard;
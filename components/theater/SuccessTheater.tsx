import React, { useEffect, useState } from "react";
import { useOnGameplayEvent } from "@/hooks/useGameplayEvents";
import { useScene } from "@/context/SceneContext";
import { useReduceMotion } from "@/hooks/useAccessibility";
import { useTranslation } from "react-i18next";

export interface SuccessTheaterProps {
  onComplete?: () => void;
}

/**
 * SuccessTheater - Theater component for ANSWER_CORRECT events
 * Celebrates correct answers with streak-aware effects
 */
export const SuccessTheater: React.FC<SuccessTheaterProps> = ({ onComplete }) => {
  const { t } = useTranslation("successTheater");
  const [isVisible, setIsVisible] = useState(false);
  const [eventData, setEventData] = useState<{
    word: string;
    wpm: number;
    streak: number;
    timestamp: number;
  } | null>(null);
  const { currentScene, performanceTier } = useScene();
  const reduceMotion = useReduceMotion();

  // Listen for ANSWER_CORRECT events
  useOnGameplayEvent(
    "ANSWER_CORRECT",
    (event) => {
      setEventData({
        word: event.word,
        wpm: event.wpm,
        streak: event.streak,
        timestamp: event.timestamp,
      });
      setIsVisible(true);
    },
    []
  );

  // Auto-hide after animation
  useEffect(() => {
    if (isVisible) {
      const duration = 1500;
      const timer = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  if (!isVisible || !eventData) return null;

  const { word, wpm, streak } = eventData;
  const disableAnimations = performanceTier === "static" || reduceMotion;

  // Determine intensity based on streak
  const isStreakMilestone = [3, 5, 10, 20, 50].includes(streak);
  const streakIntensity = currentScene.cursor.streakIntensityMapping[streak as keyof typeof currentScene.cursor.streakIntensityMapping] || 1;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none"
      style={{
        animation: disableAnimations ? "none" : undefined,
      }}
      aria-hidden="true"
    >
      <div className="relative text-center">
        {/* Success burst background */}
        <div
          className="absolute inset-0 rounded-full blur-[150px] opacity-60"
          style={{
            background: `radial-gradient(circle, ${currentScene.colorTokens.success} 0%, transparent 70%)`,
            transform: "scale(0)",
            animation: disableAnimations
              ? "none"
              : `successBurst 0.8s ${currentScene.transitions.enter.easing} forwards`,
          }}
        />

        {/* Particle burst */}
        {[...Array(12)].map((_, i) => {
          const angle = (i / 12) * 360;
          const distance = 80 + streakIntensity * 40;
          return (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                background: currentScene.colorTokens.success,
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                animation: disableAnimations
                  ? "none"
                  : `particleBurst 0.8s ${currentScene.transitions.enter.easing} forwards`,
                animationDelay: `${i * 0.02}s`,
                transformOrigin: "center",
                opacity: 0,
                ["--particle-angle" as any]: `${angle}deg`,
                ["--particle-distance" as any]: `${distance}px`,
              }}
            />
          );
        })}

        {/* Main content */}
        <div
          className="relative z-10"
          style={{
            animation: disableAnimations
              ? "none"
              : `successPopIn 0.5s ${currentScene.transitions.enter.easing} forwards`,
          }}
        >
          {/* Word confirmation */}
          <div
            className="mb-2 text-sm font-medium tracking-wide text-success/80"
            style={{
              animation: disableAnimations
                ? "none"
                : `fadeSlideUp 0.3s ${currentScene.transitions.enter.easing} 0.1s forwards`,
              opacity: 0,
            }}
          >
            {t("successTheater.correctWord", { word })}
          </div>

          {/* WPM display */}
          <div
            className="mb-4 text-3xl sm:text-5xl font-bold font-mono"
            style={{
              color: currentScene.colorTokens.textMain,
              textShadow: `0 0 20px ${currentScene.colorTokens.success}`,
              animation: disableAnimations
                ? "none"
                : `wpmCountUp 0.6s ${currentScene.transitions.enter.easing} 0.2s forwards`,
            }}
          >
            {t("successTheater.wpm", { wpm })}
          </div>

          {/* Streak display */}
          <div
            className="flex items-center justify-center gap-3"
            style={{
              animation: disableAnimations
                ? "none"
                : `fadeSlideUp 0.3s ${currentScene.transitions.enter.easing} 0.4s forwards`,
              opacity: 0,
            }}
          >
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-panel/80 border border-success/30 backdrop-blur-sm"
            >
              <span className="text-lg">🔥</span>
              <span className="font-bold text-text-main">{streak}</span>
              <span className="text-xs text-text-muted uppercase tracking-wide">{t("successTheater.streak")}</span>
            </div>

            {/* Milestone badge */}
            {isStreakMilestone && (
              <div
                className="relative px-4 py-2 rounded-full bg-success/20 border border-success text-success font-bold text-sm uppercase tracking-wider animate-pulse"
              >
                {t("successTheater.milestone", { streak })}
              </div>
            )}
          </div>

          {/* Streak-specific message */}
          {isStreakMilestone && (
            <div
              className="mt-4 text-sm text-text-muted italic"
              style={{
                animation: disableAnimations
                  ? "none"
                  : `fadeIn 0.3s ${currentScene.transitions.enter.easing} 0.6s forwards`,
                opacity: 0,
              }}
            >
              {t(`successTheater.streakMessage${streak >= 50 ? 50 : streak >= 20 ? 20 : streak >= 10 ? 10 : streak >= 5 ? 5 : 3}`)}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes successBurst {
          0% {
            transform: scale(0);
            opacity: 0.8;
          }
          50% {
            transform: scale(1.5);
            opacity: 0.4;
          }
          100% {
            transform: scale(3);
            opacity: 0;
          }
        }

        @keyframes particleBurst {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(
              calc(-50% + cos(var(--particle-angle)) * var(--particle-distance)),
              calc(-50% + sin(var(--particle-angle)) * var(--particle-distance))
            ) scale(0);
            opacity: 0;
          }
        }

        @keyframes successPopIn {
          0% {
            opacity: 0;
            transform: scale(0.8) translateY(20px);
          }
          50% {
            transform: scale(1.05) translateY(-5px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes wpmCountUp {
          0% {
            opacity: 0;
            transform: scale(0.5);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes fadeSlideUp {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
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

function getStreakMessage(streak: number): string {
  if (streak >= 50) return "LEGENDARY. You are unstoppable. 👑";
  if (streak >= 20) return "DOMINATING. The hive trembles. 🐝";
  if (streak >= 10) return "ON FIRE. Keep the momentum! 🔥";
  if (streak >= 5) return "Building momentum... 🐝";
  if (streak >= 3) return "Getting warmed up!";
  return "";
}

export default SuccessTheater;
import React, { useEffect, useState } from "react";
import { useOnGameplayEvent } from "@/hooks/useGameplayEvents";
import { useScene } from "@/context/SceneContext";
import { useReduceMotion } from "@/hooks/useAccessibility";
import { useTranslation } from "react-i18next";

export interface FailureTheaterProps {
  onComplete?: () => void;
}

/**
 * FailureTheater - Theater component for ANSWER_INCORRECT events
 * Dramatic failure feedback with correct word reveal
 */
export const FailureTheater: React.FC<FailureTheaterProps> = ({ onComplete }) => {
  const { t } = useTranslation("failureTheater");
  const [isVisible, setIsVisible] = useState(false);
  const [eventData, setEventData] = useState<{
    word: string;
    typed: string;
    timestamp: number;
  } | null>(null);
  const { currentScene, performanceTier } = useScene();
  const reduceMotion = useReduceMotion();

  // Listen for ANSWER_INCORRECT events
  useOnGameplayEvent(
    "ANSWER_INCORRECT",
    (event) => {
      setEventData({
        word: event.word,
        typed: event.typed,
        timestamp: event.timestamp,
      });
      setIsVisible(true);
    },
    []
  );

  // Auto-hide after animation
  useEffect(() => {
    if (isVisible) {
      // Longer display for failure to allow reading
      const duration = 2500;
      const timer = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  if (!isVisible || !eventData) return null;

  const { word, typed } = eventData;
  const disableAnimations = performanceTier === "static" || reduceMotion;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none"
      style={{
        animation: disableAnimations ? "none" : undefined,
      }}
      aria-hidden="true"
    >
      <div className="relative text-center">
        {/* Failure flash background */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle, ${currentScene.colorTokens.error} 0%, transparent 60%)`,
            opacity: 0,
            animation: disableAnimations
              ? "none"
              : `failureFlash 0.3s ${currentScene.transitions.exit.easing} forwards`,
          }}
        />

        {/* Screen shake container */}
        <div
          className="relative z-10"
          style={{
            animation: disableAnimations
              ? "none"
              : `screenShake 0.5s ${currentScene.transitions.exit.easing} forwards`,
          }}
        >
          {/* Incorrect label */}
          <div
            className="mb-4 text-xs font-bold tracking-widest uppercase text-error/80"
            style={{
              animation: disableAnimations
                ? "none"
                : `fadeSlideDown 0.2s ${currentScene.transitions.exit.easing} forwards`,
            }}
          >
            ❌ {t("failureTheater.incorrect")}
          </div>

          {/* What you typed (crossed out) */}
          {typed && (
            <div
              className="mb-3 text-lg sm:text-xl font-mono text-line-through text-text-muted/60"
              style={{
                animation: disableAnimations
                  ? "none"
                  : `fadeSlideDown 0.2s ${currentScene.transitions.exit.easing} 0.1s forwards`,
                opacity: 0,
              }}
            >
              {typed}
            </div>
          )}

          {/* Correct word reveal */}
          <div
            className="mb-4 text-2xl sm:text-4xl font-bold font-serif"
            style={{
              color: currentScene.colorTokens.textMain,
              textShadow: `0 0 20px ${currentScene.colorTokens.error}`,
              animation: disableAnimations
                ? "none"
                : `wordReveal 0.5s ${currentScene.transitions.exit.easing} 0.2s forwards`,
              opacity: 0,
            }}
          >
            {t("failureTheater.correctWordWas", { word })}
          </div>

          {/* Encouragement message */}
          <div
            className="text-sm text-text-muted italic"
            style={{
              animation: disableAnimations
                ? "none"
                : `fadeIn 0.3s ${currentScene.transitions.exit.easing} 0.5s forwards`,
              opacity: 0,
            }}
          >
            {getEncouragementMessage()}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes failureFlash {
          0% { opacity: 0; }
          20% { opacity: 0.3; }
          50% { opacity: 0.15; }
          100% { opacity: 0; }
        }

        @keyframes screenShake {
          0%, 100% { transform: translateX(0); }
          10% { transform: translateX(-8px); }
          20% { transform: translateX(8px); }
          30% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          50% { transform: translateX(-4px); }
          60% { transform: translateX(4px); }
          70% { transform: translateX(-2px); }
          80% { transform: translateX(2px); }
          90% { transform: translateX(-1px); }
        }

        @keyframes fadeSlideDown {
          0% {
            opacity: 0;
            transform: translateY(-10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes wordReveal {
          0% {
            opacity: 0;
            transform: scale(0.8) translateY(10px);
            filter: blur(5px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
            filter: blur(0);
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

function getEncouragementMessage(): string {
  const messages = [
    "Close! Listen carefully and try again.",
    "Every miss teaches the next hit. 🐝",
    "The word was right there... almost!",
    "Shake it off. Next one's yours.",
    "Not quite. The hive believes in you.",
    "Mistakes are just practice in disguise.",
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

export default FailureTheater;
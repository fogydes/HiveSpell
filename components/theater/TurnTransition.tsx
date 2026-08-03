import React, { useEffect, useState } from "react";
import { useOnGameplayEvent } from "@/hooks/useGameplayEvents";
import { useScene } from "@/context/SceneContext";
import { useReduceMotion } from "@/hooks/useAccessibility";

export interface TurnTransitionProps {
  onComplete?: () => void;
}

/**
 * TurnTransition - Theater component for TURN_HANDOFF events
 * Smooth transition between turns with player indication
 */
export const TurnTransition: React.FC<TurnTransitionProps> = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [eventData, setEventData] = useState<{
    from: string;
    to: string;
    timeLeft: number;
    timestamp: number;
  } | null>(null);
  const { currentScene, performanceTier } = useScene();
  const reduceMotion = useReduceMotion();

  // Listen for TURN_HANDOFF events
  useOnGameplayEvent(
    "TURN_HANDOFF",
    (event) => {
      setEventData({
        from: event.from,
        to: event.to,
        timeLeft: event.timeLeft,
        timestamp: event.timestamp,
      });
      setIsVisible(true);
    },
    []
  );

  // Auto-hide after animation
  useEffect(() => {
    if (isVisible) {
      const duration = 1200;
      const timer = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  if (!isVisible || !eventData) return null;

  const { from, to, timeLeft } = eventData;
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
        {/* Transition sweep */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(90deg, transparent 40%, ${currentScene.colorTokens.primary} 50%, transparent 60%)`,
            transform: "translateX(-100%)",
            animation: disableAnimations
              ? "none"
              : `sweepAcross 0.8s ${currentScene.transitions.enter.easing} forwards`,
            opacity: 0.15,
          }}
        />

        <div
          className="relative z-10"
          style={{
            animation: disableAnimations
              ? "none"
              : `transitionPopIn 0.5s ${currentScene.transitions.enter.easing} forwards`,
          }}
        >
          {/* "Next Up" label */}
          <div
            className="mb-3 text-xs font-bold tracking-widest uppercase text-primary/70"
            style={{
              animation: disableAnimations
                ? "none"
                : `fadeSlideUp 0.3s ${currentScene.transitions.enter.easing} 0.1s forwards`,
              opacity: 0,
            }}
          >
            ⏭️ Next Up
          </div>

          {/* Player name with cursor-style highlight */}
          <div
            className="mb-2 text-2xl sm:text-4xl font-bold"
            style={{
              color: currentScene.colorTokens.textMain,
              animation: disableAnimations
                ? "none"
                : `nameReveal 0.4s ${currentScene.transitions.enter.easing} 0.2s forwards`,
              opacity: 0,
            }}
          >
            {to}
          </div>

          {/* Timer preview */}
          <div
            className="flex items-center justify-center gap-2 text-sm text-text-muted"
            style={{
              animation: disableAnimations
                ? "none"
                : `fadeSlideUp 0.3s ${currentScene.transitions.enter.easing} 0.4s forwards`,
              opacity: 0,
            }}
          >
            <span className="font-mono text-lg text-primary">{timeLeft.toFixed(1)}s</span>
            <span className="uppercase tracking-wider">per word</span>
          </div>

          {/* Visual separator */}
          <div
            className="mt-4 h-px w-24 mx-auto"
            style={{
              background: `linear-gradient(90deg, transparent, ${currentScene.colorTokens.primary}, transparent)`,
              animation: disableAnimations
                ? "none"
                : `lineExpand 0.4s ${currentScene.transitions.enter.easing} 0.5s forwards`,
              transformOrigin: "center",
              transform: "scaleX(0)",
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes sweepAcross {
          0% {
            transform: translateX(-100%);
            opacity: 0;
          }
          20% {
            opacity: 0.15;
          }
          80% {
            opacity: 0.15;
          }
          100% {
            transform: translateX(100%);
            opacity: 0;
          }
        }

        @keyframes transitionPopIn {
          0% {
            opacity: 0;
            transform: scale(0.9) translateY(15px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
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

        @keyframes nameReveal {
          0% {
            opacity: 0;
            transform: scale(0.7);
            filter: blur(8px);
          }
          60% {
            transform: scale(1.05);
          }
          100% {
            opacity: 1;
            transform: scale(1);
            filter: blur(0);
          }
        }

        @keyframes lineExpand {
          0% {
            transform: scaleX(0);
          }
          100% {
            transform: scaleX(1);
          }
        }
      `}</style>
    </div>
  );
};

export default TurnTransition;
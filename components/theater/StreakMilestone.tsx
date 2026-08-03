import React, { useEffect, useState } from "react";
import { useOnGameplayEvent } from "@/hooks/useGameplayEvents";
import { useScene } from "@/context/SceneContext";
import { useReduceMotion } from "@/hooks/useAccessibility";

export interface StreakMilestoneProps {
  onComplete?: () => void;
}

/**
 * StreakMilestone - Theater component for STREAK_MILESTONE events
 * Celebrates reaching streak milestones (5, 10, 15, 20, 25, 30, 40, 50)
 */
export const StreakMilestone: React.FC<StreakMilestoneProps> = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [eventData, setEventData] = useState<{
    streak: number;
    milestone: 5 | 10 | 15 | 20 | 25 | 30 | 40 | 50;
    timestamp: number;
  } | null>(null);
  const { currentScene, performanceTier } = useScene();
  const reduceMotion = useReduceMotion();

  // Listen for STREAK_MILESTONE events
  useOnGameplayEvent(
    "STREAK_MILESTONE",
    (event) => {
      setEventData({
        streak: event.streak,
        milestone: event.milestone,
        timestamp: event.timestamp,
      });
      setIsVisible(true);
    },
    []
  );

  // Auto-hide after animation
  useEffect(() => {
    if (isVisible && eventData) {
      // Show longer for bigger milestones
      const duration = 2000 + eventData.milestone * 50;
      const timer = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, eventData, onComplete]);

  if (!isVisible || !eventData) return null;

  const { streak, milestone } = eventData;
  const disableAnimations = performanceTier === "static" || reduceMotion;

  const milestoneLabels: Record<number, string> = {
    3: "GETTING STARTED",
    5: "BUILDING MOMENTUM",
    10: "ON FIRE!",
    20: "DOMINATING",
    50: "LEGENDARY",
  };

  const milestoneEmojis: Record<number, string> = {
    3: "🔥",
    5: "🔥🔥",
    10: "🔥🔥🔥",
    20: "👑🔥",
    50: "👑🐝👑",
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none"
      style={{
        animation: disableAnimations ? "none" : undefined,
      }}
      aria-hidden="true"
    >
      <div className="relative text-center">
        {/* Milestone burst background */}
        <div
          className="absolute inset-0 rounded-full blur-[150px] opacity-60"
          style={{
            background: `radial-gradient(circle, ${currentScene.colorTokens.warning} 0%, transparent 70%)`,
            transform: "scale(0)",
            animation: disableAnimations
              ? "none"
              : `milestoneBurst 1s ${currentScene.transitions.enter.easing} forwards`,
          }}
        />

        {/* Expanding rings */}
        {[1, 2, 3].map((ring) => (
          <div
            key={ring}
            className="absolute inset-0 rounded-full border-2"
            style={{
              borderColor: currentScene.colorTokens.warning,
              transform: "scale(0)",
              animation: disableAnimations
                ? "none"
                : `ringExpand 1s ${currentScene.transitions.enter.easing} ${ring * 0.1}s forwards`,
              opacity: 0,
            }}
          />
        ))}

        {/* Main content */}
        <div
          className="relative z-10"
          style={{
            animation: disableAnimations
              ? "none"
              : `milestonePopIn 0.6s ${currentScene.transitions.enter.easing} forwards`,
          }}
        >
          {/* Milestone label */}
          <div
            className="mb-3 text-xs font-bold tracking-widest uppercase"
            style={{
              color: currentScene.colorTokens.warning,
              textShadow: `0 0 15px ${currentScene.colorTokens.warning}`,
              animation: disableAnimations
                ? "none"
                : `fadeSlideDown 0.3s ${currentScene.transitions.enter.easing} 0.1s forwards`,
              opacity: 0,
            }}
          >
            {milestoneLabels[milestone] || "MILESTONE"}
          </div>

          {/* Emoji */}
          <div
            className="mb-2 text-4xl sm:text-6xl animate-bounce"
            style={{
              animation: disableAnimations
                ? "none"
                : `emojiPop 0.5s ${currentScene.transitions.enter.easing} 0.2s forwards`,
              opacity: 0,
            }}
          >
            {milestoneEmojis[milestone] || "🎉"}
          </div>

          {/* Streak number */}
          <div
            className="mb-2 text-5xl sm:text-7xl md:text-9xl font-bold font-mono"
            style={{
              color: currentScene.colorTokens.textMain,
              textShadow: `
                0 0 30px ${currentScene.colorTokens.warning},
                0 0 60px ${currentScene.colorTokens.warning}
              `,
              animation: disableAnimations
                ? "none"
                : `streakNumberIn 0.6s ${currentScene.transitions.enter.easing} 0.3s forwards`,
              opacity: 0,
            }}
          >
            {streak}
          </div>

          {/* "Streak" label */}
          <div
            className="text-sm font-medium tracking-widest uppercase text-text-muted/80"
            style={{
              animation: disableAnimations
                ? "none"
                : `fadeSlideUp 0.3s ${currentScene.transitions.enter.easing} 0.4s forwards`,
              opacity: 0,
            }}
          >
            STREAK
          </div>

          {/* Special message for high milestones */}
          {milestone >= 10 && (
            <div
              className="mt-4 text-sm text-text-muted italic"
              style={{
                animation: disableAnimations
                  ? "none"
                  : `fadeIn 0.3s ${currentScene.transitions.enter.easing} 0.6s forwards`,
                opacity: 0,
              }}
            >
              {getMilestoneMessage(milestone)}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes milestoneBurst {
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

        @keyframes ringExpand {
          0% {
            transform: scale(0);
            opacity: 0.6;
          }
          100% {
            transform: scale(2.5);
            opacity: 0;
          }
        }

        @keyframes milestonePopIn {
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

        @keyframes emojiPop {
          0% {
            opacity: 0;
            transform: scale(0.3) rotate(-20deg);
          }
          50% {
            transform: scale(1.2) rotate(10deg);
          }
          100% {
            opacity: 1;
            transform: scale(1) rotate(0deg);
          }
        }

        @keyframes streakNumberIn {
          0% {
            opacity: 0;
            transform: scale(0.5);
            filter: blur(10px);
          }
          60% {
            transform: scale(1.1);
          }
          100% {
            opacity: 1;
            transform: scale(1);
            filter: blur(0);
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

function getMilestoneMessage(milestone: number): string {
  switch (milestone) {
    case 10:
      return "Double digits! The hive takes notice. 🐝";
    case 20:
      return "Twenty straight. You're unstoppable! 👑";
    case 50:
      return "FIFTY. A living legend. The hive bows. 👑🐝👑";
    default:
      return "";
  }
}

export default StreakMilestone;
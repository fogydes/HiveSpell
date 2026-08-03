import React, { useEffect, useState } from "react";
import { useOnGameplayEvent } from "@/hooks/useGameplayEvents";
import { useScene } from "@/context/SceneContext";
import { useReduceMotion } from "@/hooks/useAccessibility";
import { useTranslation } from "react-i18next";

export interface WordRevealProps {
  word: string;
  onComplete?: () => void;
  delay?: number;
}

/**
 * WordReveal - Theater component for WORD_SPOKEN events
 * Dramatic reveal of the spoken word with scene-aware styling
 */
export const WordReveal: React.FC<WordRevealProps> = ({
  word,
  onComplete,
  delay = 0,
}) => {
  const { t } = useTranslation("wordReveal");
  const [isVisible, setIsVisible] = useState(false);
  const [displayWord, setDisplayWord] = useState("");
  const { currentScene, performanceTier } = useScene();
  const reduceMotion = useReduceMotion();

  // Listen for WORD_SPOKEN events
  const [wordSpokenEvent, setWordSpokenEvent] = useState<
    | { word: string; mode: string; definition?: string; timestamp: number }
    | null
  >(null);

  // Default easing for round transitions (since they don't have easing in spec)
  const roundStartEasing = "cubic-bezier(0.2, 0.8, 0.2, 1)";

  // Subscribe to WORD_SPOKEN events
  useOnGameplayEvent(
    "WORD_SPOKEN",
    (event) => setWordSpokenEvent(event),
    [setWordSpokenEvent]
  );

  const disableAnimations = performanceTier === "static" || reduceMotion;

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let animationId: number;

    const triggerReveal = () => {
      if (word) {
        setDisplayWord(word);
        timeoutId = setTimeout(() => {
          setIsVisible(true);

          // Auto-complete after animation
          const duration = parseInt(currentScene.transitions.roundStart.duration) || 1000;
          animationId = requestAnimationFrame(() => {
            setTimeout(() => {
              setIsVisible(false);
              onComplete?.();
            }, duration + delay);
          });
        }, delay);
      }
    };

    // Trigger on event or initial word
    if (wordSpokenEvent) {
      // Only reveal if the event word matches or we don't have a word yet
      if (!word || wordSpokenEvent.word === word) {
        triggerReveal();
      }
    } else if (word) {
      triggerReveal();
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [wordSpokenEvent, word, onComplete, delay, currentScene.transitions.roundStart.duration]);

  if (!isVisible || !displayWord) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none"
      style={{
        animation: disableAnimations ? "none" : undefined,
      }}
      aria-hidden="true"
    >
      <div className="relative">
        {/* Background glow pulse */}
        <div
          className="absolute inset-0 rounded-full blur-[100px] opacity-50 animate-pulse"
          style={{
            background: `radial-gradient(circle, ${currentScene.colorTokens.primary} 0%, transparent 70%)`,
            transform: "scale(2)",
            animationDuration: "1.5s",
            animationIterationCount: "infinite",
          }}
        />

        {/* Word reveal container */}
        <div
          className="text-center"
          style={{
            animation: disableAnimations
              ? "none"
              : `wordRevealIn ${currentScene.transitions.roundStart.duration} ${roundStartEasing} forwards`,
          }}
        >
          {/* "Listening" label */}
          <div
            className="mb-4 text-xs font-bold tracking-widest uppercase text-primary/70"
            style={{
              animation: disableAnimations
                ? "none"
                : `fadeIn 0.3s ${roundStartEasing} forwards`,
            }}
          >
            {t("listening")}
          </div>

          {/* The word */}
          <div
            className="font-serif text-4xl sm:text-6xl md:text-8xl font-bold tracking-tight select-none"
            style={{
              color: currentScene.colorTokens.textMain,
              textShadow: `
                0 0 20px ${currentScene.colorTokens.primary},
                0 0 40px ${currentScene.colorTokens.primary},
                0 0 60px ${currentScene.colorTokens.primary}
              `,
              animation: disableAnimations
                ? "none"
                : `wordPopIn 0.6s ${roundStartEasing} 0.2s forwards`,
              opacity: 0,
            }}
          >
            {displayWord}
          </div>

          {/* Decorative line */}
          <div
            className="mt-4 h-px w-32 mx-auto"
            style={{
              background: `linear-gradient(90deg, transparent, ${currentScene.colorTokens.primary}, transparent)`,
              animation: disableAnimations
                ? "none"
                : `lineExpand 0.5s ${roundStartEasing} 0.5s forwards`,
              transformOrigin: "center",
              transform: "scaleX(0)",
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes wordRevealIn {
          0% {
            opacity: 0;
            transform: scale(0.9) translateY(20px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes wordPopIn {
          0% {
            opacity: 0;
            transform: scale(0.5);
            filter: blur(10px);
          }
          50% {
            transform: scale(1.1);
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

        @keyframes fadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default WordReveal;
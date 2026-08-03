import React from "react";
import { useTutorial, type TutorialStep } from "@/hooks/useTutorial";
import { useScene } from "@/context/SceneContext";
import { useReduceMotion } from "@/hooks/useAccessibility";

interface TutorialOverlayProps {
  /** Custom render prop for step-specific highlighted elements */
  children?: React.ReactNode;
}

/**
 * TutorialOverlay - Full-screen overlay that guides new users through the game mechanics
 * Shows one step at a time with progressive disclosure
 */
export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ children }) => {
  const {
    isActive,
    currentStep,
    stepIndex,
    totalSteps,
    nextStep,
    prevStep,
    skipTutorial,
    completeTutorial,
    getCurrentStepInfo,
    getProgress,
  } = useTutorial();
  const { currentScene, performanceTier } = useScene();
  const reduceMotion = useReduceMotion();
  const disableAnimations = performanceTier === "static" || reduceMotion;

  if (!isActive) return null;

  const stepInfo = getCurrentStepInfo();
  const progress = getProgress();
  const isLastStep = currentStep === "complete";

  const stepIcons: Record<TutorialStep, string> = {
    welcome: "🐝",
    listen: "🔊",
    type: "⌨️",
    submit: "⏎",
    streak: "🔥",
    eliminate: "⏱️",
    victory: "👑",
    complete: "✨",
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (isLastStep) {
        completeTutorial();
      } else {
        nextStep();
      }
    } else if (e.key === "ArrowLeft" && stepIndex > 0) {
      e.preventDefault();
      prevStep();
    } else if (e.key === "Escape") {
      skipTutorial();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label="HiveSpell Tutorial"
    >
      {/* Background dim */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        style={{
          animation: disableAnimations ? "none" : "fadeIn 0.3s ease-out forwards",
        }}
      />

      {/* Progress bar at top */}
      <div
        className="absolute top-4 left-4 right-4 h-1 bg-slate-800/50 rounded-full overflow-hidden"
        style={{
          animation: disableAnimations ? "none" : "slideDown 0.3s ease-out forwards",
        }}
      >
        <div
          className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
          style={{
            width: `${progress}%`,
            animation: disableAnimations ? "none" : undefined,
          }}
        />
      </div>

      {/* Step counter */}
      <div
        className="absolute top-4 left-1/2 -translate-x-1/2 text-xs font-mono text-text-muted/70"
        style={{
          animation: disableAnimations ? "none" : "fadeIn 0.3s ease-out 0.1s forwards",
          opacity: 0,
        }}
      >
        Step {stepIndex + 1} of {totalSteps}
      </div>

      {/* Main content */}
      <div className="relative flex-1 flex items-center justify-center p-8">
        <div
          className="relative w-full max-w-2xl mx-auto text-center"
          style={{
            animation: disableAnimations
              ? "none"
              : "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
            opacity: 0,
          }}
        >
          {/* Step icon */}
          <div
            className="mb-6 text-6xl sm:text-8xl animate-bounce-gentle"
            style={{
              animation: disableAnimations
                ? "none"
                : "iconPop 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards",
              opacity: 0,
            }}
          >
            {stepIcons[currentStep]}
          </div>

          {/* Step title */}
          <h2
            className="mb-4 text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-text-main"
            style={{
              animation: disableAnimations
                ? "none"
                : "fadeSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards",
              opacity: 0,
            }}
          >
            {stepInfo.title}
          </h2>

          {/* Step description */}
          <p
            className="mb-10 text-lg sm:text-xl leading-relaxed text-text-muted max-w-xl mx-auto"
            style={{
              animation: disableAnimations
                ? "none"
                : "fadeSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.4s forwards",
              opacity: 0,
            }}
          >
            {stepInfo.description}
          </p>

          {/* Highlight indicator for current step */}
          {stepInfo.highlight && (
            <div
              className="mb-8 flex items-center justify-center gap-2 text-sm text-primary/80"
              style={{
                animation: disableAnimations
                  ? "none"
                  : "pulse 1.5s ease-in-out infinite 0.5s forwards",
                opacity: 0,
              }}
            >
              <kbd className="px-2 py-1 rounded bg-panel border border-surface font-mono">
                {currentStep === "listen" && "🔊"}
                {currentStep === "type" && "Type..."}
                {currentStep === "submit" && "Enter"}
                {currentStep === "streak" && "🔥"}
                {currentStep === "eliminate" && "⏱️"}
              </kbd>
              <span>Try it in the game →</span>
            </div>
          )}

          {/* Navigation buttons */}
          <div
            className="flex items-center justify-center gap-4"
            style={{
              animation: disableAnimations
                ? "none"
                : "fadeSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.5s forwards",
              opacity: 0,
            }}
          >
            {stepIndex > 0 && (
              <button
                onClick={prevStep}
                className="rounded-xl border border-surface bg-panel/50 px-6 py-3 text-sm font-semibold text-text-main transition-all hover:border-primary hover:text-primary hover:bg-panel"
                style={{
                  animation: disableAnimations ? "none" : undefined,
                }}
              >
                ← Back
              </button>
            )}

            {stepIndex > 0 && <div className="flex-1" />}

            {!isLastStep ? (
              <>
                <button
                  onClick={skipTutorial}
                  className="rounded-xl px-6 py-3 text-sm font-medium text-text-muted transition-colors hover:text-text-main"
                >
                  Skip
                </button>
                <button
                  onClick={nextStep}
                  className="rounded-xl bg-primary px-8 py-3 text-sm font-black uppercase tracking-wider text-app transition-all hover:scale-105"
                  style={{
                    boxShadow: "var(--theme-shadow-glow)",
                  }}
                >
                  Next →
                </button>
              </>
            ) : (
              <button
                onClick={completeTutorial}
                className="rounded-xl bg-primary px-10 py-4 text-lg font-black uppercase tracking-[0.18em] text-app transition-all hover:scale-105"
                style={{
                  boxShadow: "var(--theme-shadow-glow)",
                }}
              >
                Start Playing!
              </button>
            )}
          </div>

          {/* Keyboard hints */}
          <div
            className="mt-8 flex items-center justify-center gap-4 text-xs text-text-muted/50 font-mono"
            style={{
              animation: disableAnimations
                ? "none"
                : "fadeIn 0.3s ease-out 0.6s forwards",
              opacity: 0,
            }}
          >
            <kbd className="px-2 py-1 rounded bg-slate-800/50 border border-slate-700">
              ←
            </kbd>
            <span>/</span>
            <kbd className="px-2 py-1 rounded bg-slate-800/50 border border-slate-700">
              →
            </kbd>
            <span>Navigate</span>
            <span>•</span>
            <kbd className="px-2 py-1 rounded bg-slate-800/50 border border-slate-700">
              Esc
            </kbd>
            <span>Skip</span>
            <span>•</span>
            <kbd className="px-2 py-1 rounded bg-slate-800/50 border border-slate-700">
              Enter
            </kbd>
            <span>Next</span>
          </div>
        </div>
      </div>

      {/* Skip button at bottom right for easy access */}
      {!isLastStep && (
        <button
          onClick={skipTutorial}
          className="absolute bottom-4 right-4 rounded-lg bg-slate-900/50 px-4 py-2 text-sm font-medium text-text-muted/70 backdrop-blur transition-all hover:text-text-main hover:bg-slate-900/80"
          style={{
            animation: disableAnimations ? "none" : "fadeIn 0.3s ease-out 0.2s forwards",
            opacity: 0,
          }}
        >
          Skip Tutorial
        </button>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeSlideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes iconPop {
          0% {
            opacity: 0;
            transform: scale(0.5) rotate(-10deg);
          }
          50% {
            transform: scale(1.1) rotate(5deg);
          }
          100% {
            opacity: 1;
            transform: scale(1) rotate(0deg);
          }
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }

        .animate-bounce-gentle {
          animation: bounceGentle 2s ease-in-out infinite;
        }

        @keyframes bounceGentle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
};

export default TutorialOverlay;
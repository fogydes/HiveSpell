import React, { useState } from "react";
import { useProfileCompletion, type ProfileCompletionStep, PROFILE_COMPLETION_KEY } from "@/hooks/useProfileCompletion";
import { useAuth } from "@/context/AuthContext";
import { useScene } from "@/context/SceneContext";
import { supabase } from "@/services/supabase";

interface ProfileCompletionOverlayProps {
  onComplete?: () => void;
}

/**
 * ProfileCompletionOverlay - Progressive profile setup with rewards
 * Guides new users through username, avatar, theme, and cursor selection
 */
export const ProfileCompletionOverlay: React.FC<ProfileCompletionOverlayProps> = ({
  onComplete,
}) => {
  const {
    isActive,
    currentStep,
    stepIndex,
    totalSteps,
    nextStep,
    prevStep,
    completeProfile,
    getCurrentStepInfo,
    getStepReward,
    getProgress,
    isStepCompleted,
    avatarOptions,
    themeOptions,
  } = useProfileCompletion();
  const { user, userData, refreshUser } = useAuth();
  const { currentScene, performanceTier } = useScene();
  const disableAnimations = performanceTier === "static";

  const [usernameInput, setUsernameInput] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState<string>(userData?.avatarUrl || "bee");
  const [selectedTheme, setSelectedTheme] = useState<string>(userData?.equippedTheme || "hive");
  const [selectedCursor, setSelectedCursor] = useState<string>("default");
  const [isSaving, setIsSaving] = useState(false);

  if (!isActive) return null;

  const stepInfo = getCurrentStepInfo();
  const progress = getProgress();
  const isLastStep = currentStep === "complete";

  const stepIcons: Record<ProfileCompletionStep, string> = {
    username: "🏷️",
    avatar: "🎭",
    theme: "🎨",
    cursor: "🖱️",
    complete: "✨",
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (currentStep === "username" && usernameInput.trim()) {
        handleSaveUsername();
      } else if (isLastStep) {
        completeProfile();
        onComplete?.();
      } else {
        nextStep();
      }
    } else if (e.key === "ArrowRight" && !isLastStep) {
      e.preventDefault();
      nextStep();
    } else if (e.key === "ArrowLeft" && stepIndex > 0) {
      e.preventDefault();
      prevStep();
    } else if (e.key === "Escape") {
      if (!isLastStep) return;
    }
  };

  const handleSaveUsername = async () => {
    const trimmed = usernameInput.trim();
    if (!trimmed) {
      setUsernameError("Username cannot be empty");
      return;
    }
    if (trimmed.length < 2) {
      setUsernameError("Username must be at least 2 characters");
      return;
    }
    if (trimmed.length > 20) {
      setUsernameError("Username must be 20 characters or less");
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
      setUsernameError("Only letters, numbers, underscore and hyphen allowed");
      return;
    }

    setIsSaving(true);
    setUsernameError("");

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ username: trimmed })
        .eq("id", user?.uid);

      if (error) throw error;

      localStorage.setItem(PROFILE_COMPLETION_KEY, "avatar");
      nextStep();
      await refreshUser();
    } catch (error) {
      console.error("Failed to save username:", error);
      setUsernameError("Failed to save. Try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAvatar = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: `avatar_${selectedAvatar}` })
        .eq("id", user?.uid);

      if (error) throw error;

      localStorage.setItem(PROFILE_COMPLETION_KEY, "theme");
      nextStep();
      await refreshUser();
    } catch (error) {
      console.error("Failed to save avatar:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveTheme = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ equipped_theme: selectedTheme })
        .eq("id", user?.uid);

      if (error) throw error;

      localStorage.setItem(PROFILE_COMPLETION_KEY, "cursor");
      nextStep();
      await refreshUser();
    } catch (error) {
      console.error("Failed to save theme:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCursor = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ equipped_cursor: selectedCursor })
        .eq("id", user?.uid);

      if (error) throw error;

      nextStep(); // Goes to complete
      await refreshUser();
    } catch (error) {
      console.error("Failed to save cursor:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = () => {
    switch (currentStep) {
      case "username":
        handleSaveUsername();
        break;
      case "avatar":
        handleSaveAvatar();
        break;
      case "theme":
        handleSaveTheme();
        break;
      case "cursor":
        handleSaveCursor();
        break;
      default:
        nextStep();
    }
  };

  // Initialize username input with current username if available
  React.useEffect(() => {
    if (currentStep === "username" && userData?.username && !usernameInput) {
      setUsernameInput(userData.username);
    }
  }, [currentStep, userData?.username]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label="Profile Setup"
    >
      {/* Background dim */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
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
            className="mb-3 text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-text-main"
            style={{
              animation: disableAnimations
                ? "none"
                : "fadeSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards",
              opacity: 0,
            }}
          >
            {stepInfo.title}
          </h2>

          {/* Reward badge */}
          {stepInfo.reward && (
            <div
              className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/20 px-4 py-1 text-sm font-bold text-primary"
              style={{
                animation: disableAnimations
                  ? "none"
                  : "fadeSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.35s forwards",
                opacity: 0,
              }}
            >
              🍯 {stepInfo.reward}
            </div>
          )}

          {/* Step description */}
          <p
            className="mb-8 text-lg sm:text-xl leading-relaxed text-text-muted max-w-xl mx-auto"
            style={{
              animation: disableAnimations
                ? "none"
                : "fadeSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.4s forwards",
              opacity: 0,
            }}
          >
            {stepInfo.description}
          </p>

          {/* Step-specific content */}
          <div
            className="mb-10"
            style={{
              animation: disableAnimations
                ? "none"
                : "fadeSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.5s forwards",
              opacity: 0,
            }}
          >
            {renderStepContent()}
          </div>

          {/* Navigation buttons */}
          <div
            className="flex items-center justify-center gap-4"
            style={{
              animation: disableAnimations
                ? "none"
                : "fadeSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.6s forwards",
              opacity: 0,
            }}
          >
            {stepIndex > 0 && (
              <button
                onClick={prevStep}
                disabled={isSaving}
                className="rounded-xl border border-surface bg-panel/50 px-6 py-3 text-sm font-semibold text-text-main transition-all hover:border-primary hover:text-primary hover:bg-panel disabled:opacity-50"
              >
                ← Back
              </button>
            )}

            {stepIndex > 0 && <div className="flex-1" />}

            {!isLastStep ? (
              <button
                onClick={handleNext}
                disabled={isSaving || (currentStep === "username" && !usernameInput.trim())}
                className="rounded-xl bg-primary px-8 py-3 text-sm font-black uppercase tracking-wider text-app transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  boxShadow: "var(--theme-shadow-glow)",
                }}
              >
                {isSaving ? "Saving..." : "Next →"}
              </button>
            ) : (
              <button
                onClick={() => {
                  completeProfile();
                  onComplete?.();
                }}
                className="rounded-xl bg-primary px-10 py-4 text-lg font-black uppercase tracking-[0.18em] text-app transition-all hover:scale-105"
                style={{
                  boxShadow: "var(--theme-shadow-glow)",
                }}
              >
                Enter the Arena!
              </button>
            )}
          </div>

          {/* Keyboard hints */}
          <div
            className="mt-8 flex items-center justify-center gap-4 text-xs text-text-muted/50 font-mono"
            style={{
              animation: disableAnimations
                ? "none"
                : "fadeIn 0.3s ease-out 0.7s forwards",
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
              Enter
            </kbd>
            <span>Confirm</span>
          </div>
        </div>
      </div>

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

        @keyframes bounceGentle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        .animate-bounce-gentle {
          animation: bounceGentle 2s ease-in-out infinite;
        }

        .avatar-option, .theme-option, .cursor-option {
          transition: all 0.2s ease;
        }

        .avatar-option:hover, .theme-option:hover, .cursor-option:hover {
          transform: translateY(-4px) scale(1.05);
        }

        .avatar-option.selected, .theme-option.selected, .cursor-option.selected {
          border-color: var(--accent) !important;
          box-shadow: 0 0 20px color-mix(in srgb, var(--accent) 40%, transparent);
        }

        input[type="text"] {
          -webkit-appearance: none;
        }

        input[type="text"]:focus {
          outline: none;
        }
      `}</style>
    </div>
  );

  function renderStepContent() {
    switch (currentStep) {
      case "username":
        return (
          <div className="max-w-md mx-auto">
            <input
              type="text"
              value={usernameInput}
              onChange={(e) => {
                setUsernameInput(e.target.value);
                setUsernameError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSaveUsername()}
              placeholder="Enter your hive name"
              className="w-full px-6 py-4 text-center text-xl font-bold text-text-main bg-panel/50 border-2 rounded-xl transition-all placeholder:text-text-muted/40"
              style={{
                borderColor: usernameError ? "var(--theme-error)" : "var(--theme-border)",
                boxShadow: usernameError
                  ? "0 0 0 3px color-mix(in srgb, var(--theme-error) 30%, transparent)"
                  : "none",
              }}
              autoFocus
              maxLength={20}
            />
            {usernameError && (
              <p className="mt-3 text-sm text-theme-error animate-shake">
                {usernameError}
              </p>
            )}
            <p className="mt-2 text-xs text-text-muted/60">
              2-20 characters • letters, numbers, _ -
            </p>
          </div>
        );

      case "avatar":
        return (
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {avatarOptions.map((avatar) => (
                <button
                  key={avatar.id}
                  onClick={() => setSelectedAvatar(avatar.id)}
                  className={`aspect-square rounded-2xl border-4 flex flex-col items-center justify-center gap-2 transition-all ${
                    selectedAvatar === avatar.id
                      ? "selected"
                      : "avatar-option border-surface hover:border-primary/50"
                  }`}
                  style={{
                    background: selectedAvatar === avatar.id
                      ? "color-mix(in srgb, var(--accent) 15%, var(--panel))"
                      : "var(--panel)",
                  }}
                >
                  <span className="text-5xl sm:text-7xl">{avatar.emoji}</span>
                  <span className="font-semibold text-text-main">{avatar.label}</span>
                </button>
              ))}
            </div>
            <p className="mt-4 text-sm text-text-muted">Click an avatar to select</p>
          </div>
        );

      case "theme":
        return (
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {Object.entries(themeOptions).map(([id, theme]) => {
                const descriptions: Record<string, string> = {
                  hive: "Classic hive aesthetic",
                  royal: "Golden luxury",
                  ice: "Frosty precision",
                  forest: "Natural vitality",
                  theme_honey: "Sweet amber glow",
                  theme_night: "Stellar elegance",
                };
                return (
                  <button
                    key={id}
                    onClick={() => setSelectedTheme(id)}
                    className={`aspect-square rounded-2xl border-4 flex flex-col items-center justify-center gap-3 p-4 transition-all ${
                      selectedTheme === id
                        ? "selected"
                        : "theme-option border-surface hover:border-primary/50"
                    }`}
                    style={{
                      background: selectedTheme === id
                        ? `linear-gradient(135deg, ${theme.colors?.primary || "#10b981"}22, ${theme.colors?.accent || "#f59e0b"}22)`
                        : "var(--panel)",
                      borderColor: selectedTheme === id
                        ? theme.colors?.primary || "var(--accent)"
                        : "var(--theme-border)",
                    }}
                  >
                    <div
                      className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl"
                      style={{
                        background: `linear-gradient(135deg, ${theme.colors?.primary || "#10b981"}, ${theme.colors?.accent || "#f59e0b"})`,
                      }}
                    >
                      🎨
                    </div>
                    <span className="font-bold text-text-main">{theme.name}</span>
                    <span className="text-xs text-text-muted font-medium">
                      {descriptions[id] || "Unique visual style"}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-4 text-sm text-text-muted">
              Click a theme to preview • Each has unique visual effects
            </p>
          </div>
        );

      case "cursor":
        const cursorOptions = [
          { id: "default", label: "Classic", preview: "▸", description: "Clean and simple" },
          { id: "trail", label: "Trail", preview: "✦", description: "Leaves a particle trail" },
          { id: "honey", label: "Honey Drop", preview: "🍯", description: "Sweet golden cursor" },
          { id: "stinger", label: "Stinger", preview: "🐝", description: "Sharp and precise" },
          { id: "hex", label: "Hexagon", preview: "⬡", description: "Geometric precision" },
          { id: "pulse", label: "Pulse", preview: "◉", description: "Rhythmic pulsing" },
        ];
        return (
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {cursorOptions.map((cursor) => (
                <button
                  key={cursor.id}
                  onClick={() => setSelectedCursor(cursor.id)}
                  className={`aspect-square rounded-2xl border-4 flex flex-col items-center justify-center gap-2 transition-all ${
                    selectedCursor === cursor.id
                      ? "selected"
                      : "cursor-option border-surface hover:border-primary/50"
                  }`}
                  style={{
                    background: selectedCursor === cursor.id
                      ? "color-mix(in srgb, var(--accent) 15%, var(--panel))"
                      : "var(--panel)",
                  }}
                >
                  <span className="text-5xl sm:text-7xl animate-pulse-slow">{cursor.preview}</span>
                  <span className="font-semibold text-text-main">{cursor.label}</span>
                  <span className="text-xs text-text-muted text-center px-2">
                    {cursor.description}
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-4 text-sm text-text-muted">
              Click a cursor to select • Your cursor leaves a trail in-game
            </p>
          </div>
        );

      case "complete":
        return (
          <div className="max-w-md mx-auto space-y-4">
            <div className="flex items-center justify-center gap-3 text-3xl">
              <span>🍯</span>
              <span className="text-4xl font-black text-primary">+125</span>
              <span>Nectar Earned!</span>
            </div>
            <div className="grid grid-cols-4 gap-3 text-center">
              {[
                { label: "Username", value: "+50" },
                { label: "Avatar", value: "+25" },
                { label: "Theme", value: "+25" },
                { label: "Cursor", value: "+25" },
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-panel/50 p-3 border border-surface">
                  <div className="text-xl font-black text-primary">{item.value}</div>
                  <div className="text-xs text-text-muted">{item.label}</div>
                </div>
              ))}
            </div>
            <p className="text-text-muted text-sm">
              Use nectar in the shop for more cosmetics!
            </p>
          </div>
        );

      default:
        return null;
    }
  }
};

export default ProfileCompletionOverlay;
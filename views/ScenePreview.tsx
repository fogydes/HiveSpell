import React, { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { useScene } from "@/context/SceneContext";
import { SceneProvider } from "@/context/SceneContext";
import { useCursorTrail, CursorTrailRenderer } from "@/hooks/useCursorTrail";
import {
  SCENE_PACKAGES,
  DEFAULT_SCENE_ID,
  getScenePackage,
  type SceneId,
} from "@/data/themes/scenePackages";

// Lazy-load heavy scene layer components to reduce initial bundle size
const AmbientBase = lazy(() => import("@/components/scene/AmbientBase").then((mod) => ({ default: mod.AmbientBase })));
const ParticleField = lazy(() => import("@/components/scene/ParticleField").then((mod) => ({ default: mod.ParticleField })));
const AudioReactive = lazy(() => import("@/components/scene/AudioReactive").then((mod) => ({ default: mod.AudioReactive })));

const SCENE_IDS: SceneId[] = ["default", "neon", "nature", "cyber", "minimal"];

const SCENE_METADATA: Record<SceneId, { label: string; description: string }> = {
  default: { label: "Hive Classic", description: "Warm gold & honey tones with organic pollen particles" },
  neon: { label: "Neon Grid", description: "Electric cyan/pink with digital rain & circuit particles" },
  nature: { label: "Forest Bloom", description: "Earthy greens with floating leaf & pollen particles" },
  cyber: { label: "Cyber Core", description: "Dark tech with hexagonal & ember particles" },
  minimal: { label: "Minimal Light", description: "Clean white with subtle ambient glow" },
};

interface ScenePreviewContentProps {
  onClose?: () => void;
}

function ScenePreviewContent({ onClose }: ScenePreviewContentProps) {
  const {
    currentScene,
    performanceTier,
    setScene,
    setPerformanceTier,
    cursorPosition,
    streak,
    setStreak,
    audioLevel,
  } = useScene();

  const [isPlaying, setIsPlaying] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Cursor trail
  const {
    trail,
    cursorStyle,
    config,
    triggerBurst,
    clear,
  } = useCursorTrail({
    maxPoints: 30,
    decayTime: 800,
  });

  // Scene selector
  const handleSceneChange = (sceneId: SceneId) => {
    setScene(sceneId);
    setStreak(0);
    clear();
  };

  // Demo audio element for testing
  const audioElementRef = React.useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    if (currentScene.audioTexture.ambientHum) {
      audioElementRef.current = new Audio(currentScene.audioTexture.ambientHum);
      audioElementRef.current.loop = true;
      audioElementRef.current.volume = currentScene.audioTexture.humVolume;
    }
    return () => {
      audioElementRef.current?.pause();
      audioElementRef.current = null;
    };
  }, [currentScene.audioTexture.ambientHum, currentScene.audioTexture.humVolume]);

  const toggleAudio = () => {
    if (audioElementRef.current) {
      if (isPlaying) {
        audioElementRef.current.pause();
      } else {
        audioElementRef.current.play().catch(() => {});
      }
      setIsPlaying(!isPlaying);
    }
  };

  const cycleScene = () => {
    const currentIndex = SCENE_IDS.indexOf(currentScene.id);
    const nextIndex = (currentIndex + 1) % SCENE_IDS.length;
    handleSceneChange(SCENE_IDS[nextIndex]);
  };

  // Performance tier display
  const tierLabels = {
    full: "Full",
    reduced: "Reduced",
    static: "Static",
  };

  return (
    <div className="theme-scene min-h-screen bg-app text-text-main relative overflow-hidden">
      {/* Scene Layers */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <Suspense fallback={null}>
          <AmbientBase />
        </Suspense>
        <Suspense fallback={null}>
          <ParticleField />
        </Suspense>
        <Suspense fallback={null}>
          <AudioReactive audioElement={audioElementRef.current} />
        </Suspense>
      </div>

      {/* Cursor Trail */}
      <CursorTrailRenderer
        trail={trail}
        config={config}
      />

      {/* UI Overlay */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Top Bar */}
        <header className="flex items-center justify-between p-4 border-b border-border">
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium bg-panel border border-border hover:bg-hover transition-colors"
            >
              ← Back
            </button>
          )}
          <h1 className="text-xl font-black tracking-tight text-text-main">
            Scene Preview — <span className="text-primary">{SCENE_METADATA[currentScene.id].label}</span>
          </h1>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-xs text-text-muted">
              <span>Performance:</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase ${
                  performanceTier === "full"
                    ? "bg-success/20 text-success"
                    : performanceTier === "reduced"
                    ? "bg-warning/20 text-warning"
                    : "bg-error/20 text-error"
                }`}
              >
                {tierLabels[performanceTier]}
              </span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center justify-center p-4">
          {/* Scene Selector */}
          <div className="mb-8 w-full max-w-4xl">
            <div className="flex flex-wrap gap-2 justify-center mb-4">
              {SCENE_IDS.map((sceneId) => {
                const scene = getScenePackage(sceneId);
                const isActive = sceneId === currentScene.id;
                return (
                  <button
                    key={sceneId}
                    onClick={() => handleSceneChange(sceneId)}
                    className={`relative px-6 py-3 rounded-xl border transition-all font-medium ${
                      isActive
                        ? "border-primary bg-primary/10 text-primary shadow-[0_0_20px_var(--color-primary)]"
                        : "border-border bg-panel/50 text-text-muted hover:border-primary/50 hover:text-text-main"
                    }`}
                    style={{
                      background: isActive ? scene.ambient.panelGradient : undefined,
                    }}
                  >
                    {SCENE_METADATA[sceneId].label}
                  </button>
                );
              })}
            </div>

            {/* Scene Description */}
            <div className="text-center text-text-muted max-w-2xl mx-auto">
              <p className="text-sm">
                {SCENE_METADATA[currentScene.id].description}
              </p>
            </div>
          </div>

          {/* Demo Card */}
          <div className="theme-panel-shell w-full max-w-2xl rounded-2xl border bg-panel/35 p-8 backdrop-blur-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-accent" />

            <div className="text-center space-y-6 relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                Current Scene: {SCENE_METADATA[currentScene.id].label}
              </div>

              <h2 className="text-4xl md:text-5xl font-black leading-tight text-text-main">
                Hive<span className="text-primary">Spell</span>
              </h2>

              <p className="text-lg text-text-muted max-w-lg mx-auto">
                {SCENE_METADATA[currentScene.id].description}
              </p>

              {/* Stats Display */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
                <div className="text-center">
                  <div className="text-3xl font-black text-primary">{currentScene.id}</div>
                  <div className="text-[10px] uppercase tracking-wider text-text-muted">Scene ID</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-black text-accent">{performanceTier}</div>
                  <div className="text-[10px] uppercase tracking-wider text-text-muted">Performance</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-black text-success">{streak}</div>
                  <div className="text-[10px] uppercase tracking-wider text-text-muted">Streak</div>
                </div>
              </div>

              {/* Interactive Controls */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
                <button
                  onClick={toggleAudio}
                  className="rounded-full border border-border bg-panel/50 px-6 py-3 text-sm font-medium text-text-main hover:border-primary hover:text-primary transition-colors"
                >
                  {isPlaying ? "⏸ Pause Ambient" : "▶ Play Ambient"}
                </button>

                <button
                  onClick={cycleScene}
                  className="rounded-full border border-border bg-panel/50 px-6 py-3 text-sm font-medium text-text-main hover:border-primary hover:text-primary transition-colors"
                >
                  ↻ Cycle Scene
                </button>

                <button
                  onClick={() => setStreak(streak + 1)}
                  className="rounded-full border border-border bg-panel/50 px-6 py-3 text-sm font-medium text-text-main hover:border-primary hover:text-primary transition-colors"
                >
                  ⬆ Streak (+1)
                </button>

                <button
                  onClick={() => setStreak(0)}
                  onDoubleClick={() => triggerBurst(cursorPosition.x, cursorPosition.y)}
                  className="rounded-full border border-border bg-panel/50 px-6 py-3 text-sm font-medium text-text-main hover:border-warning hover:text-warning transition-colors"
                >
                  ⟳ Reset Streak
                </button>
              </div>

              {/* Performance Tier Selector */}
              <div className="pt-4 border-t border-border">
                <p className="text-sm text-text-muted mb-3">Performance Tier:</p>
                <div className="flex justify-center gap-2">
                  {(["full", "reduced", "static"] as const).map((tier) => (
                    <button
                      key={tier}
                      onClick={() => setPerformanceTier(tier)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        performanceTier === tier
                          ? "bg-primary text-app shadow-[0_0_15px_var(--color-primary)]"
                          : "bg-panel/50 text-text-muted hover:bg-panel hover:text-text-main"
                      }`}
                    >
                      {tierLabels[tier]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cursor Trail Test */}
              <div className="pt-4 border-t border-border">
                <p className="text-sm text-text-muted mb-3">Cursor Trail Test:</p>
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => triggerBurst(cursorPosition.x, cursorPosition.y)}
                    className="rounded-lg border border-border bg-panel/50 px-4 py-2 text-sm font-medium text-text-main hover:border-primary hover:text-primary transition-colors"
                  >
                    Burst Particles
                  </button>
                  <button
                    onClick={() => clear()}
                    className="rounded-lg border border-border bg-panel/50 px-4 py-2 text-sm font-medium text-text-main hover:border-primary hover:text-primary transition-colors"
                  >
                    Clear Trail
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Keyboard Shortcuts Help */}
          <details className={showDetails ? "mt-8" : "mt-4"}>
            <summary className="cursor-pointer text-sm text-text-muted hover:text-text-main">
              {showDetails ? "Hide" : "Show"} Keyboard Shortcuts
            </summary>
            <div className="mt-4 text-left max-w-md text-sm text-text-muted space-y-1">
              <div className="flex gap-2">
                <kbd className="px-2 py-0.5 rounded bg-panel border border-border font-mono text-[11px]">1-5</kbd>
                <span>Switch scenes</span>
              </div>
              <div className="flex gap-2">
                <kbd className="px-2 py-0.5 rounded bg-panel border border-border font-mono text-[11px]">S</kbd>
                <span>Increase streak</span>
              </div>
              <div className="flex gap-2">
                <kbd className="px-2 py-0.5 rounded bg-panel border border-border font-mono text-[11px]">R</kbd>
                <span>Reset streak</span>
              </div>
              <div className="flex gap-2">
                <kbd className="px-2 py-0.5 rounded bg-panel border border-border font-mono text-[11px]">Space</kbd>
                <span>Play/Pause ambient</span>
              </div>
            </div>
          </details>
        </main>

        {/* Footer */}
        <footer className="p-4 text-center text-xs text-text-muted border-t border-border">
          Scene Package Architecture — Phase 1 Validation
          {currentScene.audioTexture.ambientHum && (
            <span className="mx-2">|</span>
          )}
          {currentScene.audioTexture.ambientHum && (
            <span>
              Ambient: {currentScene.audioTexture.ambientHum.split("/").pop()}
            </span>
          )}
        </footer>
      </div>

      {/* Global keyboard handlers for shortcuts */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <KeyboardShortcuts
          onSceneChange={handleSceneChange}
          onStreakUp={() => setStreak(streak + 1)}
          onStreakReset={() => setStreak(0)}
          onToggleAudio={toggleAudio}
        />
      </div>
    </div>
  );
}

function KeyboardShortcuts({
  onSceneChange,
  onStreakUp,
  onStreakReset,
  onToggleAudio,
}: {
  onSceneChange: (sceneId: SceneId) => void;
  onStreakUp: () => void;
  onStreakReset: () => void;
  onToggleAudio: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      switch (e.key) {
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
          const index = parseInt(e.key) - 1;
          if (index < SCENE_IDS.length) {
            onSceneChange(SCENE_IDS[index]);
          }
          break;
        case "s":
        case "S":
          onStreakUp();
          break;
        case "r":
        case "R":
          onStreakReset();
          break;
        case " ":
          e.preventDefault();
          onToggleAudio();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSceneChange, onStreakUp, onStreakReset, onToggleAudio]);

  return null;
}

// Wrapper with SceneProvider for standalone preview
export function ScenePreview({ onClose }: { onClose?: () => void }) {
  return (
    <ScenePreviewContent onClose={onClose} />
  );
}

export default ScenePreview;
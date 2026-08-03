import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import type {
  SceneContextValue,
  ScenePackage,
  SceneId,
  PerformanceTier,
} from "@/data/themes/sceneSpecs";
export type { SceneContextValue, ScenePackage, SceneId, PerformanceTier } from "@/data/themes/sceneSpecs";
import { getScenePackage, DEFAULT_SCENE_ID, SCENE_PACKAGES } from "@/data/themes/scenePackages";
import { SceneTransition, useTransitions } from "@/components/scene/SceneTransition";

const SceneContext = createContext<SceneContextValue | null>(null);

/** Storage key for persisted scene preference */
const STORAGE_KEY = "hivespell.scene";

/** Default performance tier based on device capabilities */
const getDefaultPerformanceTier = (): "full" | "reduced" | "static" => {
  if (typeof window === "undefined") return "full";

  // Check for prefers-reduced-motion
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  if (prefersReducedMotion) return "static";

  // Check device capabilities (rough heuristic)
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
  const isLowEnd = navigator.hardwareConcurrency <= 4;
  const hasLowMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
    ? (navigator as Navigator & { deviceMemory: number }).deviceMemory <= 4
    : isLowEnd;

  if (isMobile || isLowEnd || hasLowMemory) return "reduced";
  return "full";
};

interface SceneProviderProps {
  children: ReactNode;
  initialScene?: SceneId;
  onSceneChange?: (sceneId: SceneId) => void;
}

/**
 * SceneProvider - Orchestrates the complete scene experience
 * Manages: ambient layers, particle fields, audio-reactive backgrounds,
 * cursor trails, streak-reactive cursor state, and performance tiers
 */
export function SceneProvider({
  children,
  initialScene,
  onSceneChange,
}: SceneProviderProps) {
  // Scene state
  const [sceneId, setSceneId] = useState<SceneId>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY) as SceneId | null;
      if (stored && stored in SCENE_PACKAGES) return stored;
    }
    return initialScene ?? DEFAULT_SCENE_ID;
  });

  const [performanceTier, setPerformanceTier] = useState<
    "full" | "reduced" | "static"
  >(() => getDefaultPerformanceTier());

  // Reactive state
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [streak, setStreak] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);

  // Transition state
  const [showEnterTransition, setShowEnterTransition] = useState(false);
  const [showExitTransition, setShowExitTransition] = useState(false);

  // Refs for performance
  const cursorPosRef = useRef(cursorPosition);
  const streakRef = useRef(streak);
  const audioLevelRef = useRef(audioLevel);
  const animationFrameRef = useRef<number | null>(null);
  const sceneRef = useRef(getScenePackage(sceneId));
  const ambientStylesRef = useRef<string>("");
  const prevSceneIdRef = useRef(sceneId);

  // Update refs when state changes
  cursorPosRef.current = cursorPosition;
  streakRef.current = streak;
  audioLevelRef.current = audioLevel;
  sceneRef.current = getScenePackage(sceneId);

  // Apply CSS custom properties to document root for ambient layer
  const applyAmbientStyles = useCallback((scene: ScenePackage) => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    const tokens = scene.colorTokens;
    const ambient = scene.ambient;
    const perf = scene.performance[performanceTier];

    // Color tokens
    root.style.setProperty("--color-app", tokens.app);
    root.style.setProperty("--color-panel", tokens.panel);
    root.style.setProperty("--color-surface", tokens.surface);
    root.style.setProperty("--color-primary", tokens.primary);
    root.style.setProperty("--color-primary-rgb", tokens.primaryRgb);
    root.style.setProperty("--color-primary-dim", tokens.primaryDim);
    root.style.setProperty("--color-accent", tokens.accent);
    root.style.setProperty("--color-text-main", tokens.textMain);
    root.style.setProperty("--color-text-muted", tokens.textMuted);
    root.style.setProperty("--color-success", tokens.success);
    root.style.setProperty("--color-warning", tokens.warning);
    root.style.setProperty("--color-error", tokens.error);
    root.style.setProperty("--color-info", tokens.info);
    root.style.setProperty("--color-hover", tokens.hover);
    root.style.setProperty("--color-active", tokens.active);
    root.style.setProperty("--color-focus", tokens.focus);
    root.style.setProperty("--color-disabled", tokens.disabled);
    root.style.setProperty("--color-border", tokens.border);
    root.style.setProperty("--color-border-strong", tokens.borderStrong);
    root.style.setProperty("--color-divider", tokens.divider);
    root.style.setProperty("--color-overlay", tokens.overlay);
    root.style.setProperty("--color-overlay-backdrop", tokens.overlayBackdrop);

    // Ambient gradients (only if enabled for this tier)
    if (perf.ambientGlow) {
      root.style.setProperty("--ambient-app-gradient", ambient.appGradient);
      root.style.setProperty("--ambient-panel-gradient", ambient.panelGradient);
      root.style.setProperty("--ambient-surface-gradient", ambient.surfaceGradient);
      root.style.setProperty("--ambient-glow", ambient.ambientGlow);
      root.style.setProperty("--ambient-glow-intensity", String(ambient.glowIntensity));
      root.style.setProperty(
        "--ambient-overlay-pattern",
        ambient.overlayPattern
      );
      root.style.setProperty(
        "--ambient-pattern-opacity",
        String(ambient.patternOpacity)
      );
      root.style.setProperty("--ambient-panel-shadow", ambient.panelShadow);
      root.style.setProperty("--ambient-glow-shadow", ambient.glowShadow);
      root.style.setProperty(
        "--ambient-elevation-1",
        ambient.elevationShadows.level1
      );
      root.style.setProperty(
        "--ambient-elevation-2",
        ambient.elevationShadows.level2
      );
      root.style.setProperty(
        "--ambient-elevation-3",
        ambient.elevationShadows.level3
      );
      root.style.setProperty(
        "--ambient-elevation-4",
        ambient.elevationShadows.level4
      );
      root.style.setProperty("--ambient-backdrop-blur", ambient.backdropBlur);
      root.style.setProperty("--ambient-glass-blur", ambient.glassBlur);
    } else {
      // Clear ambient styles when tier doesn't support them
      root.style.setProperty("--ambient-app-gradient", "none");
      root.style.setProperty("--ambient-panel-gradient", "none");
      root.style.setProperty("--ambient-surface-gradient", "none");
      root.style.setProperty("--ambient-glow", "none");
      root.style.setProperty("--ambient-overlay-pattern", "none");
      root.style.setProperty("--ambient-glow-shadow", "none");
    }

    // Transition choreography
    const t = scene.transitions;
    root.style.setProperty("--transition-enter-type", t.enter.type);
    root.style.setProperty("--transition-enter-duration", t.enter.duration);
    root.style.setProperty("--transition-enter-easing", t.enter.easing);
    root.style.setProperty("--transition-enter-color", t.enter.color);
    root.style.setProperty("--transition-exit-type", t.exit.type);
    root.style.setProperty("--transition-exit-duration", t.exit.duration);
    root.style.setProperty("--transition-exit-easing", t.exit.easing);
    root.style.setProperty("--transition-exit-color", t.exit.color);
    root.style.setProperty(
      "--transition-difficulty-duration",
      t.difficultyChange.duration
    );
    root.style.setProperty(
      "--transition-difficulty-easing",
      t.difficultyChange.easing
    );
    root.style.setProperty("--transition-round-start-duration", t.roundStart.duration);
    root.style.setProperty("--transition-round-end-duration", t.roundEnd.duration);

    // Cursor preset for CSS
    const c = scene.cursor;
    if (c.trailEnabled && perf.cursorTrail) {
      root.style.setProperty("--cursor-trail-color", c.trailColor);
      root.style.setProperty("--cursor-trail-glow", c.trailGlow);
      root.style.setProperty("--cursor-trail-length", String(c.trailLength));
      root.style.setProperty("--cursor-streak-base", String(c.streakIntensityMapping[0]));
      root.style.setProperty(
        "--cursor-streak-3",
        String(c.streakIntensityMapping[3])
      );
      root.style.setProperty(
        "--cursor-streak-5",
        String(c.streakIntensityMapping[5])
      );
      root.style.setProperty(
        "--cursor-streak-10",
        String(c.streakIntensityMapping[10])
      );
      root.style.setProperty(
        "--cursor-streak-20",
        String(c.streakIntensityMapping[20])
      );
    }

    // Audio reactive
    const a = scene.audioTexture;
    if (a.reactive.enabled && perf.audioReactive) {
      root.style.setProperty(
        "--audio-pulse-color",
        a.reactive.pulseColor
      );
      root.style.setProperty(
        "--audio-pulse-intensity",
        String(a.reactive.pulseIntensity)
      );
      root.style.setProperty(
        "--audio-reactive-frequencies",
        a.reactive.frequencies
      );
    }
  }, [performanceTier]);

  // Apply styles when scene or performance tier changes
  useEffect(() => {
    applyAmbientStyles(getScenePackage(sceneId));
  }, [sceneId, performanceTier, applyAmbientStyles]);

  // Scene change handler
  const setScene = useCallback(
    (newSceneId: SceneId) => {
      if (newSceneId === sceneId) return;

      // Trigger exit transition for current scene
      const currentScene = getScenePackage(sceneId);
      setShowExitTransition(true);

      // After exit transition, switch scene and trigger enter
      setTimeout(() => {
        setSceneId(newSceneId);
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, newSceneId);
        }
        onSceneChange?.(newSceneId);
        prevSceneIdRef.current = newSceneId;

        // Trigger enter transition
        setShowExitTransition(false);
        setShowEnterTransition(true);

        // Clean up enter transition
        const nextScene = getScenePackage(newSceneId);
        setTimeout(() => {
          setShowEnterTransition(false);
        }, parseInt(nextScene.transitions.enter.duration) + 100);
      }, parseInt(currentScene.transitions.exit.duration) + 50);
    },
    [sceneId, onSceneChange]
  );

  // Performance tier change
  const setPerformanceTierState = useCallback(
    (tier: "full" | "reduced" | "static") => {
      setPerformanceTier(tier);
      if (typeof window !== "undefined") {
        localStorage.setItem("hivespell.performanceTier", tier);
      }
      applyAmbientStyles(getScenePackage(sceneId));
    },
    [sceneId, applyAmbientStyles]
  );

  // Mouse move handler for cursor position
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setCursorPosition({ x: e.clientX, y: e.clientY });
    };

    document.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => document.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Ambient audio hum (background loop)
  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    const scene = getScenePackage(sceneId);
    if (
      scene.audioTexture.ambientHum &&
      performanceTier !== "static"
    ) {
      audioRef.current = new Audio(scene.audioTexture.ambientHum);
      audioRef.current.loop = true;
      audioRef.current.volume = scene.audioTexture.humVolume;
      audioRef.current.play().catch(() => {
        // Autoplay blocked - will need user interaction
      });
    }

    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, [sceneId, performanceTier]);

  // Keyboard handler for streak (demo purposes - in real game this comes from gameplay)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Demo: press 's' to increment streak, 'r' to reset
      if (e.key === "s") setStreak((prev) => prev + 1);
      if (e.key === "r") setStreak(0);
      if (e.key === "1") setScene("default");
      if (e.key === "2") setScene("neon");
      if (e.key === "3") setScene("nature");
      if (e.key === "4") setScene("cyber");
      if (e.key === "5") setScene("minimal");
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setScene]);

  // Performance - redraw cursor trail on each frame when enabled
  useEffect(() => {
    const scene = getScenePackage(sceneId);
    if (!scene.cursor.trailEnabled || performanceTier === "static") return;

    const animate = () => {
      // This will be used by the cursor trail component
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [sceneId, performanceTier]);

  const value: SceneContextValue = {
    currentScene: getScenePackage(sceneId),
    performanceTier,
    setScene,
    setPerformanceTier: setPerformanceTierState,
    cursorPosition,
    setCursorPosition,
    streak,
    setStreak,
    audioLevel,
    setAudioLevel,
  };

  const currentScene = getScenePackage(sceneId);

  return (
    <SceneContext.Provider value={value}>
      <div className="scene-container" data-scene={sceneId} data-tier={performanceTier}>
        {children}
        {/* Scene Transition Overlay - Enter */}
        {showEnterTransition && (
          <SceneTransition
            type="enter"
            scene={currentScene}
            onComplete={() => {
              // Transition complete
            }}
          />
        )}
        {/* Scene Transition Overlay - Exit */}
        {showExitTransition && (
          <SceneTransition
            type="exit"
            scene={getScenePackage(prevSceneIdRef.current)}
            onComplete={() => {
              // Exit transition complete
            }}
          />
        )}
      </div>
    </SceneContext.Provider>
  );
}

/** Hook to access scene context */
export function useScene(): SceneContextValue {
  const context = useContext(SceneContext);
  if (!context) {
    throw new Error("useScene must be used within a SceneProvider");
  }
  return context;
}

/** Hook for just the current scene package */
export function useCurrentScene(): ScenePackage {
  return useScene().currentScene;
}

/** Hook for performance tier */
export function usePerformanceTier(): "full" | "reduced" | "static" {
  return useScene().performanceTier;
}

/** Hook for cursor state */
export function useCursor() {
  const { cursorPosition, streak, setStreak } = useScene();
  return { cursorPosition, streak, setStreak };
}

/** Hook for audio reactive state */
export function useAudioReactive() {
  const { audioLevel, setAudioLevel, currentScene, performanceTier } = useScene();
  const reactiveEnabled =
    currentScene.audioTexture.reactive.enabled &&
    performanceTier !== "static";

  return {
    audioLevel,
    setAudioLevel,
    reactiveEnabled,
    pulseColor: currentScene.audioTexture.reactive.pulseColor,
    pulseIntensity: currentScene.audioTexture.reactive.pulseIntensity,
    frequencies: currentScene.audioTexture.reactive.frequencies,
    sensitivity: currentScene.audioTexture.reactive.sensitivity,
  };
}
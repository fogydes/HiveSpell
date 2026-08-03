import { useCallback, useEffect, useRef } from "react";
import { getGameplayEventBus, type GameplayEvent } from "./useGameplayEvents";

/**
 * Haptic feedback hook for mobile devices
 * Uses the Vibration API with sensible defaults for different event types
 */

type HapticPattern = "light" | "medium" | "heavy" | "success" | "error" | "warning" | "selection" | number[];

const HAPTIC_PATTERNS: Record<Exclude<HapticPattern, number[]>, number[]> = {
  light: [10],
  medium: [20],
  heavy: [40],
  success: [50, 30, 50],
  error: [100, 50, 100, 50, 100],
  warning: [30, 20, 30, 20, 30],
  selection: [5],
};

/**
 * Check if vibration is supported and not disabled by user preferences
 */
const isHapticSupported = (): boolean => {
  if (typeof navigator === "undefined") return false;
  if (!("vibrate" in navigator)) return false;

  // Check for reduced motion preference
  if (typeof window !== "undefined") {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) return false;
  }

  return true;
};

/**
 * Hook for triggering haptic feedback
 */
export function useHaptics() {
  const enabledRef = useRef(true);
  const lastVibrationRef = useRef(0);
  const minInterval = 50; // Minimum ms between vibrations to prevent spam

  // Check for user preference to disable haptics
  useEffect(() => {
    const saved = localStorage.getItem("hivespell.hapticsEnabled");
    if (saved !== null) {
      enabledRef.current = saved === "true";
    }
  }, []);

  const vibrate = useCallback((pattern: HapticPattern) => {
    if (!enabledRef.current) return;
    if (!isHapticSupported()) return;

    const now = Date.now();
    if (now - lastVibrationRef.current < minInterval) return;
    lastVibrationRef.current = now;

    const vibrationPattern = Array.isArray(pattern)
      ? pattern
      : HAPTIC_PATTERNS[pattern];

    try {
      navigator.vibrate(vibrationPattern);
    } catch (error) {
      console.warn("[Haptics] Vibration failed:", error);
    }
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    enabledRef.current = enabled;
    if (typeof window !== "undefined") {
      localStorage.setItem("hivespell.hapticsEnabled", String(enabled));
    }
  }, []);

  const isEnabled = enabledRef.current;

  return { vibrate, setEnabled, isEnabled };
}

// Exported haptic trigger functions for convenience
export const lightImpact = () => "light" as const;
export const mediumImpact = () => "medium" as const;
export const successImpact = () => "success" as const;
export const heavyImpact = () => "heavy" as const;
export const errorImpact = () => "error" as const;
export const warningImpact = () => "warning" as const;
export const selectionImpact = () => "selection" as const;

/**
 * Predefined haptic triggers for gameplay events
 */
export const GameplayHaptics = {
  wordSpoken: () => "light",
  answerCorrect: () => "success",
  answerIncorrect: () => "error",
  turnHandoff: () => "selection",
  playerEliminated: () => "warning",
  victory: () => [100, 50, 100, 50, 200, 50, 300],
  intermissionStart: () => "medium",
  roundStart: () => "light",
  streakMilestone: (streak: number) => {
    if (streak >= 50) return [200, 100, 200, 100, 500];
    if (streak >= 20) return [100, 50, 100, 50, 200];
    if (streak >= 10) return [80, 40, 80, 40, 150];
    if (streak >= 5) return [50, 30, 50];
    return "success";
  },
};

/**
 * Hook for components that want to trigger haptics on gameplay events
 * Usage: useGameplayHaptics("ANSWER_CORRECT", () => GameplayHaptics.answerCorrect())
 */
export function useGameplayHaptics(
  eventType: string,
  getPattern: () => HapticPattern
) {
  const { vibrate } = useHaptics();
  const bus = getGameplayEventBus();

  useEffect(() => {
    return bus.subscribe((event: GameplayEvent) => {
      if (event.type === eventType) {
        vibrate(getPattern());
      }
    });
  }, [eventType, bus, vibrate, getPattern]);
}
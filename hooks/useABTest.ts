import { useEffect, useState, useCallback } from "react";
import { registerExperiment, getFeatureFlag } from "../services/analytics";

/**
 * A/B Test variant type
 */
export type ABTestVariant = "control" | "treatment" | string;

/**
 * A/B Test configuration
 */
export interface ABTestConfig {
  /** Unique experiment ID */
  experimentId: string;
  /** Possible variants */
  variants: ABTestVariant[];
  /** Default variant if experiment not available */
  defaultVariant?: ABTestVariant;
  /** Whether to register the experiment on mount */
  autoRegister?: boolean;
}

/**
 * A/B Test result
 */
export interface ABTestResult {
  /** The assigned variant */
  variant: ABTestVariant;
  /** Whether the experiment is active */
  isActive: boolean;
  /** Raw feature flag value from PostHog */
  flagValue: string | boolean | undefined;
}

/**
 * Hook for A/B testing using PostHog feature flags and experiments
 *
 * Usage:
 * ```tsx
 * const { variant, isActive } = useABTest({
 *   experimentId: "onboarding-flow-v2",
 *   variants: ["control", "new-flow"],
 *   defaultVariant: "control",
 * });
 *
 * if (variant === "new-flow") {
 *   // Render new onboarding flow
 * }
 * ```
 */
export function useABTest(config: ABTestConfig): ABTestResult {
  const { experimentId, variants, defaultVariant = "control", autoRegister = true } = config;
  const [variant, setVariant] = useState<ABTestVariant>(defaultVariant);
  const [isActive, setIsActive] = useState(false);
  const [flagValue, setFlagValue] = useState<string | boolean | undefined>(undefined);

  // Get variant from PostHog feature flag
  const fetchVariant = useCallback(async () => {
    try {
      const flag = getFeatureFlag(experimentId);
      setFlagValue(flag);

      if (flag !== undefined) {
        // PostHog returns the variant name as string
        const flagVariant = String(flag);
        if (variants.includes(flagVariant)) {
          setVariant(flagVariant);
          setIsActive(true);
          return;
        }
      }
    } catch (error) {
      console.debug("[ABTest] Error fetching variant:", error);
    }

    // Fallback to default
    setVariant(defaultVariant);
    setIsActive(false);
  }, [experimentId, variants, defaultVariant]);

  // Register experiment on mount (for tracking in PostHog)
  useEffect(() => {
    if (autoRegister) {
      // We'll register with the assigned variant after fetch
      fetchVariant().then(() => {
        if (isActive) {
          registerExperiment(experimentId, variant);
        }
      });
    }
  }, [experimentId, autoRegister, fetchVariant]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch when flag might have changed
  useEffect(() => {
    const interval = setInterval(fetchVariant, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [fetchVariant]);

  return { variant, isActive, flagValue };
}

/**
 * Hook for multivariate testing (multiple variants with weights)
 * Uses a deterministic assignment based on user ID for consistency
 */
export function useMultivariateTest(
  experimentId: string,
  variants: Array<{ name: ABTestVariant; weight: number }>,
  defaultVariant: ABTestVariant = "control",
  userId?: string | null,
): ABTestVariant {
  const [variant, setVariant] = useState<ABTestVariant>(defaultVariant);

  useEffect(() => {
    if (!userId) {
      setVariant(defaultVariant);
      return;
    }

    // Deterministic assignment based on user ID hash
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash) + userId.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }

    // Use absolute value and normalize
    const normalized = Math.abs(hash) / 2147483647; // Max 32-bit int
    let cumulative = 0;

    for (const v of variants) {
      cumulative += v.weight;
      if (normalized < cumulative) {
        setVariant(v.name);
        return;
      }
    }

    // Fallback
    setVariant(variants[variants.length - 1]?.name || defaultVariant);
  }, [experimentId, userId, variants, defaultVariant]);

  return variant;
}

/**
 * Utility to get all active experiments for a user (for debugging/admin)
 */
export async function getActiveExperiments(): Promise<Record<string, string>> {
  // This would require PostHog's decide endpoint or similar
  // For now, return empty - can be extended when PostHog SDK supports it better
  return {};
}

/**
 * Predefined A/B test configurations for common experiments
 */
export const ABTestExperiments = {
  /** Onboarding flow experiment */
  onboardingFlow: {
    experimentId: "onboarding-flow",
    variants: ["control", "simplified", "guided"] as ABTestVariant[],
    defaultVariant: "control" as ABTestVariant,
  },

  /** Difficulty selection presentation */
  difficultySelection: {
    experimentId: "difficulty-selection",
    variants: ["control", "card-layout", "progressive"] as ABTestVariant[],
    defaultVariant: "control" as ABTestVariant,
  },

  /** Battle Pass upsell timing */
  battlePassUpsell: {
    experimentId: "battle-pass-upsell",
    variants: ["control", "after-first-win", "after-streak-3", "on-lobby-entry"] as ABTestVariant[],
    defaultVariant: "control" as ABTestVariant,
  },

  /** Daily challenge reward magnitude */
  dailyChallengeRewards: {
    experimentId: "daily-challenge-rewards",
    variants: ["control", "generous", "streak-bonus"] as ABTestVariant[],
    defaultVariant: "control" as ABTestVariant,
  },

  /** Shop item pricing display */
  shopPricing: {
    experimentId: "shop-pricing",
    variants: ["control", "bundle-emphasis", "nectar-per-dollar"] as ABTestVariant[],
    defaultVariant: "control" as ABTestVariant,
  },

  /** Notification timing for re-engagement */
  reengagementTiming: {
    experimentId: "reengagement-timing",
    variants: ["control", "1-hour", "4-hours", "24-hours"] as ABTestVariant[],
    defaultVariant: "control" as ABTestVariant,
  },
} as const;

export type ABTestExperimentKey = keyof typeof ABTestExperiments;
export type ABTestExperimentConfig = typeof ABTestExperiments[ABTestExperimentKey];

/**
 * Hook for predefined experiment
 */
export function usePredefinedABTest(key: ABTestExperimentKey): ABTestResult {
  const config = ABTestExperiments[key];
  return useABTest(config);
}
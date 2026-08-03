import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getFeatureFlag } from "../services/analytics";

/**
 * Feature flag keys - add new flags here
 */
export type FeatureFlagKey =
  | "scenePackages"
  | "feedbackTheater"
  | "onboardingDemo"
  | "rankedMode"
  | "spectatorMode"
  | "replaySystem"
  | "dailyChallenges"
  | "battlePass"
  | "friendInvites"
  | "shareReplay"
  | "adminPanel"
  | "debugMode";

/**
 * Feature flag value - can be boolean (simple on/off) or string (variant for A/B tests)
 */
export type FeatureFlagValue = boolean | string;

/**
 * Default feature flag configuration
 * These can be overridden by remote config (PostHog feature flags)
 */
const DEFAULT_FLAGS: Record<FeatureFlagKey, FeatureFlagValue> = {
  scenePackages: false,
  feedbackTheater: false,
  onboardingDemo: false,
  rankedMode: false,
  spectatorMode: false,
  replaySystem: false,
  dailyChallenges: false,
  battlePass: false,
  friendInvites: false,
  shareReplay: false,
  adminPanel: false,
  debugMode: false,
};

interface FeatureFlagsContextType {
  flags: Record<FeatureFlagKey, FeatureFlagValue>;
  isEnabled: (key: FeatureFlagKey) => boolean;
  getVariant: (key: FeatureFlagKey) => string | undefined;
  refresh: () => Promise<void>;
  loading: boolean;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextType | null>(null);

/**
 * Provider for feature flags
 * Loads defaults first, then fetches remote config from Supabase/PostHog
 */
interface FeatureFlagsProviderProps {
  children: React.ReactNode;
}

export const FeatureFlagsProvider: React.FC<FeatureFlagsProviderProps> = ({
  children,
}) => {
  const [flags, setFlags] = useState<Record<FeatureFlagKey, FeatureFlagValue>>(DEFAULT_FLAGS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      // First try to fetch from local config (for development/preview)
      const response = await fetch("/config/feature-flags.json", {
        cache: "no-store",
      });

      if (response.ok) {
        const remoteFlags = (await response.json()) as Partial<
          Record<FeatureFlagKey, FeatureFlagValue>
        >;
        setFlags((prev) => ({ ...prev, ...remoteFlags }));
      }

      // Then override with PostHog feature flags (for A/B tests)
      // This allows server-side variant assignment
      const flagKeys = Object.keys(DEFAULT_FLAGS) as FeatureFlagKey[];
      const posthogFlags: Partial<Record<FeatureFlagKey, FeatureFlagValue>> = {};

      for (const key of flagKeys) {
        const flagValue = getFeatureFlag(key);
        if (flagValue !== undefined) {
          posthogFlags[key] = flagValue;
        }
      }

      if (Object.keys(posthogFlags).length > 0) {
        setFlags((prev) => ({ ...prev, ...posthogFlags }));
      }
    } catch (error) {
      // Silently fail - use defaults
      console.debug("[FeatureFlags] Using default flags:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isEnabled = useCallback(
    (key: FeatureFlagKey): boolean => {
      const value = flags[key] ?? DEFAULT_FLAGS[key];
      // Handle boolean true, or truthy string variants
      return value === true || (typeof value === "string" && value !== "control" && value !== "false" && value !== "");
    },
    [flags],
  );

  const getVariant = useCallback(
    (key: FeatureFlagKey): string | undefined => {
      const value = flags[key] ?? DEFAULT_FLAGS[key];
      if (typeof value === "string") {
        return value;
      }
      return value === true ? "enabled" : undefined;
    },
    [flags],
  );

  return (
    <FeatureFlagsContext.Provider
      value={{ flags, isEnabled, getVariant, refresh, loading }}
    >
      {children}
    </FeatureFlagsContext.Provider>
  );
};

/**
 * Hook to access feature flags
 */
export const useFeatureFlags = (): FeatureFlagsContextType => {
  const context = useContext(FeatureFlagsContext);
  if (!context) {
    throw new Error(
      "useFeatureFlags must be used within a FeatureFlagsProvider",
    );
  }
  return context;
};

/**
 * Hook for a single feature flag (boolean)
 */
export const useFeatureFlag = (key: FeatureFlagKey): boolean => {
  const { isEnabled } = useFeatureFlags();
  return isEnabled(key);
};

/**
 * Hook for a feature flag variant (string for A/B tests)
 */
export const useFeatureFlagVariant = (key: FeatureFlagKey): string | undefined => {
  const { getVariant } = useFeatureFlags();
  return getVariant(key);
};

/**
 * Component wrapper for conditional rendering based on feature flag
 */
interface FeatureGateProps {
  flag: FeatureFlagKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({
  flag,
  children,
  fallback = null,
}) => {
  const isEnabled = useFeatureFlag(flag);
  return isEnabled ? <>{children}</> : <>{fallback}</>;
};

/**
 * Component wrapper for variant-based rendering
 */
interface VariantGateProps {
  flag: FeatureFlagKey;
  variants: Record<string, React.ReactNode>;
  fallback?: React.ReactNode;
}

export const VariantGate: React.FC<VariantGateProps> = ({
  flag,
  variants,
  fallback = null,
}) => {
  const variant = useFeatureFlagVariant(flag);
  if (variant && variants[variant]) {
    return <>{variants[variant]}</>;
  }
  return <>{fallback}</>;
};
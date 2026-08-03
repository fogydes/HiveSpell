/**
 * Analytics service - PostHog integration
 * Provides event tracking, funnel analysis, and A/B test support
 */

type AnalyticsEventName =
  // Funnel events
  | "landing_viewed"
  | "demo_started"
  | "demo_completed"
  | "signup_started"
  | "signup_completed"
  | "onboarding_started"
  | "onboarding_completed"
  | "first_play_started"
  | "first_play_completed"
  | "first_win"
  | "first_loss"
  | "requeue_after_loss"
  // Engagement events
  | "game_started"
  | "game_completed"
  | "word_correct"
  | "word_incorrect"
  | "round_won"
  | "round_lost"
  | "streak_milestone"
  | "victory"
  | "elimination"
  // Feature engagement
  | "battle_pass_viewed"
  | "battle_pass_tier_claimed"
  | "battle_pass_premium_upgraded"
  | "challenge_viewed"
  | "challenge_completed"
  | "challenge_claimed"
  | "leaderboard_viewed"
  | "shop_viewed"
  | "shop_item_purchased"
  | "stash_viewed"
  | "scene_changed"
  | "friend_invite_sent"
  | "friend_invite_accepted"
  | "friend_joined_game"
  | "spectator_joined"
  | "tournament_joined"
  | "tournament_completed"
  // Retention
  | "daily_login"
  | "welcome_back"
  | "session_start"
  | "session_end"
  // Technical
  | "error_occurred"
  | "performance_metric"
  | "audio_quality_report"
  | "cheat_flagged"
  // Internal
  | "page_view"
  | "experiment_registered";

interface AnalyticsEventProperties {
  // Common properties
  screen?: string;
  user_id?: string;
  session_id?: string;
  // Game-specific
  mode?: string;
  difficulty?: string;
  wpm?: number;
  streak?: number;
  round?: number;
  players_count?: number;
  // Feature-specific
  battle_pass_season?: number;
  battle_pass_tier?: number;
  challenge_id?: string;
  challenge_type?: "daily" | "weekly";
  item_id?: string;
  item_rarity?: string;
  currency_type?: "nectar" | "premium";
  scene_id?: string;
  friend_id?: string;
  tournament_id?: string;
  tournament_format?: string;
  // Error/performance
  error_message?: string;
  error_stack?: string;
  metric_name?: string;
  metric_value?: number;
  metric_unit?: string;
  // A/B testing
  experiment_id?: string;
  variant?: string;
}

class PostHogAnalytics {
  private apiKey: string | null = null;
  private host: string = "https://us.i.posthog.com";
  private enabled = false;
  private userId: string | null = null;
  private sessionId: string;
  private pendingEvents: Array<{ event: AnalyticsEventName; properties: AnalyticsEventProperties }> = [];
  private flushInterval: ReturnType<typeof setInterval> | null = null;
  private isInitialized = false;

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Initialize PostHog with API key from environment
   */
  init(apiKey?: string) {
    if (typeof window === "undefined") return;

    // Get API key from environment if not provided
    this.apiKey = apiKey || import.meta.env.VITE_POSTHOG_API_KEY || null;
    this.host = import.meta.env.VITE_POSTHOG_HOST || this.host;
    this.enabled = !!this.apiKey && this.apiKey !== "YOUR_POSTHOG_API_KEY_HERE";

    if (!this.enabled) {
      console.debug("[Analytics] PostHog not configured - events will be logged to console only");
      return;
    }

    // Load PostHog script dynamically
    this.loadPostHogScript();

    this.isInitialized = true;
    this.flushPendingEvents();
    this.startPeriodicFlush();

    // Track session start
    this.capture("session_start", { session_id: this.sessionId });
  }

  private async loadPostHogScript() {
    try {
      // Dynamic import to avoid bundling if not used
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const posthogModule = await import("posthog-js") as any;
      const posthog = posthogModule.default;

      posthog.init(this.apiKey!, {
        api_host: this.host,
        autocapture: false, // We'll manually capture events
        capture_pageview: false,
        capture_pageleave: false,
        persistence: "localStorage",
        loaded: (posthogInstance: any) => {
          if (this.userId) {
            posthogInstance.identify(this.userId);
          }
        },
      });

      // Store reference for later use
      (window as typeof window & { posthog: any }).posthog = posthog;
    } catch (error) {
      console.warn("[Analytics] Failed to load PostHog:", error);
      this.enabled = false;
    }
  }

  private getPostHog() {
    return (window as typeof window & { posthog: any }).posthog;
  }

  setUser(userId: string | null, userProperties?: Record<string, unknown>) {
    this.userId = userId;
    const posthog = this.getPostHog();
    if (posthog && userId) {
      posthog.identify(userId, userProperties);
    } else if (posthog && !userId) {
      posthog.reset();
    }
  }

  /**
   * Capture an analytics event
   */
  capture(event: AnalyticsEventName, properties: AnalyticsEventProperties = {}) {
    const enrichedProperties: AnalyticsEventProperties = {
      ...properties,
      session_id: this.sessionId,
      user_id: properties.user_id || this.userId || undefined,
      screen: properties.screen || (typeof window !== "undefined" ? window.location.pathname : undefined),
    };

    if (this.enabled && this.isInitialized) {
      const posthog = this.getPostHog();
      if (posthog) {
        posthog.capture(event, enrichedProperties);
        return;
      }
    }

    // Queue for later if not initialized
    if (!this.isInitialized || !this.enabled) {
      this.pendingEvents.push({ event, properties: enrichedProperties });
    }

    // Console logging in development
    if (import.meta.env.DEV) {
      console.log(`[Analytics] ${event}`, enrichedProperties);
    }
  }

  /**
   * Capture page view for SPA routing
   */
  capturePageView(pathname: string, properties: Record<string, unknown> = {}) {
    this.capture("page_view", { screen: pathname, ...properties } as AnalyticsEventProperties);
  }

  /**
   * Identify user with properties
   */
  identify(userId: string, properties: Record<string, unknown> = {}) {
    this.setUser(userId, properties);
    const posthog = this.getPostHog();
    if (posthog) {
      posthog.identify(userId, properties);
    }
  }

  /**
   * Register for A/B test experiment
   */
  registerExperiment(experimentId: string, variant: string) {
    const posthog = this.getPostHog();
    if (posthog) {
      posthog.register(experimentId, variant);
    }
    this.capture("experiment_registered", { experiment_id: experimentId, variant });
  }

  /**
   * Get feature flag value
   */
  getFeatureFlag(flagKey: string): string | boolean | undefined {
    const posthog = this.getPostHog();
    if (posthog) {
      return posthog.getFeatureFlag(flagKey);
    }
    return undefined;
  }

  /**
   * Reload feature flags
   */
  async reloadFeatureFlags() {
    const posthog = this.getPostHog();
    if (posthog) {
      await posthog.reloadFeatureFlags();
    }
  }

  private flushPendingEvents() {
    if (this.pendingEvents.length === 0) return;
    const events = [...this.pendingEvents];
    this.pendingEvents = [];
    events.forEach(({ event, properties }) => this.capture(event, properties));
  }

  private startPeriodicFlush() {
    this.flushInterval = setInterval(() => this.flushPendingEvents(), 30000);
    // Flush on page unload
    window.addEventListener("beforeunload", () => this.flushPendingEvents());
  }

  /**
   * Shutdown analytics
   */
  shutdown() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flushPendingEvents();
    this.capture("session_end", { session_id: this.sessionId });
    const posthog = this.getPostHog();
    if (posthog) {
      posthog.shutdown();
    }
  }
}

// Singleton instance
export const analytics = new PostHogAnalytics();

// Convenience functions
export const trackEvent = (event: AnalyticsEventName, properties?: AnalyticsEventProperties) =>
  analytics.capture(event, properties);

export const trackPageView = (pathname: string, properties?: Record<string, unknown>) =>
  analytics.capturePageView(pathname, properties);

export const identifyUser = (userId: string, properties?: Record<string, unknown>) =>
  analytics.identify(userId, properties);

export const setAnalyticsUser = (userId: string | null, properties?: Record<string, unknown>) =>
  analytics.setUser(userId, properties);

export const registerExperiment = (experimentId: string, variant: string) =>
  analytics.registerExperiment(experimentId, variant);

export const getFeatureFlag = (flagKey: string) => analytics.getFeatureFlag(flagKey);

// Type exports
export type { AnalyticsEventName, AnalyticsEventProperties };
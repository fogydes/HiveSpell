import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

const LAST_SESSION_KEY = "hivespell.last_session";
const SESSION_COUNT_KEY = "hivespell.session_count";
const FIRST_SESSION_DATE_KEY = "hivespell.first_session_date";
const DAILY_STREAK_KEY = "hivespell.daily_streak";
const LAST_LOGIN_DATE_KEY = "hivespell.last_login_date";
// Track per-session (browser session) game played state
const SESSION_GAME_PLAYED_KEY = "hivespell.session_game_played";
// Track cumulative games played across all time
const TOTAL_GAMES_PLAYED_KEY = "hivespell.total_games_played";

export type UserSegment =
  | "new"
  | "returning"
  | "active"
  | "dormant"
  | "champion"
  | "comeback";

export interface SessionState {
  segment: UserSegment;
  sessionCount: number;
  daysSinceFirstSession: number;
  daysSinceLastSession: number;
  dailyStreak: number;
  lastLoginDate: string | null;
  isNewDay: boolean;
  welcomeBackMessage: string | null;
  streakReward: { nectar: number; multiplier: number } | null;
}

/**
 * Calculate days between two dates
 */
function daysBetween(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000;
  const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
  return Math.round(Math.abs((d2.getTime() - d1.getTime()) / oneDay));
}

/**
 * Get welcome back message based on days away
 */
function getWelcomeBackMessage(daysAway: number): string | null {
  if (daysAway === 1) return "Welcome back! Ready for another round?";
  if (daysAway <= 3) return `Welcome back! It's been ${daysAway} days. Your hive missed you!`;
  if (daysAway <= 7) return `Welcome back! ${daysAway} days away... The arena's been quiet without you.`;
  if (daysAway <= 14) return `Welcome back! Two weeks? Your streak froze, but your skills didn't.`;
  if (daysAway <= 30) return `Welcome back! A month? The hive has new challenges waiting.`;
  return `Welcome back! It's been a while. Everything's ready for your return.`;
}

/**
 * Calculate streak reward
 */
function calculateStreakReward(streak: number): { nectar: number; multiplier: number } {
  if (streak >= 30) return { nectar: 500, multiplier: 3 };
  if (streak >= 14) return { nectar: 200, multiplier: 2.5 };
  if (streak >= 7) return { nectar: 100, multiplier: 2 };
  if (streak >= 3) return { nectar: 50, multiplier: 1.5 };
  return { nectar: 25, multiplier: 1 };
}

/**
 * Hook for managing session state and user segmentation
 */
export function useSessionState() {
  const { userData } = useAuth();
  const [state, setState] = useState<SessionState>({
    segment: "new",
    sessionCount: 0,
    daysSinceFirstSession: 0,
    daysSinceLastSession: 0,
    dailyStreak: 0,
    lastLoginDate: null,
    isNewDay: false,
    welcomeBackMessage: null,
    streakReward: null,
  });

  // Read session state from localStorage
  const readSessionState = useCallback(() => {
    if (!userData) return;

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    // Check if a game was already played in this browser session
    const sessionGamePlayed = sessionStorage.getItem(SESSION_GAME_PLAYED_KEY) === "true";

    // Get stored values
    const lastSessionStr = localStorage.getItem(LAST_SESSION_KEY);
    const firstSessionStr = localStorage.getItem(FIRST_SESSION_DATE_KEY);
    const totalGamesPlayedStr = localStorage.getItem(TOTAL_GAMES_PLAYED_KEY);
    const dailyStreakStr = localStorage.getItem(DAILY_STREAK_KEY);
    const lastLoginStr = localStorage.getItem(LAST_LOGIN_DATE_KEY);

    const totalGamesPlayed = parseInt(totalGamesPlayedStr || "0", 10);
    const dailyStreak = parseInt(dailyStreakStr || "0", 10);
    const lastLoginDate = lastLoginStr;

    // For display: sessionCount is total games played across all time
    const sessionCount = totalGamesPlayed;

    // Determine if this is a new day
    const isNewDay = lastLoginDate !== todayStr;

    // Calculate days since last session
    let daysSinceLastSession = 0;
    if (lastSessionStr) {
      const lastSession = new Date(lastSessionStr);
      daysSinceLastSession = daysBetween(lastSession, now);
    }

    // Calculate days since first session
    let daysSinceFirstSession = 0;
    if (firstSessionStr) {
      const firstSession = new Date(firstSessionStr);
      daysSinceFirstSession = daysBetween(firstSession, now);
    } else {
      // First session ever
      localStorage.setItem(FIRST_SESSION_DATE_KEY, todayStr);
    }

    // Update daily streak
    let newDailyStreak = dailyStreak;
    let streakReward: { nectar: number; multiplier: number } | null = null;

    if (isNewDay) {
      if (daysSinceLastSession === 1) {
        // Continued streak
        newDailyStreak += 1;
        streakReward = calculateStreakReward(newDailyStreak);
      } else if (daysSinceLastSession > 1) {
        // Streak broken
        newDailyStreak = 1;
        streakReward = calculateStreakReward(1);
      }
      // If daysSinceLastSession === 0, same day - don't increment

      localStorage.setItem(DAILY_STREAK_KEY, String(newDailyStreak));
      localStorage.setItem(LAST_LOGIN_DATE_KEY, todayStr);
    }

    // Determine user segment
    let segment: UserSegment = "new";

    if (daysSinceFirstSession === 0 && totalGamesPlayed === 0) {
      segment = "new";
    } else if (userData.wins >= 50) {
      segment = "champion";
    } else if (daysSinceLastSession === 0 && totalGamesPlayed > 1) {
      segment = "active";
    } else if (daysSinceLastSession <= 2) {
      segment = "returning";
    } else if (daysSinceLastSession <= 14) {
      segment = "dormant";
    } else {
      segment = "comeback";
    }

    // Get welcome back message
    const welcomeBackMessage =
      daysSinceLastSession >= 1 ? getWelcomeBackMessage(daysSinceLastSession) : null;

    setState({
      segment,
      sessionCount,
      daysSinceFirstSession,
      daysSinceLastSession,
      dailyStreak: newDailyStreak,
      lastLoginDate: todayStr,
      isNewDay,
      welcomeBackMessage,
      streakReward,
    });
  }, [userData]);

  // Initial read
  useEffect(() => {
    readSessionState();
  }, [readSessionState]);

  // Listen for storage changes (e.g., when recordGamePlayed updates session count in another tab/component)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === TOTAL_GAMES_PLAYED_KEY ||
        e.key === DAILY_STREAK_KEY ||
        e.key === LAST_LOGIN_DATE_KEY ||
        e.key === LAST_SESSION_KEY
      ) {
        readSessionState();
      }
    };

    // Also listen for custom events we dispatch
    const handleCustomEvent = () => {
      readSessionState();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("hivespell:session-updated", handleCustomEvent);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("hivespell:session-updated", handleCustomEvent);
    };
  }, [readSessionState]);

  // Record that a game was played in the current session
  const recordGamePlayed = useCallback(() => {
    if (!userData) return;

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    // Check if a game was already played in this browser session
    const sessionGamePlayed = sessionStorage.getItem(SESSION_GAME_PLAYED_KEY) === "true";

    // Only increment if no game was played in this browser session yet
    if (!sessionGamePlayed) {
      const totalGamesPlayedStr = localStorage.getItem(TOTAL_GAMES_PLAYED_KEY);
      const totalGamesPlayed = parseInt(totalGamesPlayedStr || "0", 10);
      const newTotalGamesPlayed = totalGamesPlayed + 1;
      localStorage.setItem(TOTAL_GAMES_PLAYED_KEY, String(newTotalGamesPlayed));
      localStorage.setItem(LAST_SESSION_KEY, now.toISOString());
      sessionStorage.setItem(SESSION_GAME_PLAYED_KEY, "true");

      // Dispatch custom event to notify other components listening
      window.dispatchEvent(new CustomEvent("hivespell:session-updated"));
    }
  }, [userData]);

  const resetSession = useCallback(() => {
    localStorage.removeItem(LAST_SESSION_KEY);
    localStorage.removeItem(TOTAL_GAMES_PLAYED_KEY);
    localStorage.removeItem(FIRST_SESSION_DATE_KEY);
    localStorage.removeItem(DAILY_STREAK_KEY);
    localStorage.removeItem(LAST_LOGIN_DATE_KEY);
    sessionStorage.removeItem(SESSION_GAME_PLAYED_KEY);
  }, []);

  return { ...state, recordGamePlayed };
}

/**
 * Get segment-specific content for the home screen
 */
export function getSegmentContent(segment: UserSegment) {
  const content: Record<UserSegment, {
    headline: string;
    subheadline: string;
    primaryCTA: { label: string; href: string };
    secondaryCTA?: { label: string; href: string };
    badge?: string;
  }> = {
    new: {
      headline: "Welcome to the Hive",
      subheadline: "Hear the word. Spell it fast. Outlast everyone.",
      primaryCTA: { label: "PLAY TUTORIAL", href: "/lobby" },
      badge: "NEW BEE",
    },
    returning: {
      headline: "Welcome Back! 🐝",
      subheadline: "Your hive has been waiting. Ready to build that streak?",
      primaryCTA: { label: "PLAY NOW", href: "/lobby" },
      secondaryCTA: { label: "CUSTOMIZE", href: "/stash" },
    },
    active: {
      headline: "Back for More? ⚡",
      subheadline: "You're on fire. Keep the momentum going.",
      primaryCTA: { label: "QUICK PLAY", href: "/play/baby" },
      secondaryCTA: { label: "LOBBY", href: "/lobby" },
    },
    dormant: {
      headline: "The Hive Missed You 🍯",
      subheadline: "It's been a bit. New themes, new challenges. Same pressure.",
      primaryCTA: { label: "JUMP IN", href: "/lobby" },
      secondaryCTA: { label: "WHAT'S NEW", href: "/stash" },
    },
    champion: {
      headline: "Hive Champion 👑",
      subheadline: `${50}+ wins. The arena recognizes royalty.`,
      primaryCTA: { label: "DOMINATE", href: "/play/roya" },
      secondaryCTA: { label: "LEADERBOARD", href: "/lobby" },
    },
    comeback: {
      headline: "Long Time No Spell 🌙",
      subheadline: "We saved your spot. The words got harder while you were gone.",
      primaryCTA: { label: "RETURN TO ARENA", href: "/lobby" },
      secondaryCTA: { label: "REFRESH SKILLS", href: "/play/baby" },
    },
  };

  return content[segment];
}

export { daysBetween, getWelcomeBackMessage, calculateStreakReward };
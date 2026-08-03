/**
 * Tier Ranking System for HiveSpell
 * Maps player stats to visible tier badges: Bronze → Silver → Gold → Platinum → Diamond → Queen
 */

export type TierName = "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond" | "Queen";

export interface TierDefinition {
  name: TierName;
  minValue: number;
  color: string;
  glowColor: string;
  icon: string;
  description: string;
}

export interface PlayerStats {
  wins: number;
  corrects: number;
  lifetimeNectar: number;
  currentStreak?: number;
  gamesPlayed?: number;
}

// Tier definitions - based on a composite score
// Score = wins * 10 + corrects * 1 + lifetimeNectar / 100 + streak * 5
// This weights wins heavily, corrects moderately, nectar lightly, and streak as a bonus
export const TIER_DEFINITIONS: TierDefinition[] = [
  {
    name: "Bronze",
    minValue: 0,
    color: "#CD7F32", // Bronze
    glowColor: "rgba(205, 127, 50, 0.5)",
    icon: "🥉",
    description: "Rising through the ranks",
  },
  {
    name: "Silver",
    minValue: 100,
    color: "#C0C0C0", // Silver
    glowColor: "rgba(192, 192, 192, 0.5)",
    icon: "🥈",
    description: "Proving your skill",
  },
  {
    name: "Gold",
    minValue: 500,
    color: "#FFD700", // Gold
    glowColor: "rgba(255, 215, 0, 0.6)",
    icon: "🥇",
    description: "A true competitor",
  },
  {
    name: "Platinum",
    minValue: 1500,
    color: "#E5E4E2", // Platinum
    glowColor: "rgba(229, 228, 226, 0.5)",
    icon: "💎",
    description: "Elite spelling mastery",
  },
  {
    name: "Diamond",
    minValue: 3500,
    color: "#B9F2FF", // Diamond blue
    glowColor: "rgba(185, 242, 255, 0.6)",
    icon: "💠",
    description: "Among the legends",
  },
  {
    name: "Queen",
    minValue: 7000,
    color: "#F5C6FF", // Queen pink/purple
    glowColor: "rgba(245, 198, 255, 0.7)",
    icon: "👑",
    description: "Ruler of the Hive",
  },
];

/**
 * Calculate a composite score from player stats
 * Higher weight on wins, moderate on corrects, light on nectar, bonus for streak
 */
export function calculateTierScore(stats: PlayerStats): number {
  const winsScore = (stats.wins || 0) * 10;
  const correctsScore = (stats.corrects || 0) * 1;
  const nectarScore = Math.floor((stats.lifetimeNectar || 0) / 100);
  const streakBonus = (stats.currentStreak || 0) * 5;
  const gamesBonus = Math.floor((stats.gamesPlayed || 0) / 10) * 2;

  return winsScore + correctsScore + nectarScore + streakBonus + gamesBonus;
}

/**
 * Get the tier definition for a given score
 */
export function getTierForScore(score: number): TierDefinition {
  // Find the highest tier the player qualifies for
  for (let i = TIER_DEFINITIONS.length - 1; i >= 0; i--) {
    if (score >= TIER_DEFINITIONS[i].minValue) {
      return TIER_DEFINITIONS[i];
    }
  }
  return TIER_DEFINITIONS[0]; // Bronze as fallback
}

/**
 * Get the tier definition from player stats
 */
export function getTierFromStats(stats: PlayerStats): TierDefinition {
  const score = calculateTierScore(stats);
  return getTierForScore(score);
}

/**
 * Get the tier name from player stats
 */
export function getTierNameFromStats(stats: PlayerStats): TierName {
  return getTierFromStats(stats).name;
}

/**
 * Get progress to next tier (0-100)
 */
export function getTierProgress(stats: PlayerStats): number {
  const score = calculateTierScore(stats);
  const currentTier = getTierForScore(score);
  const currentIndex = TIER_DEFINITIONS.findIndex((t) => t.name === currentTier.name);

  // If at max tier, return 100
  if (currentIndex === TIER_DEFINITIONS.length - 1) {
    return 100;
  }

  const nextTier = TIER_DEFINITIONS[currentIndex + 1];
  const progress = ((score - currentTier.minValue) / (nextTier.minValue - currentTier.minValue)) * 100;
  return Math.min(100, Math.max(0, Math.floor(progress)));
}

/**
 * Get the next tier name (or current if at max)
 */
export function getNextTierName(stats: PlayerStats): TierName {
  const score = calculateTierScore(stats);
  const currentTier = getTierForScore(score);
  const currentIndex = TIER_DEFINITIONS.findIndex((t) => t.name === currentTier.name);

  if (currentIndex === TIER_DEFINITIONS.length - 1) {
    return currentTier.name;
  }

  return TIER_DEFINITIONS[currentIndex + 1].name;
}

/**
 * Get score needed for next tier
 */
export function getScoreForNextTier(stats: PlayerStats): number {
  const score = calculateTierScore(stats);
  const currentTier = getTierForScore(score);
  const currentIndex = TIER_DEFINITIONS.findIndex((t) => t.name === currentTier.name);

  if (currentIndex === TIER_DEFINITIONS.length - 1) {
    return score;
  }

  return TIER_DEFINITIONS[currentIndex + 1].minValue;
}

/**
 * Format tier display name with icon
 */
export function formatTierDisplay(tier: TierDefinition): string {
  return `${tier.icon} ${tier.name}`;
}

/**
 * Get tier-specific CSS custom properties for theming
 */
export function getTierCSSProperties(tier: TierDefinition): Record<string, string> {
  return {
    "--tier-color": tier.color,
    "--tier-glow": tier.glowColor,
    "--tier-border": tier.color,
  };
}

/**
 * Legacy tier check - for season reset legacy badge
 * Returns the previous season's tier if available
 */
export function getLegacyTier(stats: PlayerStats, previousSeasonScore?: number): TierDefinition | null {
  if (previousSeasonScore !== undefined && previousSeasonScore > 0) {
    const legacyTier = getTierForScore(previousSeasonScore);
    const currentTier = getTierFromStats(stats);
    // Only show legacy if it was higher than current (or just for display)
    if (TIER_DEFINITIONS.findIndex(t => t.name === legacyTier.name) >
        TIER_DEFINITIONS.findIndex(t => t.name === currentTier.name)) {
      return legacyTier;
    }
  }
  return null;
}
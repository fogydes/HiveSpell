/**
 * Battle Pass System Types and Utilities
 * Phase 4b: Seasonal Battle Pass
 */

export type BattlePassRewardType =
  | "nectar"
  | "honey"
  | "theme"
  | "cursor"
  | "badge"
  | "title"
  | "avatar_frame"
  | "emote"
  | "xp_boost";

export interface BattlePassReward {
  id: string;
  type: BattlePassRewardType;
  name: string;
  description: string;
  icon: string; // emoji or asset key
  value: number | string; // amount for currency, asset ID for cosmetics
  tier: number; // 1-50
  isPremium: boolean;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
}

export interface BattlePassTier {
  tier: number; // 1-50
  xpRequired: number;
  freeReward: BattlePassReward | null;
  premiumReward: BattlePassReward | null;
}

export interface BattlePassSeason {
  id: string; // e.g., "season_1", "season_2026_08"
  name: string;
  displayName: string;
  description: string;
  startDate: string; // ISO date
  endDate: string; // ISO date
  totalTiers: number; // typically 50
  xpPerTier: number; // base XP per tier
  xpCurve: "linear" | "exponential" | "custom";
  tiers: BattlePassTier[];
  premiumPrice: number; // in honey (premium currency)
  themeAssetKey: string; // visual theme for this season
}

export interface PlayerBattlePassState {
  seasonId: string;
  currentTier: number; // 0 = not started, 1-50
  currentXp: number;
  totalXpEarned: number;
  isPremium: boolean;
  claimedFreeTiers: number[]; // array of claimed tier numbers
  claimedPremiumTiers: number[]; // array of claimed tier numbers
  lastUpdated: string; // ISO date
  // Weekly challenge progress
  weeklyProgress: {
    seasonWeek: number;
    challengesCompleted: number;
    bonusXpEarned: number;
  }[];
}

export interface BattlePassProgress {
  season: BattlePassSeason;
  state: PlayerBattlePassState;
  progressPercent: number;
  xpToNextTier: number;
  nextReward: BattlePassReward | null;
  canClaimFree: boolean;
  canClaimPremium: boolean;
}

// XP curve calculation
export function calculateXpForTier(
  tier: number,
  baseXp: number,
  curve: "linear" | "exponential" | "custom" = "linear"
): number {
  switch (curve) {
    case "linear":
      return baseXp * tier;
    case "exponential":
      return Math.floor(baseXp * Math.pow(1.15, tier - 1));
    case "custom":
    default:
      // Custom curve: slightly accelerating
      return Math.floor(baseXp * tier * (1 + (tier - 1) * 0.02));
  }
}

export function calculateTotalXpForTier(
  tier: number,
  baseXp: number,
  curve: "linear" | "exponential" | "custom" = "linear"
): number {
  let total = 0;
  for (let i = 1; i <= tier; i++) {
    total += calculateXpForTier(i, baseXp, curve);
  }
  return total;
}

export function getTierFromXp(
  totalXp: number,
  baseXp: number,
  curve: "linear" | "exponential" | "custom" = "linear"
): number {
  let tier = 0;
  let accumulated = 0;

  while (true) {
    const nextTierXp = calculateXpForTier(tier + 1, baseXp, curve);
    if (accumulated + nextTierXp > totalXp) break;
    accumulated += nextTierXp;
    tier++;
  }

  return tier;
}

export function getProgressInTier(
  totalXp: number,
  baseXp: number,
  curve: "linear" | "exponential" | "custom" = "linear"
): { currentTier: number; xpIntoTier: number; xpForNextTier: number } {
  const currentTier = getTierFromXp(totalXp, baseXp, curve);
  const xpForCurrentTier = calculateTotalXpForTier(currentTier, baseXp, curve);
  const xpIntoTier = totalXp - xpForCurrentTier;
  const xpForNextTier = calculateXpForTier(currentTier + 1, baseXp, curve);

  return { currentTier, xpIntoTier, xpForNextTier };
}

// Default Season 1 definition (The Golden Hive)
export const SEASON_1: BattlePassSeason = {
  id: "season_1",
  name: "The Golden Hive",
  displayName: "Season 1: The Golden Hive",
  description: "The first season of HiveSpell. Golden honey flows through the arena as bees compete for eternal glory.",
  startDate: "2026-08-01T00:00:00Z",
  endDate: "2026-10-31T23:59:59Z",
  totalTiers: 50,
  xpPerTier: 1000,
  xpCurve: "custom",
  premiumPrice: 950, // honey
  themeAssetKey: "season_golden_hive",
  tiers: [], // Will be generated
};

// Generate tiers for a season
export function generateSeasonTiers(season: BattlePassSeason): BattlePassTier[] {
  const tiers: BattlePassTier[] = [];
  const rewardPool = getRewardPool(season.id);

  for (let tier = 1; tier <= season.totalTiers; tier++) {
    const xpRequired = calculateXpForTier(tier, season.xpPerTier, season.xpCurve);

    // Free reward every tier
    const freeReward = getRewardForTier(tier, false, rewardPool);

    // Premium reward every tier (better rewards)
    const premiumReward = getRewardForTier(tier, true, rewardPool);

    tiers.push({
      tier,
      xpRequired,
      freeReward,
      premiumReward,
    });
  }

  return tiers;
}

// Reward pools by season
function getRewardPool(seasonId: string): BattlePassReward[] {
  const pools: Record<string, BattlePassReward[]> = {
    season_1: [
      // Nectar rewards
      { id: "nectar_small", type: "nectar", name: "Nectar Drop", description: "A small sip of sweet nectar", icon: "🍯", value: 100, tier: 1, isPremium: false, rarity: "common" },
      { id: "nectar_medium", type: "nectar", name: "Nectar Vial", description: "A vial of concentrated nectar", icon: "🍯", value: 250, tier: 5, isPremium: false, rarity: "common" },
      { id: "nectar_large", type: "nectar", name: "Nectar Jar", description: "A full jar of golden nectar", icon: "🍯", value: 500, tier: 10, isPremium: false, rarity: "uncommon" },
      { id: "nectar_huge", type: "nectar", name: "Nectar Barrel", description: "A barrel overflowing with nectar", icon: "🍯", value: 1000, tier: 25, isPremium: false, rarity: "rare" },
      { id: "nectar_massive", type: "nectar", name: "Nectar Ocean", description: "An endless sea of sweet nectar", icon: "🍯", value: 2500, tier: 50, isPremium: false, rarity: "legendary" },

      // Honey (premium currency) - premium only
      { id: "honey_small", type: "honey", name: "Honey Crystal", description: "A crystallized drop of premium honey", icon: "💎", value: 25, tier: 1, isPremium: true, rarity: "uncommon" },
      { id: "honey_medium", type: "honey", name: "Honey Shard", description: "A shard of pure honey", icon: "💎", value: 50, tier: 10, isPremium: true, rarity: "rare" },
      { id: "honey_large", type: "honey", name: "Honey Gem", description: "A flawless honey gemstone", icon: "💎", value: 100, tier: 25, isPremium: true, rarity: "epic" },
      { id: "honey_massive", type: "honey", name: "Honey Heart", description: "The beating heart of the hive", icon: "💎", value: 200, tier: 50, isPremium: true, rarity: "legendary" },

      // Themes
      { id: "theme_golden", type: "theme", name: "Golden Hive Theme", description: "Gilded panels with honey-glow accents", icon: "🎨", value: "theme_golden_hive", tier: 15, isPremium: true, rarity: "epic" },
      { id: "theme_royal", type: "theme", name: "Royal Jelly Theme", description: "Regal purples and golds fit for a queen", icon: "🎨", value: "theme_royal_jelly", tier: 35, isPremium: true, rarity: "legendary" },

      // Cursors
      { id: "cursor_bee", type: "cursor", name: "Worker Bee Cursor", description: "A diligent bee follows your movements", icon: "🐝", value: "cursor_worker_bee", tier: 5, isPremium: true, rarity: "uncommon" },
      { id: "cursor_queen", type: "cursor", name: "Queen Bee Cursor", description: "The royal cursor with trailing attendants", icon: "👑", value: "cursor_queen_bee", tier: 30, isPremium: true, rarity: "legendary" },

      // Badges
      { id: "badge_season1", type: "badge", name: "Season 1 Participant", description: "Proves you were there from the beginning", icon: "🏅", value: "badge_season_1", tier: 1, isPremium: false, rarity: "common" },
      { id: "badge_golden", type: "badge", name: "Golden Hive Champion", description: "Completed the Golden Hive journey", icon: "🥇", value: "badge_golden_champion", tier: 50, isPremium: false, rarity: "legendary" },
      { id: "badge_royal", type: "badge", name: "Royal Jelly Elite", description: "Reached the pinnacle of Season 1", icon: "👑", value: "badge_royal_elite", tier: 50, isPremium: true, rarity: "legendary" },

      // Titles
      { id: "title_newbee", type: "title", name: "Newbee", description: "Just starting your journey", icon: "📜", value: "Newbee", tier: 1, isPremium: false, rarity: "common" },
      { id: "title_honey_seeker", type: "title", name: "Honey Seeker", description: "Always hunting for that sweet nectar", icon: "📜", value: "Honey Seeker", tier: 10, isPremium: false, rarity: "uncommon" },
      { id: "title_golden_speller", type: "title", name: "Golden Speller", description: "Words turn to gold under your fingertips", icon: "📜", value: "Golden Speller", tier: 25, isPremium: true, rarity: "rare" },
      { id: "title_hive_royalty", type: "title", name: "Hive Royalty", description: "The arena bows to your mastery", icon: "📜", value: "Hive Royalty", tier: 50, isPremium: true, rarity: "legendary" },

      // Avatar Frames
      { id: "frame_golden", type: "avatar_frame", name: "Golden Frame", description: "Gilded border for your portrait", icon: "🖼️", value: "frame_golden", tier: 20, isPremium: true, rarity: "rare" },
      { id: "frame_royal", type: "avatar_frame", name: "Royal Frame", description: "Ornate frame worthy of royalty", icon: "🖼️", value: "frame_royal", tier: 40, isPremium: true, rarity: "epic" },

      // Emotes
      { id: "emote_waggle", type: "emote", name: "Waggle Dance", description: "Communicate with the hive", icon: "💃", value: "emote_waggle", tier: 10, isPremium: true, rarity: "uncommon" },
      { id: "emote_royal_bow", type: "emote", name: "Royal Bow", description: "A deep, respectful bow", icon: "🙇", value: "emote_royal_bow", tier: 30, isPremium: true, rarity: "epic" },

      // XP Boosts
      { id: "xp_boost_small", type: "xp_boost", name: "XP Boost (1hr)", description: "Double XP for 1 hour", icon: "⚡", value: "xp_boost_1h", tier: 5, isPremium: true, rarity: "uncommon" },
      { id: "xp_boost_medium", type: "xp_boost", name: "XP Boost (6hr)", description: "Double XP for 6 hours", icon: "⚡", value: "xp_boost_6h", tier: 20, isPremium: true, rarity: "rare" },
      { id: "xp_boost_large", type: "xp_boost", name: "XP Boost (24hr)", description: "Double XP for 24 hours", icon: "⚡", value: "xp_boost_24h", tier: 40, isPremium: true, rarity: "epic" },
    ],
  };

  return pools[seasonId] || pools.season_1;
}

function getRewardForTier(
  tier: number,
  isPremium: boolean,
  pool: BattlePassReward[]
): BattlePassReward | null {
  // Filter pool for this tier and premium status
  const candidates = pool.filter(
    (r) => r.tier === tier && r.isPremium === isPremium
  );

  if (candidates.length === 0) return null;

  // For now, return the first match. Could randomize or weight by rarity later.
  return candidates[0];
}

// Get all seasons
export function getAllSeasons(): BattlePassSeason[] {
  const season1 = { ...SEASON_1 };
  season1.tiers = generateSeasonTiers(season1);
  return [season1];
}

export function getCurrentSeason(): BattlePassSeason {
  const now = new Date();
  const seasons = getAllSeasons();

  for (const season of seasons) {
    const start = new Date(season.startDate);
    const end = new Date(season.endDate);
    if (now >= start && now <= end) {
      return season;
    }
  }

  // Return latest season if none active
  return seasons[seasons.length - 1];
}

export function getSeasonById(id: string): BattlePassSeason | undefined {
  return getAllSeasons().find((s) => s.id === id);
}

// Check if season is active
export function isSeasonActive(season: BattlePassSeason): boolean {
  const now = new Date();
  const start = new Date(season.startDate);
  const end = new Date(season.endDate);
  return now >= start && now <= end;
}

// Calculate time remaining in season
export function getSeasonTimeRemaining(season: BattlePassSeason): {
  days: number;
  hours: number;
  minutes: number;
  isEnded: boolean;
} {
  const now = new Date();
  const end = new Date(season.endDate);
  const diff = end.getTime() - now.getTime();

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, isEnded: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return { days, hours, minutes, isEnded: false };
}
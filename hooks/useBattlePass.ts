import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/services/supabase";
import type {
  BattlePassSeason,
  PlayerBattlePassState,
  BattlePassProgress,
  BattlePassReward,
} from "@/utils/battlePass";
import {
  getCurrentSeason,
  getSeasonById,
  getProgressInTier,
  isSeasonActive,
  getSeasonTimeRemaining,
} from "@/utils/battlePass";

const BATTLE_PASS_STORAGE_KEY = "hivespell.battle_pass";

interface UseBattlePassReturn {
  season: BattlePassSeason | null;
  progress: BattlePassProgress | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  claimReward: (tier: number, isPremium: boolean) => Promise<boolean>;
  purchasePremium: () => Promise<boolean>;
  addXp: (amount: number) => Promise<void>;
  timeRemaining: { days: number; hours: number; minutes: number; isEnded: boolean } | null;
}

/**
 * Hook for managing Battle Pass state and progression
 */
export function useBattlePass(seasonId?: string): UseBattlePassReturn {
  const { user, userData, refreshUser } = useAuth();
  const [season, setSeason] = useState<BattlePassSeason | null>(null);
  const [progress, setProgress] = useState<BattlePassProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<{
    days: number;
    hours: number;
    minutes: number;
    isEnded: boolean;
  } | null>(null);

  // Load season data
  const loadSeason = useCallback(async () => {
    try {
      const targetSeason = seasonId ? getSeasonById(seasonId) : getCurrentSeason();
      if (!targetSeason) throw new Error("No active season found");
      setSeason(targetSeason);
      return targetSeason;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load season");
      return null;
    }
  }, [seasonId]);

  // Load player battle pass state from Supabase
  const loadPlayerState = useCallback(
    async (targetSeason: BattlePassSeason): Promise<PlayerBattlePassState | null> => {
      if (!user) return null;

      try {
        const { data, error: fetchError } = await supabase
          .from("battle_pass_progress")
          .select("*")
          .eq("user_id", user.uid)
          .eq("season_id", targetSeason.id)
          .single();

        if (fetchError && fetchError.code !== "PGRST116") {
          // PGRST116 = no rows found
          throw fetchError;
        }

        if (data) {
          return {
            seasonId: data.season_id,
            currentTier: data.current_tier,
            currentXp: data.current_xp,
            totalXpEarned: data.total_xp_earned,
            isPremium: data.is_premium,
            claimedFreeTiers: data.claimed_free_tiers || [],
            claimedPremiumTiers: data.claimed_premium_tiers || [],
            lastUpdated: data.last_updated,
            weeklyProgress: data.weekly_progress || [],
          };
        }
      } catch (err) {
        console.warn("Failed to load battle pass state:", err);
      }

      // Return default state for new players
      return {
        seasonId: targetSeason.id,
        currentTier: 0,
        currentXp: 0,
        totalXpEarned: 0,
        isPremium: false,
        claimedFreeTiers: [],
        claimedPremiumTiers: [],
        lastUpdated: new Date().toISOString(),
        weeklyProgress: [],
      };
    },
    [user]
  );

  // Save player state to Supabase
  const savePlayerState = useCallback(
    async (state: PlayerBattlePassState): Promise<boolean> => {
      if (!user) return false;

      try {
        const { error } = await supabase.from("battle_pass_progress").upsert({
          user_id: user.uid,
          season_id: state.seasonId,
          current_tier: state.currentTier,
          current_xp: state.currentXp,
          total_xp_earned: state.totalXpEarned,
          is_premium: state.isPremium,
          claimed_free_tiers: state.claimedFreeTiers,
          claimed_premium_tiers: state.claimedPremiumTiers,
          last_updated: new Date().toISOString(),
          weekly_progress: state.weeklyProgress,
        });

        if (error) throw error;
        return true;
      } catch (err) {
        console.error("Failed to save battle pass state:", err);
        return false;
      }
    },
    [user]
  );

  // Calculate progress from state
  const calculateProgress = useCallback(
    (
      targetSeason: BattlePassSeason,
      state: PlayerBattlePassState
    ): BattlePassProgress => {
      const { currentTier, xpIntoTier, xpForNextTier } = getProgressInTier(
        state.totalXpEarned,
        targetSeason.xpPerTier,
        targetSeason.xpCurve
      );

      const progressPercent =
        targetSeason.totalTiers > 0
          ? Math.min(100, (currentTier / targetSeason.totalTiers) * 100)
          : 0;

      // Find next unclaimed reward
      let nextReward: BattlePassReward | null = null;
      for (let t = currentTier + 1; t <= targetSeason.totalTiers; t++) {
        const tierData = targetSeason.tiers.find((tier) => tier.tier === t);
        if (tierData) {
          if (!state.claimedFreeTiers.includes(t) && tierData.freeReward) {
            nextReward = tierData.freeReward;
            break;
          }
          if (state.isPremium && !state.claimedPremiumTiers.includes(t) && tierData.premiumReward) {
            nextReward = tierData.premiumReward;
            break;
          }
        }
      }

      const canClaimFree =
        currentTier > 0 &&
        currentTier <= targetSeason.totalTiers &&
        !state.claimedFreeTiers.includes(currentTier);

      const canClaimPremium =
        state.isPremium &&
        currentTier > 0 &&
        currentTier <= targetSeason.totalTiers &&
        !state.claimedPremiumTiers.includes(currentTier);

      return {
        season: targetSeason,
        state,
        progressPercent,
        xpToNextTier: xpForNextTier - xpIntoTier,
        nextReward,
        canClaimFree,
        canClaimPremium,
      };
    },
    []
  );

  // Main refresh function
  const refresh = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const targetSeason = await loadSeason();
      if (!targetSeason) throw new Error("No season loaded");

      const playerState = await loadPlayerState(targetSeason);
      if (!playerState) throw new Error("Failed to load player state");

      const calculatedProgress = calculateProgress(targetSeason, playerState);
      setProgress(calculatedProgress);

      // Update time remaining
      const remaining = getSeasonTimeRemaining(targetSeason);
      setTimeRemaining(remaining);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh battle pass");
    } finally {
      setLoading(false);
    }
  }, [user, loadSeason, loadPlayerState, calculateProgress]);

  // Auto-refresh on mount and when user changes
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Update timer every minute
  useEffect(() => {
    if (!season) return;

    const interval = setInterval(() => {
      const remaining = getSeasonTimeRemaining(season);
      setTimeRemaining(remaining);
    }, 60000); // 1 minute

    return () => clearInterval(interval);
  }, [season]);

  // Claim a reward
  const claimReward = useCallback(
    async (tier: number, isPremium: boolean): Promise<boolean> => {
      if (!user || !progress) return false;

      const targetSeason = progress.season;
      const tierData = targetSeason.tiers.find((t) => t.tier === tier);
      if (!tierData) return false;

      const reward = isPremium ? tierData.premiumReward : tierData.freeReward;
      if (!reward) return false;

      // Check if already claimed
      const claimedTiers = isPremium
        ? progress.state.claimedPremiumTiers
        : progress.state.claimedFreeTiers;
      if (claimedTiers.includes(tier)) return false;

      // Check if tier is reached
      if (progress.state.currentTier < tier) return false;

      // Check premium status for premium rewards
      if (isPremium && !progress.state.isPremium) return false;

      try {
        // Apply reward
        await applyReward(user, reward);

        // Update claimed tiers
        const newState: PlayerBattlePassState = {
          ...progress.state,
          claimedFreeTiers: isPremium
            ? progress.state.claimedFreeTiers
            : [...progress.state.claimedFreeTiers, tier],
          claimedPremiumTiers: isPremium
            ? [...progress.state.claimedPremiumTiers, tier]
            : progress.state.claimedPremiumTiers,
          lastUpdated: new Date().toISOString(),
        };

        const saved = await savePlayerState(newState);
        if (saved) {
          const newProgress = calculateProgress(targetSeason, newState);
          setProgress(newProgress);
          await refreshUser(); // Refresh user data for currency updates
          return true;
        }
      } catch (err) {
        console.error("Failed to claim reward:", err);
      }

      return false;
    },
    [user, progress, savePlayerState, calculateProgress, refreshUser]
  );

  // Purchase premium pass
  const purchasePremium = useCallback(async (): Promise<boolean> => {
    if (!user || !progress || progress.state.isPremium) return false;

    const honeyCost = progress.season.premiumPrice;

    // Check if user has enough honey
    // Note: honey balance would need to be added to userData
    // For now, we'll just allow purchase
    try {
      const newState: PlayerBattlePassState = {
        ...progress.state,
        isPremium: true,
        lastUpdated: new Date().toISOString(),
      };

      const saved = await savePlayerState(newState);
      if (saved) {
        const newProgress = calculateProgress(progress.season, newState);
        setProgress(newProgress);
        // Deduct honey from user (would need honey balance in profile)
        await refreshUser();
        return true;
      }
    } catch (err) {
      console.error("Failed to purchase premium:", err);
    }

    return false;
  }, [user, progress, savePlayerState, calculateProgress, refreshUser]);

  // Add XP (called from gameplay)
  const addXp = useCallback(
    async (amount: number): Promise<void> => {
      if (!user || !progress) return;

      const newTotalXp = progress.state.totalXpEarned + amount;
      const { currentTier } = getProgressInTier(
        newTotalXp,
        progress.season.xpPerTier,
        progress.season.xpCurve
      );

      const newState: PlayerBattlePassState = {
        ...progress.state,
        currentTier: Math.min(currentTier, progress.season.totalTiers),
        currentXp: amount, // This would be XP into current tier
        totalXpEarned: newTotalXp,
        lastUpdated: new Date().toISOString(),
      };

      const saved = await savePlayerState(newState);
      if (saved) {
        const newProgress = calculateProgress(progress.season, newState);
        setProgress(newProgress);
      }
    },
    [user, progress, savePlayerState, calculateProgress]
  );

  return {
    season,
    progress,
    loading,
    error,
    refresh,
    claimReward,
    purchasePremium,
    addXp,
    timeRemaining,
  };
}

/**
 * Apply a reward to the player's account
 */
async function applyReward(
  user: { uid: string },
  reward: BattlePassReward
): Promise<void> {
  switch (reward.type) {
    case "nectar":
      // Add nectar to profile
      await supabase.rpc("increment_nectar", {
        p_user_id: user.uid,
        p_amount: reward.value as number,
        p_lifetime: true,
      });
      break;

    case "honey":
      // Add honey (premium currency) - would need honey column in profiles
      // await supabase.from("profiles").update({ honey: ... }).eq("id", user.uid);
      console.log(`Would add ${reward.value} honey to user ${user.uid}`);
      break;

    case "theme":
      // Add theme to inventory
      await supabase.rpc("add_to_inventory", {
        p_user_id: user.uid,
        p_item_id: reward.value as string,
        p_item_type: "theme",
      });
      break;

    case "cursor":
      await supabase.rpc("add_to_inventory", {
        p_user_id: user.uid,
        p_item_id: reward.value as string,
        p_item_type: "cursor",
      });
      break;

    case "badge":
      await supabase.rpc("add_to_inventory", {
        p_user_id: user.uid,
        p_item_id: reward.value as string,
        p_item_type: "badge",
      });
      break;

    case "title":
      // Titles are handled differently - they're just strings
      // Could add to a titles collection
      console.log(`Unlocked title: ${reward.value}`);
      break;

    case "avatar_frame":
      await supabase.rpc("add_to_inventory", {
        p_user_id: user.uid,
        p_item_id: reward.value as string,
        p_item_type: "avatar_frame",
      });
      break;

    case "emote":
      await supabase.rpc("add_to_inventory", {
        p_user_id: user.uid,
        p_item_id: reward.value as string,
        p_item_type: "emote",
      });
      break;

    case "xp_boost":
      // Activate XP boost - would need boost system
      console.log(`Activated XP boost: ${reward.value}`);
      break;
  }
}
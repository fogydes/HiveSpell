import React, { useMemo, useState, useCallback } from "react";
import { useBattlePass } from "@/hooks/useBattlePass";
import { TierBadgeMini } from "@/components/tier/TierBadge";
import { formatTierDisplay } from "@/utils/tierRanking";
import type { BattlePassSeason, BattlePassProgress, BattlePassReward } from "@/utils/battlePass";
import { useScene } from "@/context/SceneContext";
import { useReduceMotion } from "@/hooks/useAccessibility";

interface BattlePassProps {
  seasonId?: string;
  className?: string;
}

/**
 * Seasonal Battle Pass Component
 * Displays the battle pass track with free/premium rewards
 */
export const BattlePass: React.FC<BattlePassProps> = ({
  seasonId,
  className = "",
}) => {
  const {
    season,
    progress,
    loading,
    error,
    claimReward,
    purchasePremium,
    timeRemaining,
  } = useBattlePass(seasonId);

  const { performanceTier } = useScene();
  const reduceMotion = useReduceMotion();
  const disableAnimations = performanceTier === "static" || reduceMotion;

  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  if (loading) {
    return (
      <div className="theme-panel-shell flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (error || !season || !progress) {
    return (
      <div className="theme-panel-shell p-8 text-center text-text-muted">
        {error || "No active season"}
      </div>
    );
  }

  const { state, season: progressSeason } = progress;
  const isActive = isSeasonActive(season);

  // Generate visible tier range (centered on current tier)
  const visibleTiers = useMemo(() => {
    const current = Math.max(1, state.currentTier);
    const start = Math.max(1, current - 2);
    const end = Math.min(season.totalTiers, start + 6);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [state.currentTier, season.totalTiers]);

  // Check if tier has unclaimed rewards
  const hasUnclaimedFree = useCallback((tier: number) =>
    tier <= state.currentTier && !state.claimedFreeTiers.includes(tier),
  [state.currentTier, state.claimedFreeTiers]);

  const hasUnclaimedPremium = useCallback((tier: number) =>
    state.isPremium && tier <= state.currentTier && !state.claimedPremiumTiers.includes(tier),
  [state.isPremium, state.currentTier, state.claimedPremiumTiers]);

  return (
    <div className={`theme-panel-shell flex flex-col overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 border-b border-[var(--theme-border-strong)]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
              {season.displayName}
            </span>
            {!isActive && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted px-2 py-0.5 rounded bg-surface">
                ENDED
              </span>
            )}
          </div>
          <p className="text-text-muted text-sm max-w-md">{season.description}</p>
        </div>

        <div className="flex items-center gap-4">
          {/* Time Remaining */}
          {timeRemaining && !timeRemaining.isEnded && (
            <div className="hidden sm:flex items-center gap-2 text-text-muted text-sm">
              <span className="font-mono text-primary">
                {timeRemaining.days}d {timeRemaining.hours}h {timeRemaining.minutes}m
              </span>
              <span>remaining</span>
            </div>
          )}

          {/* Premium Status / Purchase */}
          {state.isPremium ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/50">
              <span className="text-amber-400">👑</span>
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                PREMIUM
              </span>
            </div>
          ) : (
            <button
              onClick={() => setShowPremiumModal(true)}
              className="px-4 py-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-app font-bold text-sm hover:opacity-90 transition-opacity"
            >
              <span className="flex items-center gap-1">
                👑 Upgrade — {season.premiumPrice} 💎
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-6 py-4 border-b border-[var(--theme-border-strong)]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
            Season Progress: Tier {state.currentTier} / {season.totalTiers}
          </span>
          <span className="text-xs font-bold text-primary">
            {progress.progressPercent.toFixed(1)}%
          </span>
        </div>
        <div className="relative h-3 bg-surface rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, progress.progressPercent)}%` }}
          ></div>
          {/* Tier markers */}
          {Array.from({ length: 10 }, (_, i) => (
            <div
              key={i}
              className="absolute top-1/2 -translate-y-1/2 w-0.5 h-2 bg-surface/50"
              style={{ left: `${(i / 9) * 100}%` }}
            />
          ))}
        </div>
        <div className="flex justify-between text-[9px] text-text-muted mt-1 px-1">
          <span>Tier 1</span>
          <span>Tier {Math.ceil(season.totalTiers / 2)}</span>
          <span>Tier {season.totalTiers}</span>
        </div>
      </div>

      {/* Reward Track */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid gap-4">
          {/* Free Track */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-green-500/20 border border-green-500/50 flex items-center justify-center">
                <span className="text-green-400 text-sm">FREE</span>
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                Free Track
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-4 snap-x">
              {visibleTiers.map((tier) => {
                const tierData = season.tiers.find((t) => t.tier === tier);
                const freeReward = tierData?.freeReward ?? null;
                const isCurrent = tier === state.currentTier;
                const isCompleted = tier < state.currentTier;
                const isLocked = tier > state.currentTier;
                const isClaimed = state.claimedFreeTiers.includes(tier);
                const canClaim = hasUnclaimedFree(tier);

                return (
                  <BattlePassTierCard
                    key={`free-${tier}`}
                    tier={tier}
                    reward={freeReward}
                    isCurrent={isCurrent}
                    isCompleted={isCompleted}
                    isLocked={isLocked}
                    isClaimed={isClaimed}
                    canClaim={canClaim}
                    onClick={() => setSelectedTier(tier)}
                    isPremium={false}
                  />
                );
              })}
            </div>
          </div>

          {/* Premium Track */}
          <div className={state.isPremium ? "" : "opacity-50"}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center">
                <span className="text-app text-sm font-bold">PREMIUM</span>
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                Premium Track
              </span>
              {!state.isPremium && (
                <button
                  onClick={() => setShowPremiumModal(true)}
                  className="ml-auto text-xs text-amber-400 hover:underline"
                >
                  Unlock
                </button>
              )}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-4 snap-x">
              {visibleTiers.map((tier) => {
                const tierData = season.tiers.find((t) => t.tier === tier);
                const premiumReward = tierData?.premiumReward ?? null;
                const isCurrent = tier === state.currentTier;
                const isCompleted = tier < state.currentTier;
                const isLocked = tier > state.currentTier;
                const isClaimed = state.claimedPremiumTiers.includes(tier);
                const canClaim = hasUnclaimedPremium(tier);

                return (
                  <BattlePassTierCard
                    key={`premium-${tier}`}
                    tier={tier}
                    reward={premiumReward}
                    isCurrent={isCurrent}
                    isCompleted={isCompleted}
                    isLocked={isLocked}
                    isClaimed={isClaimed}
                    canClaim={canClaim}
                    onClick={() => setSelectedTier(tier)}
                    isPremium={true}
                    disabled={!state.isPremium}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Selected Tier Detail Modal */}
      {selectedTier !== null && (
        <BattlePassTierDetail
          tier={selectedTier}
          season={season}
          progress={progress}
          onClaim={claimReward}
          onClose={() => setSelectedTier(null)}
        />
      )}

      {/* Premium Upgrade Modal */}
      {showPremiumModal && (
        <BattlePassPremiumModal
          season={season}
          onPurchase={purchasePremium}
          onClose={() => setShowPremiumModal(false)}
        />
      )}
    </div>
  );
};

/**
 * Individual Tier Card in the track
 */
interface BattlePassTierCardProps {
  tier: number;
  reward: BattlePassReward | null;
  isCurrent: boolean;
  isCompleted: boolean;
  isLocked: boolean;
  isClaimed: boolean;
  canClaim: boolean;
  onClick: () => void;
  isPremium: boolean;
  disabled?: boolean;
}

const BattlePassTierCard: React.FC<BattlePassTierCardProps> = ({
  tier,
  reward,
  isCurrent,
  isCompleted,
  isLocked,
  isClaimed,
  canClaim,
  onClick,
  isPremium,
  disabled = false,
}) => {
  const rarityClass = reward ? getRarityColor(reward.rarity) : "border-surface bg-panel/50";

  const bgStyle = isPremium
    ? { background: "linear-gradient(180deg, rgba(245,158,11,0.08) 0%, rgba(245,158,11,0.02) 100%)" }
    : { background: "linear-gradient(180deg, rgba(16,185,129,0.08) 0%, rgba(16,185,129,0.02) 100%)" };

  const tierNumberStyle = isCurrent
    ? "bg-primary text-app"
    : isCompleted
    ? "bg-green-500 text-app"
    : "bg-surface text-text-muted";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative flex-shrink-0 w-20 sm:w-24 h-32 sm:h-36 flex flex-col items-center p-2 rounded-xl border-2 transition-all ${
        isCurrent
          ? "ring-2 ring-primary scale-105 z-10"
          : isCompleted
          ? "opacity-70"
          : isLocked
          ? "opacity-40"
          : ""
      } ${rarityClass} ${canClaim ? "animate-pulse" : ""}`}
      style={bgStyle}
    >
      {/* Tier Number */}
      <div className="absolute -top-2 left-1/2 -translate-x-1/2">
        <span
          className={`text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${tierNumberStyle}`}
        >
          {tier}
        </span>
      </div>

      {/* Reward Icon */}
      <div className="flex-1 flex items-center justify-center mb-1">
        {reward ? (
          <span className="text-3xl sm:text-4xl filter drop-shadow-lg">
            {reward.icon}
          </span>
        ) : (
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-surface border border-surface flex items-center justify-center">
            <span className="text-text-muted text-xs">—</span>
          </div>
        )}

        {/* Claim indicator */}
        {canClaim && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center animate-pop-in">
            <span className="text-app text-xs font-bold">✓</span>
          </div>
        )}

        {/* Claimed check */}
        {isClaimed && (
          <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
            <span className="text-2xl text-green-400">✓</span>
          </div>
        )}

        {/* Locked overlay */}
        {isLocked && (
          <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center">
            <span className="text-text-muted text-xl">🔒</span>
          </div>
        )}

        {/* Premium lock */}
        {disabled && isPremium && !isLocked && (
          <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
            <span className="text-amber-400 text-xl">👑</span>
          </div>
        )}
      </div>

      {/* Reward Name */}
      {reward && (
        <div className="text-[9px] sm:text-[10px] font-medium text-center text-text-main line-clamp-1 px-1">
          {reward.name}
        </div>
      )}
    </button>
  );
};

/**
 * Tier Detail Modal
 */
interface BattlePassTierDetailProps {
  tier: number;
  season: BattlePassSeason;
  progress: BattlePassProgress;
  onClaim: (tier: number, isPremium: boolean) => Promise<boolean>;
  onClose: () => void;
}

const BattlePassTierDetail: React.FC<BattlePassTierDetailProps> = ({
  tier,
  season,
  progress,
  onClaim,
  onClose,
}) => {
  const tierData = season.tiers.find((t) => t.tier === tier);
  const freeReward = tierData?.freeReward;
  const premiumReward = tierData?.premiumReward;
  const { state } = progress;

  const freeClaimed = state.claimedFreeTiers.includes(tier);
  const premiumClaimed = state.claimedPremiumTiers.includes(tier);
  const canClaimFree = tier <= state.currentTier && !freeClaimed;
  const canClaimPremium =
    state.isPremium && tier <= state.currentTier && !premiumClaimed;

  const handleClaimFree = useCallback(async () => {
    await onClaim(tier, false);
    onClose();
  }, [onClaim, tier, onClose]);

  const handleClaimPremium = useCallback(async () => {
    await onClaim(tier, true);
    onClose();
  }, [onClaim, tier, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="theme-panel-shell w-full max-w-md rounded-2xl overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-1 rounded-full bg-surface/50 hover:bg-surface text-text-muted transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-6">
          <h3 className="text-xl font-bold mb-1">Tier {tier} Rewards</h3>
          <p className="text-text-muted text-sm mb-6">
            {tier === state.currentTier
              ? "Current tier — claim your rewards!"
              : tier < state.currentTier
              ? "Completed tier"
              : "Reach this tier to unlock"}
          </p>

          <div className="grid grid-cols-2 gap-4">
            {/* Free Reward */}
            <div className="relative p-4 rounded-xl border-2 border-green-500/50 bg-green-500/10">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-green-400">
                  FREE
                </span>
              </div>

              {freeReward ? (
                <React.Fragment>
                  <div className="text-4xl mb-2 text-center">{freeReward.icon}</div>
                  <div className="text-center mb-2">
                    <div className="font-bold text-text-main">{freeReward.name}</div>
                    <div className="text-xs text-text-muted">{freeReward.description}</div>
                  </div>
                  <div className="text-xs text-primary font-medium">
                    {typeof freeReward.value === "number" ? `+${freeReward.value}` : freeReward.value}
                  </div>

                  <button
                    onClick={handleClaimFree}
                    disabled={freeClaimed || !canClaimFree}
                    className="w-full mt-4 px-3 py-2 rounded-lg text-sm font-bold transition-all"
                  >
                    {freeClaimed ? "Claimed" : canClaimFree ? "Claim" : "Locked"}
                  </button>
                </React.Fragment>
              ) : (
                <div className="text-center text-text-muted py-8">No reward</div>
              )}
            </div>

            {/* Premium Reward */}
            <div className={`relative p-4 rounded-xl border-2 ${
              state.isPremium
                ? "border-amber-500/50 bg-amber-500/10"
                : "border-surface bg-panel/30 opacity-60"
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  PREMIUM
                </span>
              </div>

              {premiumReward ? (
                <React.Fragment>
                  <div className="text-4xl mb-2 text-center">{premiumReward.icon}</div>
                  <div className="text-center mb-2">
                    <div className="font-bold text-text-main">{premiumReward.name}</div>
                    <div className="text-xs text-text-muted">{premiumReward.description}</div>
                  </div>
                  <div className="text-xs text-amber-400 font-medium">
                    {typeof premiumReward.value === "number" ? `+${premiumReward.value}` : premiumReward.value}
                  </div>

                  <button
                    onClick={handleClaimPremium}
                    disabled={!state.isPremium || premiumClaimed || !canClaimPremium}
                    className="w-full mt-4 px-3 py-2 rounded-lg text-sm font-bold transition-all"
                  >
                    {premiumClaimed
                      ? "Claimed"
                      : canClaimPremium
                      ? "Claim"
                      : state.isPremium
                      ? "Locked"
                      : "Upgrade to Claim"}
                  </button>
                </React.Fragment>
              ) : (
                <div className="text-center text-text-muted py-8">No reward</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Premium Upgrade Modal
 */
interface BattlePassPremiumModalProps {
  season: BattlePassSeason;
  onPurchase: () => Promise<boolean>;
  onClose: () => void;
}

const BattlePassPremiumModal: React.FC<BattlePassPremiumModalProps> = ({
  season,
  onPurchase,
  onClose,
}) => {
  const [purchasing, setPurchasing] = useState(false);

  const benefits = [
    "🎨 Exclusive Royal Jelly Theme",
    "👑 Queen Bee Cursor",
    "💎 Honey Crystals at tiers 1, 10, 25, 50",
    "⚡ XP Boosts (1h, 6h, 24h)",
    "🖼️ Golden & Royal Avatar Frames",
    "💃 Exclusive Emotes",
    "🏅 Legendary Badges & Titles",
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="theme-panel-shell w-full max-w-md rounded-2xl overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-1 rounded-full bg-surface/50 hover:bg-surface text-text-muted transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-6 text-center">
          <div className="text-6xl mb-4">👑</div>
          <h3 className="text-2xl font-bold mb-2">Unlock Premium Track</h3>
          <p className="text-text-muted mb-6">
            Get exclusive rewards every tier: premium cosmetics, honey currency, XP boosts,
            and the Season 1 Royal Jelly Theme!
          </p>

          <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/50 rounded-xl p-4 mb-6">
            <div className="text-3xl font-bold text-amber-400 mb-1">{season.premiumPrice}</div>
            <div className="text-sm text-text-muted">Honey Crystals</div>
          </div>

          <div className="space-y-2 text-left text-sm mb-6">
            {benefits.map((benefit, i) => (
              <div key={i} className="flex items-center gap-2 text-text-muted">
                <span className="text-green-400">✓</span>
                {benefit}
              </div>
            ))}
          </div>

          <button
            onClick={async () => {
              setPurchasing(true);
              const success = await onPurchase();
              if (success) onClose();
              setPurchasing(false);
            }}
            disabled={purchasing}
            className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-app font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {purchasing ? "Purchasing..." : `Purchase for ${season.premiumPrice} 💎`}
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper functions
function isSeasonActive(season: BattlePassSeason): boolean {
  const now = new Date();
  const start = new Date(season.startDate);
  const end = new Date(season.endDate);
  return now >= start && now <= end;
}

function getRarityColor(rarity: string): string {
  switch (rarity) {
    case "legendary":
      return "border-amber-400 bg-amber-400/10";
    case "epic":
      return "border-purple-400 bg-purple-400/10";
    case "rare":
      return "border-blue-400 bg-blue-400/10";
    case "uncommon":
      return "border-green-400 bg-green-400/10";
    default:
      return "border-surface bg-panel/50";
  }
}

export default BattlePass;
// Phase 4c: Daily/Weekly Challenges - UI Components

import React, { useState, useEffect } from 'react';
import {
  PlayerChallenge,
  ChallengeTier,
  ChallengeType,
  formatChallengeProgress,
  getChallengeProgressPercent,
  getChallengeTierColor,
  getChallengeCategoryIcon,
  CHALLENGE_TYPE_LABELS,
  formatTimeUntilReset,
  type ChallengeTier as ChallengeTierType,
} from '../../utils/challenges';
import { useScene } from "@/context/SceneContext";
import { useReduceMotion } from "@/hooks/useAccessibility";

interface ChallengeCardProps {
  challenge: PlayerChallenge;
  onClaim: () => void;
  claiming?: boolean;
  compact?: boolean;
}

export const ChallengeCard: React.FC<ChallengeCardProps> = ({
  challenge,
  onClaim,
  claiming,
  compact = false,
}) => {
  const { performanceTier } = useScene();
  const reduceMotion = useReduceMotion();
  const disableAnimations = performanceTier === "static" || reduceMotion;

  const tierColor = getChallengeTierColor(challenge.tier);
  const categoryIcon = getChallengeCategoryIcon(challenge.category);
  const isCompleted = challenge.isCompleted;
  const isClaimed = challenge.isClaimed;
  const progress = getChallengeProgressPercent(challenge.currentProgress, challenge.targetValue);
  const progressText = formatChallengeProgress(challenge.currentProgress, challenge.targetValue);

  const tierGlow = {
    boxShadow: `0 0 12px ${tierColor}40, inset 0 0 20px ${tierColor}10`,
    borderColor: tierColor,
  };

  if (compact) {
    return (
      <div
        className={`relative rounded-xl p-4 transition-all duration-300 ${
          isCompleted ? 'bg-gradient-to-r from-emerald-500/20 to-emerald-600/10' : 'bg-slate-800/50'
        } border ${isCompleted ? 'border-emerald-500/50' : 'border-slate-700'} overflow-hidden`}
        style={isCompleted ? tierGlow : {}}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{categoryIcon}</span>
              <h4 className="font-semibold text-white truncate">{challenge.title}</h4>
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded-full border ${
                  challenge.type === 'daily'
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    : 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                }`}
              >
                {challenge.type === 'daily' ? 'Daily' : 'Weekly'}
              </span>
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded-full border ml-auto`}
                style={{
                  backgroundColor: `${tierColor}20`,
                  color: tierColor,
                  borderColor: `${tierColor}40`,
                }}
              >
                {challenge.tier}
              </span>
            </div>
            <p className="text-slate-400 text-sm mb-2 truncate">{challenge.description}</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-slate-700 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${progress}%`,
                    background: `linear-gradient(90deg, ${tierColor}, ${tierColor}dd)`,
                  }}
                ></div>
              </div>
              <span className="text-xs font-mono text-slate-400 w-20 text-right">{progressText}</span>
            </div>
          </div>
          {isCompleted && !isClaimed && (
            <button
              onClick={onClaim}
              disabled={claiming}
              className="flex-shrink-0 px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-semibold rounded-lg hover:from-emerald-600 hover:to-emerald-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {claiming ? '...' : 'Claim'}
            </button>
          )}
          {isClaimed && (
            <div className="flex-shrink-0 px-3 py-1.5 bg-slate-700 text-slate-400 text-sm font-medium rounded-lg">
              Claimed
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-2xl p-5 transition-all duration-300 ${
        isCompleted ? 'bg-gradient-to-br from-emerald-500/15 to-emerald-600/5' : 'bg-slate-800/60'
      } border-2 ${isCompleted ? 'border-emerald-500/50' : 'border-slate-700'} overflow-hidden`}
      style={isCompleted ? tierGlow : {}}
    >
      {/* Tier indicator bar */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ background: `linear-gradient(90deg, ${tierColor}, ${tierColor}88, transparent)` }}
      ></div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
              style={{ backgroundColor: `${tierColor}20` }}
            >
              {categoryIcon}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{challenge.title}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`px-2 py-0.5 text-xs font-medium rounded-full border ${
                    challenge.type === 'daily'
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      : 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                  }`}
                >
                  {challenge.type === 'daily' ? 'Daily' : 'Weekly'}
                </span>
                <span
                  className="px-2 py-0.5 text-xs font-medium rounded-full border"
                  style={{
                    backgroundColor: `${tierColor}20`,
                    color: tierColor,
                    borderColor: `${tierColor}40`,
                  }}
                >
                  {challenge.tier}
                </span>
              </div>
            </div>
          </div>

          {/* Rewards preview */}
          <div className="flex items-center gap-3 text-right">
            {challenge.rewardXp > 0 && (
              <div className="flex items-center gap-1 text-amber-400">
                <span className="text-lg">✨</span>
                <span className="font-bold">{challenge.rewardXp} XP</span>
              </div>
            )}
            {challenge.rewardNectar > 0 && (
              <div className="flex items-center gap-1 text-yellow-400">
                <span className="text-lg">🍯</span>
                <span className="font-bold">{challenge.rewardNectar}</span>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-slate-300 mb-4">{challenge.description}</p>

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-400">Progress</span>
            <span className="font-mono font-bold text-white">{progressText}</span>
          </div>
          <div className="h-3 rounded-full bg-slate-700 overflow-hidden relative">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out relative"
              style={{
                width: `${progress}%`,
                background: `linear-gradient(90deg, ${tierColor}, ${tierColor}dd)`,
              }}
            >
              {progress >= 100 && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
              )}
            </div>
          </div>
        </div>

        {/* Action / Status */}
        <div className="pt-2 border-t border-slate-700/50">
          {isCompleted && !isClaimed ? (
            <button
              onClick={onClaim}
              disabled={claiming}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold rounded-xl hover:from-emerald-600 hover:to-emerald-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
            >
              {claiming ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Claiming...
                </span>
              ) : (
                'Claim Reward'
              )}
            </button>
          ) : isClaimed ? (
            <div className="w-full py-3 bg-slate-700 text-slate-400 font-medium rounded-xl text-center flex items-center justify-center gap-2">
              <span className="text-lg">✓</span>
              Reward Claimed
            </div>
          ) : (
            <div className="w-full py-3 bg-slate-700/50 text-slate-500 font-medium rounded-xl text-center">
              {progress}% Complete
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Daily/Weekly Challenge Section
interface ChallengeSectionProps {
  title: string;
  type: ChallengeType;
  challenges: PlayerChallenge[];
  onClaim: (challengeId: string) => void;
  claimingIds: Set<string>;
  resetAt: Date | null;
  completedCount: number;
  totalCount: number;
}

export const ChallengeSection: React.FC<ChallengeSectionProps> = ({
  title,
  type,
  challenges,
  onClaim,
  claimingIds,
  resetAt,
  completedCount,
  totalCount,
}) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!resetAt) return;
    const update = () => {
      const now = new Date();
      const diff = resetAt.getTime() - now.getTime();
      if (diff <= 0) {
        setTimeLeft('Resetting...');
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeLeft(`${hours}h ${minutes}m`);
    };
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [resetAt]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{
              backgroundColor: type === 'daily' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(168, 85, 247, 0.2)',
            }}
          >
            {type === 'daily' ? '☀️' : '📅'}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{title}</h2>
            <p className="text-sm text-slate-400">
              {completedCount}/{totalCount} completed {timeLeft && `• Resets in ${timeLeft}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-6 w-px bg-slate-700" />
          <span className="px-3 py-1 text-xs font-medium rounded-full bg-slate-800 text-slate-400">
            {type === 'daily' ? 'Resets daily at 00:00 UTC' : 'Resets weekly on Monday'}
          </span>
        </div>
      </div>

      {challenges.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-800/30 p-8 text-center">
          <p className="text-slate-400">
            {type === 'daily'
              ? 'No daily challenges right now — check back after the next reset.'
              : 'No weekly challenges this week — check back on Monday.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {challenges.map((challenge) => (
            <ChallengeCard
              key={challenge.challengeId}
              challenge={challenge}
              onClaim={() => onClaim(challenge.challengeId)}
              claiming={claimingIds.has(challenge.challengeId)}
            />
          ))}
        </div>
      )}
    </section>
  );
};

// Compact challenge list for Home screen
export const ChallengeSummaryBar: React.FC<{
  dailyCompleted: number;
  dailyTotal: number;
  weeklyCompleted: number;
  weeklyTotal: number;
  onClick: () => void;
}> = ({ dailyCompleted, dailyTotal, weeklyCompleted, weeklyTotal, onClick }) => {
  const dailyPercent = dailyTotal > 0 ? Math.round((dailyCompleted / dailyTotal) * 100) : 0;
  const weeklyPercent = weeklyTotal > 0 ? Math.round((weeklyCompleted / weeklyTotal) * 100) : 0;

  return (
    <button
      onClick={onClick}
      className="w-full group relative rounded-2xl p-4 bg-gradient-to-r from-slate-800/80 to-slate-900/80 border border-slate-700 hover:border-amber-500/50 transition-all duration-300 overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Daily */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <span className="text-lg">☀️</span>
            </div>
            <div className="text-left">
              <p className="text-xs text-slate-400 uppercase tracking-wide">Daily</p>
              <p className="font-bold text-white">{dailyCompleted}/{dailyTotal}</p>
            </div>
          </div>

          <div className="h-8 w-px bg-slate-700 mx-2 hidden sm:block" />

          {/* Weekly */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <span className="text-lg">📅</span>
            </div>
            <div className="text-left">
              <p className="text-xs text-slate-400 uppercase tracking-wide">Weekly</p>
              <p className="font-bold text-white">{weeklyCompleted}/{weeklyTotal}</p>
            </div>
          </div>
        </div>

        {/* Progress rings */}
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="32"
                cy="32"
                r="28"
                fill="none"
                stroke="#374151"
                strokeWidth="4"
              />
              <circle
                cx="32"
                cy="32"
                r="28"
                fill="none"
                stroke="url(#dailyGradient)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="175.9"
                strokeDashoffset={`${175.9 * (1 - dailyPercent / 100)}`}
                className="transition-all duration-700 ease-out"
              />
              <defs>
                <linearGradient id="dailyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#fbbf24" />
                </linearGradient>
                <linearGradient id="weeklyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#c084fc" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold text-white">{dailyPercent}%</span>
            </div>
          </div>

          <div className="relative w-16 h-16 ml-2">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="32"
                cy="32"
                r="28"
                fill="none"
                stroke="#374151"
                strokeWidth="4"
              />
              <circle
                cx="32"
                cy="32"
                r="28"
                fill="none"
                stroke="url(#weeklyGradient)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="175.9"
                strokeDashoffset={`${175.9 * (1 - weeklyPercent / 100)}`}
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold text-white">{weeklyPercent}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative mt-3 flex items-center gap-2 text-slate-400 text-sm">
        <span>View all challenges →</span>
        <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
};
// Phase 4c: Daily/Weekly Challenges - Main View

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChallenges } from '../hooks/useChallenges';
import { ChallengeSection, ChallengeCard } from '../components/challenges/ChallengeCard';
import {
  getChallengeTierColor,
  getChallengeCategoryIcon,
  formatChallengeProgress,
  getChallengeProgressPercent,
  CHALLENGE_TYPE_LABELS,
  type ChallengeTier,
} from '../utils/challenges';

export const ChallengesView: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userId = user?.uid || null;

  const {
    challenges,
    summary,
    loading,
    error,
    dailyResetAt,
    weeklyResetAt,
    refresh,
    claimReward,
    dailyChallenges,
    weeklyChallenges,
    completedDailyCount,
    completedWeeklyCount,
    totalDailyCount,
    totalWeeklyCount,
  } = useChallenges(userId);

  const [claimingIds, setClaimingIds] = useState<Set<string>>(new Set());

  const handleClaim = async (challengeId: string) => {
    setClaimingIds(prev => new Set(prev).add(challengeId));
    try {
      const result = await claimReward(challengeId);
      if (result.success) {
        // Could add toast notification here
        console.log('[Challenges] Reward claimed:', result);
      } else {
        console.warn('[Challenges] Claim failed:', result.message);
        // Could add error toast here
      }
    } finally {
      setClaimingIds(prev => {
        const next = new Set(prev);
        next.delete(challengeId);
        return next;
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading challenges...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Failed to Load Challenges</h2>
          <p className="text-slate-400 mb-4">{error}</p>
          <button
            onClick={refresh}
            className="px-6 py-3 bg-amber-500 text-slate-900 font-bold rounded-xl hover:bg-amber-400 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 bg-amber-500/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Sign In for Challenges</h2>
          <p className="text-slate-400 mb-6">Complete daily and weekly challenges to earn XP and nectar rewards!</p>
          <button
            onClick={() => navigate('/auth')}
            className="px-6 py-3 bg-amber-500 text-slate-900 font-bold rounded-xl hover:bg-amber-400 transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 pt-20 pb-16 px-4">
      {/* Background ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[150px] bg-amber-500/10 animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-[150px] bg-purple-500/10 animate-pulse-slow" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <header className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-amber-400 via-white to-purple-400 bg-clip-text text-transparent">
            Challenges
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Complete daily and weekly challenges to earn XP for your Battle Pass and nectar for the shop.
            Dailies reset at 00:00 UTC, weeklies reset every Monday.
          </p>

          {/* Summary Stats */}
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
            <div className="flex items-center gap-3 px-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <span className="text-lg">☀️</span>
              </div>
              <div className="text-left">
                <p className="text-xs text-slate-400 uppercase tracking-wide">Daily</p>
                <p className="font-bold text-white">{completedDailyCount}/{totalDailyCount}</p>
              </div>
            </div>

            <div className="w-px h-8 bg-slate-700 hidden md:block" />

            <div className="flex items-center gap-3 px-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <span className="text-lg">📅</span>
              </div>
              <div className="text-left">
                <p className="text-xs text-slate-400 uppercase tracking-wide">Weekly</p>
                <p className="font-bold text-white">{completedWeeklyCount}/{totalWeeklyCount}</p>
              </div>
            </div>

            <div className="w-px h-8 bg-slate-700 hidden md:block" />

            <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-400 text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Resets: Daily {dailyResetAt ? dailyResetAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC' : '—'}</span>
            </div>
          </div>
        </header>

        {/* Challenges Content */}
        <main className="space-y-8">
          {/* Daily Challenges */}
          <ChallengeSection
            title="Daily Challenges"
            type="daily"
            challenges={dailyChallenges}
            onClaim={handleClaim}
            claimingIds={claimingIds}
            resetAt={dailyResetAt}
            completedCount={completedDailyCount}
            totalCount={totalDailyCount}
          />

          {/* Weekly Challenges */}
          <ChallengeSection
            title="Weekly Challenges"
            type="weekly"
            challenges={weeklyChallenges}
            onClaim={handleClaim}
            claimingIds={claimingIds}
            resetAt={weeklyResetAt}
            completedCount={completedWeeklyCount}
            totalCount={totalWeeklyCount}
          />
        </main>

        {/* Footer hint */}
        <footer className="text-center text-slate-500 text-sm pt-8 border-t border-slate-800">
          <p>Rewards are automatically added to your Battle Pass XP and nectar balance when claimed.</p>
        </footer>
      </div>
    </div>
  );
};

export default ChallengesView;
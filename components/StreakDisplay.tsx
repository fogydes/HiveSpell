import React, { useState, useEffect } from "react";
import { useSessionState } from "@/hooks/useSessionState";
import { useAuth } from "@/context/AuthContext";
import { useScene } from "@/context/SceneContext";

interface StreakDisplayProps {
  /** Compact mode for header/nav display */
  compact?: boolean;
  /** Show detailed breakdown on click */
  detailed?: boolean;
  /** Custom className */
  className?: string;
}

interface StreakDay {
  date: string;
  day: number;
  isActive: boolean;
  isToday: boolean;
  isFuture: boolean;
  hasReward: boolean;
  reward?: { nectar: number; multiplier: number };
}

/**
 * Calculate streak days for visualization
 */
function calculateStreakDays(streak: number, lastLoginDate: string | null): StreakDay[] {
  const days: StreakDay[] = [];
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  // Show last 7 days including today
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    const isToday = dateStr === todayStr;
    const isFuture = date > today;
    const dayNum = streak - (isToday ? 0 : (today.getDate() - date.getDate()));

    days.push({
      date: dateStr,
      day: dayNum,
      isActive: dayNum > 0 && dayNum <= streak && !isFuture,
      isToday,
      isFuture,
      hasReward: dayNum > 0 && dayNum <= streak && [1, 3, 7, 14, 30].includes(dayNum),
      reward: dayNum > 0 && [1, 3, 7, 14, 30].includes(dayNum)
        ? calculateStreakReward(dayNum)
        : undefined,
    });
  }

  return days;
}

function calculateStreakReward(streak: number): { nectar: number; multiplier: number } {
  if (streak >= 30) return { nectar: 500, multiplier: 3 };
  if (streak >= 14) return { nectar: 200, multiplier: 2.5 };
  if (streak >= 7) return { nectar: 100, multiplier: 2 };
  if (streak >= 3) return { nectar: 50, multiplier: 1.5 };
  return { nectar: 25, multiplier: 1 };
}

/**
 * StreakDisplay - Visual streak calendar with rewards
 */
export const StreakDisplay: React.FC<StreakDisplayProps> = ({
  compact = false,
  detailed = true,
  className = "",
}) => {
  const { userData } = useAuth();
  const sessionState = useSessionState();
  const { performanceTier } = useScene();
  const disableAnimations = performanceTier === "static";

  const [showDetail, setShowDetail] = useState(false);
  const streakDays = calculateStreakDays(sessionState.dailyStreak, sessionState.lastLoginDate);

  // Milestone rewards
  const milestones = [1, 3, 7, 14, 30];
  const nextMilestone = milestones.find(m => m > sessionState.dailyStreak);
  const progressToNext = nextMilestone
    ? (sessionState.dailyStreak / nextMilestone) * 100
    : 100;

  if (!userData || sessionState.dailyStreak === 0) {
    if (compact) return null;
    return (
      <div className={`rounded-xl border border-surface bg-panel/50 p-4 transition-all ${className}`}>
        <div className="flex items-center justify-center gap-3 text-text-muted">
          <span className="text-2xl">🔥</span>
          <div className="text-center">
            <div className="font-semibold text-text-main">Start Your Streak</div>
            <div className="text-sm">Play today to begin your daily streak</div>
          </div>
        </div>
      </div>
    );
  }

  const renderCompact = () => (
    <div className="flex items-center gap-2">
      <span className="text-xl animate-pulse-gentle">🔥</span>
      <span className="font-black text-accent text-lg">{sessionState.dailyStreak}</span>
      <span className="text-xs uppercase tracking-wider text-text-muted">Day Streak</span>
      {sessionState.streakReward && (
        <span className="ml-2 px-2 py-0.5 rounded-full bg-accent/20 text-accent text-[10px] font-bold">
          +{sessionState.streakReward.nectar} 🍯
        </span>
      )}
    </div>
  );

  const renderDetailed = () => (
    <div className={`space-y-4 ${className}`}>
      {/* Main streak display */}
      <div className="relative rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 to-accent/5 p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl animate-pulse-gentle">🔥</span>
              <div>
                <div className="text-4xl sm:text-5xl font-black text-text-main">
                  {sessionState.dailyStreak}
                </div>
                <div className="text-sm uppercase tracking-wider text-text-muted">Day Streak</div>
              </div>
            </div>

            {/* Streak multiplier */}
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/20 text-primary text-sm font-bold">
                <span>⚡</span>
                <span>{sessionState.dailyStreak >= 30 ? "3x" : sessionState.dailyStreak >= 14 ? "2.5x" : sessionState.dailyStreak >= 7 ? "2x" : sessionState.dailyStreak >= 3 ? "1.5x" : "1x"}</span>
                <span className="text-xs">Multiplier</span>
              </div>

              {sessionState.isNewDay && sessionState.streakReward && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/20 text-accent text-sm font-bold animate-pulse">
                  <span>🍯</span>
                  <span>+{sessionState.streakReward.nectar} Nectar</span>
                </div>
              )}
            </div>
          </div>

          {/* Progress to next milestone */}
          {nextMilestone && (
            <div className="text-right min-w-[120px]">
              <div className="text-xs text-text-muted mb-1">Next Milestone</div>
              <div className="text-xl font-black text-accent">Day {nextMilestone}</div>
              <div className="w-full h-2 bg-slate-800/50 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
                  style={{ width: `${progressToNext}%` }}
                />
              </div>
              <div className="text-[10px] text-text-muted/60 mt-1">
                {Math.round(progressToNext)}% to {nextMilestone}-day reward
              </div>
            </div>
          )}
        </div>

        {/* Streak calendar */}
        {detailed && (
          <div className="mt-6 pt-6 border-t border-accent/20">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-text-main">This Week</span>
              <button
                onClick={() => setShowDetail(!showDetail)}
                className="text-xs text-text-muted hover:text-primary transition-colors flex items-center gap-1"
              >
                {showDetail ? "Hide Details" : "Show Rewards"} {" "}
                <span className="text-base">{showDetail ? "▲" : "▼"}</span>
              </button>
            </div>

            <div className="flex items-center justify-center gap-2">
              {streakDays.map((day, idx) => (
                <div
                  key={day.date}
                  className={`relative flex flex-col items-center gap-1 transition-all duration-300 ${
                    disableAnimations ? "" : "hover:scale-110"
                  }`}
                  style={{
                    animation: disableAnimations
                      ? "none"
                      : `fadeInUp 0.3s ease-out ${idx * 50}ms forwards`,
                    opacity: disableAnimations ? 1 : 0,
                  }}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold transition-all ${
                      day.isActive
                        ? "bg-gradient-to-br from-accent to-primary text-app shadow-lg shadow-accent/30"
                        : day.isFuture
                        ? "bg-slate-800/50 border border-slate-700 text-text-muted/30"
                        : "bg-panel/50 border border-surface text-text-muted/50"
                    }`}
                  >
                    {day.isToday && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent animate-pulse" />
                    )}
                    {day.isActive ? (
                      <span className="text-sm">{day.day}</span>
                    ) : day.isFuture ? (
                      <span className="text-xs text-text-muted/30">{new Date(day.date).getDate()}</span>
                    ) : (
                      <span className="text-xs">{new Date(day.date).getDate()}</span>
                    )}
                  </div>

                  <span className="text-[10px] font-medium capitalize text-text-muted/60">
                    {new Date(day.date).toLocaleDateString("en-US", { weekday: "short" })}
                  </span>

                  {/* Reward tooltip */}
                  {showDetail && day.hasReward && day.reward && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-surface text-white text-xs font-medium whitespace-nowrap shadow-lg z-10 animate-fadeIn">
                      <div className="flex items-center gap-1">
                        <span>🍯</span>
                        <span>+{day.reward.nectar}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span>⚡</span>
                        <span>{day.reward.multiplier}x</span>
                      </div>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Milestone rewards preview */}
      {detailed && showDetail && (
        <div className="rounded-xl border border-surface bg-panel/30 p-4 space-y-3">
          <h4 className="text-sm font-semibold text-text-main flex items-center gap-2">
            <span className="text-lg">🏆</span> Milestone Rewards
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {milestones.map((day) => {
              const reward = calculateStreakReward(day);
              const isReached = sessionState.dailyStreak >= day;
              const isNext = nextMilestone === day;

              return (
                <div
                  key={day}
                  className={`rounded-xl p-3 text-center transition-all ${
                    isReached
                      ? "bg-accent/10 border border-accent/30"
                      : isNext
                      ? "bg-primary/10 border border-primary/30 animate-pulse-gentle"
                      : "bg-slate-900/50 border border-surface"
                  }`}
                >
                  <div className={`text-2xl font-black ${isReached ? "text-accent" : isNext ? "text-primary" : "text-text-muted/50"}`}>
                    {isReached ? "✓" : day}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-text-muted/60 mt-1">
                    {isReached ? "Claimed" : isNext ? "Next" : "Locked"}
                  </div>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-center gap-1 text-xs text-accent font-bold">
                      <span>🍯</span>
                      <span>{reward.nectar}</span>
                    </div>
                    <div className="flex items-center justify-center gap-1 text-xs text-primary font-bold">
                      <span>⚡</span>
                      <span>{reward.multiplier}x</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }

        .animate-pulse-gentle {
          animation: pulseGentle 2s ease-in-out infinite;
        }

        @keyframes pulseGentle {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
        }
      `}</style>
    </div>
  );

  if (compact) {
    return renderCompact();
  }

  return renderDetailed();
};

export default StreakDisplay;
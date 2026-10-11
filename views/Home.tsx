import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useAuth } from "../context/AuthContext";
import { useMultiplayer } from "../context/MultiplayerContext";
import { useToast } from "../context/ToastContext";
import { useScene } from "@/context/SceneContext";
import { useReduceMotion } from "@/hooks/useAccessibility";
import { TutorialOverlay } from "../components/TutorialOverlay";
import { ProfileCompletionOverlay } from "../components/ProfileCompletionOverlay";
import { useSessionState, getSegmentContent } from "../hooks/useSessionState";
import { useHaptics } from "../hooks/useHaptics";
import { useChallenges } from "../hooks/useChallenges";
import { useOnlinePlayerCount } from "../hooks/useOnlinePlayerCount";
import { TierBadge, TierProgressBar } from "../components/tier/TierBadge";
import { ChallengeSummaryBar } from "../components/challenges/ChallengeCard";
import { getTierFromStats, getTierProgress, getNextTierName, type PlayerStats } from "../utils/tierRanking";
import { Avatar, CountUp } from "../components/ui";
import { SceneCanvasLayer } from "../components/scene";
import { getLastPlayedMode } from "../utils/lastPlayedMode";

const Home: React.FC = () => {
  const { user, userData } = useAuth();
  const { joinPublicGame, loading } = useMultiplayer();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [joining, setJoining] = useState(false);

  const lastMode = getLastPlayedMode();

  // Session-aware state
  const sessionState = useSessionState();
  const { vibrate } = useHaptics();
  const segmentContent = getSegmentContent(sessionState.segment);

  // Challenges data for summary bar
  const { completedDailyCount, totalDailyCount, completedWeeklyCount, totalWeeklyCount } = useChallenges(user?.uid || null);

  // Live "in the arena now" count (real public-room presence; auth-gated, so it
  // only subscribes for signed-in players and stays hidden when unknown).
  const { count: livePlayers } = useOnlinePlayerCount(!!user);

  // Motion gating — matches the Play view convention. Static/reduce-motion paths
  // render a still UI (no GSAP pulses, no ping dots), never a broken one.
  const { performanceTier } = useScene();
  const reduceMotion = useReduceMotion();
  const disableAnimations = performanceTier === "static" || reduceMotion;

  // Haptic patterns — memoized so effect deps stay stable across renders
  const lightImpact = useCallback(() => vibrate("light"), [vibrate]);
  const mediumImpact = useCallback(() => vibrate("medium"), [vibrate]);
  const successImpact = useCallback(() => vibrate("success"), [vibrate]);

  // --- GSAP scope + refs. useGSAP() scopes tweens to heroRef and auto-reverts
  // them (clearing the inline styles it set) on unmount / dependency change, so
  // the disableAnimations paths always resolve to the plain CSS-default state.
  const heroRef = useRef<HTMLDivElement>(null);
  const ctaGlowRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Track CTA clicks for haptics
  const handlePrimaryCTA = () => {
    mediumImpact();
    if (segmentContent.primaryCTA.href.startsWith("/play/")) {
      handleQuickPlay();
    } else {
      navigate(segmentContent.primaryCTA.href);
    }
  };

  // Compute tier from user stats
  const playerStats: PlayerStats = useMemo(() => {
    if (!userData) return { wins: 0, corrects: 0, lifetimeNectar: 0, gamesPlayed: sessionState.sessionCount };
    return {
      wins: userData.wins,
      corrects: userData.corrects,
      lifetimeNectar: userData.lifetimeNectar,
      gamesPlayed: sessionState.sessionCount,
    };
  }, [userData, sessionState.sessionCount]);

  const tier = useMemo(() => getTierFromStats(playerStats), [playerStats]);
  const tierProgress = useMemo(() => getTierProgress(playerStats), [playerStats]);
  const nextTierName = useMemo(() => getNextTierName(playerStats), [playerStats]);

  const handleQuickPlay = async () => {
    if (!lastMode || loading || joining) return;
    setJoining(true);
    try {
      await joinPublicGame(lastMode);
      navigate(`/play/${lastMode}`);
    } catch {
      showToast({
        title: "Matchmaking failed",
        message: "Could not find a match. Try the lobby.",
        variant: "error",
      });
    } finally {
      setJoining(false);
    }
  };

  // Show streak reward toast on new day
  useEffect(() => {
    if (sessionState.isNewDay && sessionState.streakReward && userData) {
      const { nectar, multiplier } = sessionState.streakReward;
      showToast({
        title: `🔥 Day ${sessionState.dailyStreak} Streak!`,
        message: `+${nectar} Nectar • ${multiplier}x multiplier active`,
        variant: "success",
        durationMs: 5000,
      });
      successImpact();
    }
  }, [sessionState.isNewDay, sessionState.streakReward, sessionState.dailyStreak, userData, showToast, successImpact]);

  // Show welcome back message as toast on return
  useEffect(() => {
    if (sessionState.welcomeBackMessage && userData && sessionState.daysSinceLastSession > 0) {
      showToast({
        title: "Welcome Back! 🐝",
        message: sessionState.welcomeBackMessage,
        variant: "info",
        durationMs: 6000,
      });
      lightImpact();
    }
  }, [sessionState.welcomeBackMessage, sessionState.daysSinceLastSession, userData, showToast, lightImpact]);

  // Primary CTA "animated glow pulse" — a blurred glow layer behind the button
  // breathes in/out. Renders as a soft static glow when motion is disabled.
  useGSAP(
    () => {
      if (disableAnimations || !ctaGlowRef.current) return;
      gsap.to(ctaGlowRef.current, {
        opacity: 0.95,
        scale: 1.08,
        duration: 1.6,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    },
    { dependencies: [disableAnimations], scope: heroRef },
  );

  // Player card entrance — fade/slide the card in, then stagger the stat tiles.
  useGSAP(
    () => {
      if (disableAnimations || !cardRef.current) return;
      gsap.from(cardRef.current, { opacity: 0, y: 16, duration: 0.4, ease: "power2.out" });
      const stats = gsap.utils.toArray<HTMLElement>("[data-stat]", cardRef.current);
      gsap.from(stats, {
        opacity: 0,
        y: 10,
        duration: 0.35,
        stagger: 0.06,
        delay: 0.1,
        ease: "power2.out",
      });
    },
    { dependencies: [disableAnimations, Boolean(userData)], scope: heroRef },
  );

  // --- Shared, alignment-neutral hero fragments -------------------------
  // These render identically in the logged-out single-column hero and the
  // logged-in two-column layout; the *parent* container decides centered vs.
  // left-aligned (via items-*/text-*), so the markup stays DRY.
  const statusChip = (
    <div className="mb-4 inline-flex items-center gap-2.5 rounded-full border border-[var(--theme-border-strong)] bg-black/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.3em] text-text-muted">
      <span className="relative flex h-2 w-2">
        {!disableAnimations && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
        )}
        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
      </span>
      {segmentContent.badge || "Competitive Spelling Arena"}
    </div>
  );

  const titleBlock = (
    <>
      <h1
        data-display="true"
        className="mb-4 text-5xl font-black leading-none text-text-main md:text-7xl"
      >
        Hive<span className="text-primary">Spell</span>
      </h1>
      {/* Segment-specific headline & subheadline */}
      <div className="mb-6 max-w-2xl">
        <h2 className="mb-2 text-2xl font-bold text-text-main sm:text-3xl">
          {segmentContent.headline}
        </h2>
        <p className="text-lg font-light leading-relaxed text-text-muted">
          {segmentContent.subheadline}
        </p>
      </div>
    </>
  );

  // Primary Action Button, wrapped with an animated glow layer. Rendered in
  // exactly one branch per pass, so ctaGlowRef always binds a single node.
  const primaryCTA = (
    <div className="relative w-full max-w-md">
      <div
        ref={ctaGlowRef}
        aria-hidden="true"
        className="pointer-events-none absolute -inset-1 rounded-full bg-primary/40 opacity-60 blur-xl"
      />
      <button
        onClick={handlePrimaryCTA}
        disabled={joining || loading}
        className="relative w-full whitespace-nowrap rounded-full bg-primary px-10 py-5 text-xl font-black tracking-[0.2em] text-app shadow-lg transition-all hover:scale-[var(--hover-scale)] hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:cursor-wait"
        style={{ boxShadow: "var(--theme-shadow-glow)" }}
      >
        {joining ? "FINDING MATCH..." : segmentContent.primaryCTA.label}
      </button>
    </div>
  );

  return (
    <div
      ref={heroRef}
      className="theme-scene min-h-screen flex flex-col items-center justify-center bg-app p-4 relative overflow-hidden"
    >
      <SceneCanvasLayer />

      {/* Single restrained ambient wash. The animated WebGL scene above is the
          real ambience; this just gives depth (and a graceful backdrop when the
          scene is disabled) without the old "giant gradient blobs" pattern. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute left-1/2 top-[-10%] h-[60vh] w-[60vh] -translate-x-1/2 rounded-full opacity-40 blur-[120px]"
          style={{ backgroundImage: "var(--theme-ambient-glow)" }}
        />
      </div>

      {user && userData ? (
        /* Logged-in: two-column hero at xl — messaging (row 1) and actions
           (row 2) share the left column; the player card fills the right
           column and centers vertically beside them. Below xl the grid
           collapses and the cells stack in source order (messaging, card,
           actions), preserving the original single-column reading order. */
        <div className="theme-panel-shell relative z-10 w-full max-w-4xl rounded-[2rem] border bg-panel/35 p-8 backdrop-blur-xl md:p-14 xl:grid xl:max-w-6xl xl:grid-cols-2 xl:items-start xl:gap-x-14 2xl:max-w-7xl">
          {/* Messaging — col 1 / row 1 */}
          <div className="flex flex-col items-center text-center xl:col-start-1 xl:row-start-1 xl:items-start xl:text-left">
            {statusChip}
            {titleBlock}
          </div>

          {/* Player card — col 2, spanning both rows, vertically centered.
              Identity, prestige tier, and a hierarchical stat strip, unified
              into one card (was a flat row of identical boxes). */}
          <div
            ref={cardRef}
            className="theme-panel-shell mx-auto mt-8 w-full max-w-2xl rounded-2xl border border-[var(--theme-border-strong)] bg-panel/50 p-5 text-left backdrop-blur-sm sm:p-6 xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:mx-0 xl:mt-0 xl:max-w-none xl:self-center"
          >
            {/* Identity row */}
            <div className="flex items-center gap-4">
              <Avatar src={userData.avatarUrl} name={userData.username} size="lg" ring />
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-xl font-black text-text-main sm:text-2xl">
                  {userData.username}
                </h3>
                <div className="mt-0.5 truncate text-sm font-semibold text-accent">
                  {userData.title}
                </div>
              </div>
              {/* Featured prestige tier badge */}
              <TierBadge
                tier={tier}
                size="lg"
                showProgress={false}
                progress={tierProgress}
                nextTierName={nextTierName}
                animate={!disableAnimations}
                className={disableAnimations ? "" : "animate-tier-pulse"}
              />
            </div>

            {/* Progress toward the next tier */}
            <TierProgressBar
              tier={tier}
              progress={tierProgress}
              nextTierName={nextTierName}
              showLabels={true}
              className="mt-4"
            />

            {/* Stat strip */}
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div data-stat className="rounded-xl border border-surface bg-panel/40 px-3 py-3 text-center">
                <div className="text-2xl font-black text-primary">
                  <CountUp value={userData.wins ?? 0} />
                </div>
                <div className="text-[10px] uppercase tracking-wider text-text-muted">Wins</div>
              </div>
              <div data-stat className="rounded-xl border border-surface bg-panel/40 px-3 py-3 text-center">
                <div className="text-2xl font-black text-primary">
                  <CountUp value={userData.corrects ?? 0} format={(n) => Math.round(n).toLocaleString()} />
                </div>
                <div className="text-[10px] uppercase tracking-wider text-text-muted">Corrects</div>
              </div>
              <div data-stat className="rounded-xl border border-accent/40 bg-accent/10 px-3 py-3 text-center">
                <div className="flex items-center justify-center gap-1 text-2xl font-black text-accent">
                  {sessionState.dailyStreak > 0 && <span>🔥</span>}
                  <CountUp value={sessionState.dailyStreak} />
                </div>
                <div className="text-[10px] uppercase tracking-wider text-accent/80">Day Streak</div>
              </div>
              <div data-stat className="rounded-xl border border-primary/40 bg-primary/10 px-3 py-3 text-center">
                <div className="text-2xl font-black text-primary">
                  <CountUp value={Math.max(sessionState.sessionCount, 1)} />
                </div>
                <div className="text-[10px] uppercase tracking-wider text-primary/80">Sessions</div>
              </div>
            </div>

            {/* Challenge summary */}
            <div className="mt-4">
              <ChallengeSummaryBar
                dailyCompleted={completedDailyCount}
                dailyTotal={totalDailyCount}
                weeklyCompleted={completedWeeklyCount}
                weeklyTotal={totalWeeklyCount}
                onClick={() => navigate("/challenges")}
              />
            </div>
          </div>

          {/* Actions — col 1 / row 2 */}
          <div className="mt-10 flex flex-col items-center gap-4 xl:col-start-1 xl:row-start-2 xl:mt-4 xl:items-start">
            {primaryCTA}

            {/* Live player-count ticker (social proof). Only shown when the
                real count is known — never a fabricated number. */}
            {livePlayers !== null && (
              <div className="inline-flex items-center gap-2 rounded-full border border-surface bg-panel/40 px-4 py-1.5 text-xs font-semibold text-text-muted">
                <span className="relative flex h-2 w-2">
                  {!disableAnimations && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  )}
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                {livePlayers > 0 ? (
                  <span>
                    <span className="font-black text-text-main">
                      <CountUp value={livePlayers} />
                    </span>{" "}
                    {livePlayers === 1 ? "speller" : "spellers"} in the arena now
                  </span>
                ) : (
                  <span>
                    Arenas are quiet — <span className="font-bold text-primary">be the first in</span>
                  </span>
                )}
              </div>
            )}

            {/* Secondary action strip: a quick "resume last mode" affordance
                for returning players, plus the section shortcuts. */}
            <div className="mt-2 flex flex-wrap items-center justify-center gap-3 sm:gap-4 xl:justify-start">
              {lastMode && (
                <button
                  onClick={handleQuickPlay}
                  disabled={joining || loading}
                  className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-primary/40 bg-primary/10 px-6 py-3 text-xs font-bold uppercase tracking-wider text-primary transition-all hover:bg-primary/20 hover:scale-105 disabled:opacity-50 disabled:cursor-wait"
                >
                  ↻ Resume {lastMode}
                </button>
              )}
              <button
                onClick={() => navigate("/battle-pass")}
                className="whitespace-nowrap rounded-full border border-surface bg-panel/40 px-6 py-3 text-xs font-bold uppercase tracking-wider text-text-muted transition-all hover:border-primary hover:text-primary hover:bg-primary/10 hover:scale-105"
              >
                👑 Battle Pass
              </button>
              <button
                onClick={() => navigate("/challenges")}
                className="whitespace-nowrap rounded-full border border-surface bg-panel/40 px-6 py-3 text-xs font-bold uppercase tracking-wider text-text-muted transition-all hover:border-primary hover:text-primary hover:bg-primary/10 hover:scale-105"
              >
                📋 Challenges
              </button>
              <button
                onClick={() => navigate("/leaderboards")}
                className="whitespace-nowrap rounded-full border border-surface bg-panel/40 px-6 py-3 text-xs font-bold uppercase tracking-wider text-text-muted transition-all hover:border-primary hover:text-primary hover:bg-primary/10 hover:scale-105"
              >
                🏆 Leaderboards
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Logged-out: single centered marketing hero. */
        <div className="theme-panel-shell relative z-10 w-full max-w-4xl rounded-[2rem] border bg-panel/35 p-8 text-center backdrop-blur-xl md:p-14">
          <div className="flex flex-col items-center">
            {statusChip}
            {titleBlock}
          </div>

          <div className="mt-10 flex flex-col items-center gap-4">{primaryCTA}</div>

          <p className="mt-4 text-xs uppercase tracking-[0.22em] text-text-muted">
            Fast rounds. Tight pressure. Clean wins.
          </p>
        </div>
      )}

      {!user && (
        <div className="absolute bottom-8 text-sm text-text-muted">
          Already have an account?{" "}
          <button
            onClick={() => navigate("/auth")}
            className="ml-1 text-primary hover:underline"
          >
            Log in
          </button>
        </div>
      )}

      {/* Tutorial Overlay for new users */}
      <TutorialOverlay />

      {/* Profile Completion Overlay for new users */}
      <ProfileCompletionOverlay />
    </div>
  );
};

export default Home;

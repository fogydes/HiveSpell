import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getWordBankForLocale } from "../services/gameService";
import { useMultiplayer } from "../context/MultiplayerContext";
import { useToast } from "../context/ToastContext";
import i18n from "../i18n";
import { type LocaleId } from "../data/localization";
import { db } from "../firebase";
import { ref, get, query, orderByChild, equalTo } from "firebase/database";
import { FriendsPanel } from "../components/friends";
import { SceneCanvasLayer } from "../components/scene";
import { useScene } from "@/context/SceneContext";
import { useSettings } from "../context/SettingsContext";
import { useReduceMotion } from "@/hooks/useAccessibility";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

const Lobby: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { themePackage } = useSettings();
  const locale = i18n.language as LocaleId;
  const wordBank = getWordBankForLocale(locale);
  const modes = Object.keys(wordBank);
  const { currentScene, performanceTier } = useScene();
  const reduceMotion = useReduceMotion();
  const disableAnimations = performanceTier === "static" || reduceMotion;
  const gridRef = useRef<HTMLDivElement>(null);

  // Mode cards stagger in on mount. clearProps hands `transform` back to CSS so
  // the existing hover:-translate-y-2 lift keeps working after the intro.
  useGSAP(
    () => {
      if (disableAnimations || !gridRef.current) return;
      gsap.from(Array.from(gridRef.current.children), {
        opacity: 0,
        y: 20,
        duration: 0.4,
        stagger: 0.06,
        ease: "power2.out",
        clearProps: "transform,opacity",
      });
    },
    { scope: gridRef },
  );
  const [joinCode, setJoinCode] = useState("");
  const { createGameRoom, joinGameRoom, joinPublicGame, loading } =
    useMultiplayer();

  const handleStartPublic = async (mode: string) => {
    if (loading) return;
    try {
      await joinPublicGame(mode);
      navigate(`/play/${mode}`);
    } catch (err) {
      console.error("Matchmaking failed:", err);
      showToast({
        title: "Matchmaking failed",
        message: "Failed to join. Please try again.",
        variant: "error",
      });
    }
  };

  const handleCreatePrivate = async (mode: string) => {
    if (loading) return;
    try {
      const roomId = await createGameRoom(
        { difficulty: mode, maxPlayers: 10 },
        "private",
      );
      if (roomId) {
        navigate(`/play/${mode}`);
      }
    } catch (err) {
      console.error("Private creation failed:", err);
      showToast({
        title: "Room creation failed",
        message: "Failed to create private room.",
        variant: "error",
      });
    }
  };

  const handleJoinPrivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim() || loading) return;

    const targetId = joinCode.trim();

    // Validate: room codes/IDs should only contain safe characters
    if (!/^[a-zA-Z0-9_-]+$/.test(targetId)) {
      showToast({
        title: "Invalid code",
        message: "Room codes can only contain letters, numbers, and dashes.",
        variant: "error",
      });
      return;
    }

    try {
      // 1. Try Direct ID Lookup
      let foundRoomId = null;
      let foundDifficulty = "";

      const roomRef = ref(db, `rooms/${targetId}`);
      let snapshot = await get(roomRef);

      if (snapshot.exists()) {
        foundRoomId = targetId;
        foundDifficulty = snapshot.val().settings?.difficulty;
      } else {
        // 2. Try Lookup by "code" property
        const roomsQuery = query(
          ref(db, "rooms"),
          orderByChild("code"),
          equalTo(targetId),
        );
        snapshot = await get(roomsQuery);

        if (snapshot.exists()) {
          const val = snapshot.val();
          const firstKey = Object.keys(val)[0];
          foundRoomId = firstKey;
          foundDifficulty = val[firstKey].settings?.difficulty;
        }
      }

      if (foundRoomId && foundDifficulty) {
        await joinGameRoom(foundRoomId);
        navigate(`/play/${foundDifficulty}`);
      } else {
        showToast({
          title: "Room not found",
          message: "Check the code and try again.",
          variant: "error",
        });
      }
    } catch (err) {
      console.error("Join failed", err);
      showToast({
        title: "Join failed",
        message: "There was an error joining that room.",
        variant: "error",
      });
    }
  };

  // Difficulty ramp derived from the active theme's --primary token so the mode
  // cards adapt when the user switches themes (previously hardcoded cyan→purple
  // hues that ignored the theme system). Difficulty is encoded as border
  // prominence — harder modes get a stronger border — while the title inherits
  // --primary. Text labels (name, word count, hint) carry the actual meaning.
  const getModeColor = (mode: string) => {
    const colors: Record<string, string> = {
      baby: "text-primary border-primary/20 hover:border-primary/40",
      cakewalk: "text-primary border-primary/30 hover:border-primary/50",
      learner: "text-primary border-primary/40 hover:border-primary/60",
      intermediate: "text-primary border-primary/50 hover:border-primary/70",
      heated: "text-primary border-primary/60 hover:border-primary/80",
      genius: "text-primary border-primary/70 hover:border-primary/90",
      omniscient: "text-primary border-primary/80 hover:border-primary",
      polymath: "text-primary border-primary/90 hover:border-primary",
    };
    return colors[mode] || "text-text-main border-surface";
  };

  const getModeHint = (mode: string) => {
    const hints: Record<string, string> = {
      baby: "Common short words",
      cakewalk: "Everyday vocabulary",
      learner: "Standard difficulty",
      intermediate: "Longer words",
      heated: "Challenging words",
      genius: "Advanced vocabulary",
      polymath: "Complex and rare",
      omniscient: "All difficulties mixed",
    };
    return hints[mode] || "";
  };

  return (
    <div className="theme-scene min-h-screen bg-app pt-20 pb-28 sm:pt-24 sm:pb-24">
      <SceneCanvasLayer />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute left-[8%] top-24 h-64 w-64 rounded-full blur-3xl opacity-80"
          style={{ backgroundImage: "var(--theme-ambient-glow)" }}
        />
        <div
          className="absolute bottom-20 right-[10%] h-72 w-72 rounded-full opacity-60 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, color-mix(in srgb, var(--accent) 24%, transparent) 0%, transparent 72%)",
          }}
        />
      </div>

      <div className="relative flex flex-col items-center px-4 sm:px-6">
      {/* Difficulty Selection UI */}
      <div className="theme-panel-shell mb-6 w-full max-w-5xl rounded-[24px] border bg-panel/45 px-4 py-5 text-center backdrop-blur-xl sm:mb-10 sm:rounded-[32px] sm:px-6 sm:py-8">
        <h2
          data-display="true"
          className="mb-2 text-2xl font-extrabold tracking-tight text-text-main sm:text-4xl"
        >
          Select Difficulty
        </h2>
        <p className="mx-auto max-w-2xl text-sm text-text-muted sm:text-base">
          Choose your challenge level to enter the hive.
        </p>
      </div>

      <div ref={gridRef} className="grid w-full max-w-6xl grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
        {modes.map((mode) => (
          <div
            key={mode}
            className={`theme-panel-shell border-2 rounded-[22px] bg-panel/70 p-4 flex flex-col justify-between transition-all duration-300 hover:-translate-y-2 group sm:rounded-2xl sm:p-6 ${getModeColor(mode)}`}
            style={{ boxShadow: themePackage.scene.panelShadow }}
          >
            <div className="mb-4 sm:mb-6">
              <h3 className="text-xl font-black capitalize mb-1 tracking-wide sm:text-2xl">
                {mode}
              </h3>
              <p className="text-text-muted text-xs">
                {wordBank[mode].length} words · {getModeHint(mode)}
              </p>
            </div>

            <div className="space-y-3">
              <button
                disabled={loading}
                onClick={() => handleStartPublic(mode)}
                className="theme-surface-shell w-full rounded-lg py-2.5 text-sm font-bold uppercase tracking-wider text-text-main transition-colors group-hover:bg-text-main group-hover:text-app disabled:cursor-wait disabled:opacity-50 sm:py-3"
              >
                {loading ? "Connecting..." : "Public Match"}
              </button>
              <button
                disabled={loading}
                onClick={() => handleCreatePrivate(mode)}
                className="w-full py-2 bg-transparent border border-surface text-text-muted hover:text-text-main hover:border-text-main rounded-lg text-xs font-bold transition-colors uppercase disabled:opacity-50 disabled:cursor-wait"
              >
                Create Private
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex w-full max-w-5xl justify-center sm:mt-10">
        <form
          onSubmit={handleJoinPrivate}
          className="theme-panel-shell flex w-full max-w-md items-center gap-2 rounded-xl border border-surface bg-panel/80 p-2 transition-colors focus-within:border-primary sm:max-w-lg sm:gap-3"
        >
          <div className="pl-3 text-text-muted">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              />
            </svg>
          </div>
          <input
            type="text"
            placeholder="ENTER PRIVATE CODE"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            className="flex-1 bg-transparent text-text-main placeholder-text-muted focus:outline-none font-mono text-base tracking-[0.24em] uppercase sm:text-lg sm:tracking-widest"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-primary hover:bg-primary-dim text-app px-5 py-2 rounded-lg font-bold transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-wait sm:px-6"
          >
            {loading ? "..." : "JOIN"}
          </button>
        </form>
      </div>

      {/* Friends Panel */}
      <div className="mt-10 w-full max-w-5xl">
        <FriendsPanel
          variant="full"
          onInviteToGame={(friendId) => console.log("Invite to game:", friendId)}
          onSpectate={(friendId, roomId) => navigate(`/watch/${roomId}`)}
          onJoin={(friendId, roomId) => navigate(`/play/lobby?room=${roomId}`)}
        />
      </div>
      </div>
    </div>
  );
};
export default Lobby;

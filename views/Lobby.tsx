import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { wordBank } from "../services/gameService";
import { useMultiplayer } from "../context/MultiplayerContext";
import { useToast } from "../context/ToastContext";
import { useSettings } from "../context/SettingsContext";
import { db } from "../firebase";
import { ref, get, query, orderByChild, equalTo } from "firebase/database";

const Lobby: React.FC = () => {
  const modes = Object.keys(wordBank);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { themePackage } = useSettings();
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

  const getModeColor = (mode: string) => {
    const colors: any = {
      baby: "text-cyan-400 border-cyan-500/30 hover:border-cyan-400",
      cakewalk: "text-teal-400 border-teal-500/30 hover:border-teal-400",
      learner:
        "text-emerald-400 border-emerald-500/30 hover:border-emerald-400",
      intermediate: "text-green-400 border-green-500/30 hover:border-green-400",
      heated: "text-yellow-400 border-yellow-500/30 hover:border-yellow-400",
      genius: "text-orange-400 border-orange-500/30 hover:border-orange-400",
      omniscient: "text-red-500 border-red-500/30 hover:border-red-500",
      polymath: "text-purple-400 border-purple-500/30 hover:border-purple-400",
    };
    return colors[mode] || "text-white border-slate-700";
  };

  return (
    <div className="theme-scene min-h-screen bg-app pt-24 pb-24">
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

      <div className="relative flex flex-col items-center px-6">
      {/* Difficulty Selection UI */}
      <div className="theme-panel-shell mb-10 w-full max-w-6xl rounded-[32px] border bg-panel/45 px-6 py-8 text-center backdrop-blur-xl">
        <h2
          data-display="true"
          className="mb-2 text-4xl font-extrabold tracking-tight text-text-main"
        >
          Select Difficulty
        </h2>
        <p className="text-text-muted">
          Choose your challenge level to enter the hive.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full max-w-6xl pb-20">
        {modes.map((mode) => (
          <div
            key={mode}
            className={`theme-panel-shell border-2 rounded-2xl bg-panel/70 p-6 flex flex-col justify-between transition-all duration-300 hover:-translate-y-2 group ${getModeColor(mode)}`}
            style={{ boxShadow: themePackage.scene.panelShadow }}
          >
            <div className="mb-6">
              <h3 className="text-2xl font-black capitalize mb-2 tracking-wide">
                {mode}
              </h3>
              <p className="text-text-muted text-sm font-medium">
                {wordBank[mode].length} Words Available
              </p>
            </div>

            <div className="space-y-3">
              <button
                disabled={loading}
                onClick={() => handleStartPublic(mode)}
                className="theme-surface-shell w-full rounded-lg py-3 text-sm font-bold uppercase tracking-wider text-text-main transition-colors group-hover:bg-text-main group-hover:text-app disabled:cursor-wait disabled:opacity-50"
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

      <div className="fixed bottom-0 left-0 z-40 flex w-full justify-center border-t border-surface bg-panel/70 p-6 backdrop-blur-xl">
        <form
          onSubmit={handleJoinPrivate}
          className="theme-panel-shell flex w-full max-w-lg items-center gap-3 rounded-xl border border-surface bg-panel/80 p-2 transition-colors focus-within:border-primary"
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
            className="flex-1 bg-transparent text-text-main placeholder-text-muted focus:outline-none font-mono text-lg tracking-widest uppercase"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-primary hover:bg-primary-dim text-app px-6 py-2 rounded-lg font-bold transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-wait"
          >
            {loading ? "..." : "JOIN"}
          </button>
        </form>
      </div>
      </div>
    </div>
  );
};
export default Lobby;

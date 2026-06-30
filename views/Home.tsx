import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useMultiplayer } from "../context/MultiplayerContext";
import { useToast } from "../context/ToastContext";

const LAST_MODE_KEY = "hive_last_mode";

/** Call this from Play.tsx when a game starts to record the last difficulty. */
export const saveLastPlayedMode = (mode: string) => {
  localStorage.setItem(LAST_MODE_KEY, mode);
};

const Home: React.FC = () => {
  const { user, userData } = useAuth();
  const { joinPublicGame, loading } = useMultiplayer();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [joining, setJoining] = useState(false);

  const lastMode = localStorage.getItem(LAST_MODE_KEY);

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

  return (
    <div className="theme-scene min-h-screen flex flex-col items-center justify-center bg-app p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div
          className="absolute -top-12 left-[10%] h-80 w-80 rounded-full blur-3xl opacity-80"
          style={{ backgroundImage: "var(--theme-ambient-glow)" }}
        ></div>
        <div
          className="absolute bottom-[-12%] right-[8%] h-72 w-72 rounded-full blur-3xl opacity-65"
          style={{
            background:
              "radial-gradient(circle, color-mix(in srgb, var(--accent) 26%, transparent) 0%, transparent 72%)",
          }}
        ></div>
      </div>

      <div className="theme-panel-shell relative z-10 w-full max-w-4xl rounded-[2rem] border bg-panel/35 p-8 text-center backdrop-blur-xl md:p-14">
        <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--theme-border-strong)] bg-black/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.3em] text-text-muted">
          Competitive Spelling Arena
        </div>

        <div className="flex flex-col items-center">
          <h1
            data-display="true"
            className="mb-4 text-5xl font-black leading-none text-text-main md:text-7xl"
          >
            Hive<span className="text-primary">Spell</span>
          </h1>

          <p className="max-w-2xl text-base font-light leading-relaxed text-text-muted md:text-lg">
            Hear the word. Spell it fast. Outlast everyone.
          </p>
        </div>

        {/* Quick stats for logged-in users */}
        {user && userData && (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <div className="rounded-xl border border-surface bg-panel/50 px-4 py-3 text-center">
              <div className="text-2xl font-black text-primary">{userData.wins}</div>
              <div className="text-[10px] uppercase tracking-wider text-text-muted">Wins</div>
            </div>
            <div className="rounded-xl border border-surface bg-panel/50 px-4 py-3 text-center">
              <div className="text-2xl font-black text-primary">{userData.corrects?.toLocaleString()}</div>
              <div className="text-[10px] uppercase tracking-wider text-text-muted">Corrects</div>
            </div>
            <div className="rounded-xl border border-surface bg-panel/50 px-4 py-3 text-center">
              <div className="text-2xl font-black text-accent">{userData.title}</div>
              <div className="text-[10px] uppercase tracking-wider text-text-muted">Title</div>
            </div>
          </div>
        )}

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
          {user && lastMode ? (
            <div className="flex flex-col items-center">
              <button
                onClick={handleQuickPlay}
                disabled={joining || loading}
                className="rounded-full bg-primary px-10 py-4 text-lg font-black tracking-[0.18em] text-app transition-all hover:scale-[var(--hover-scale)] disabled:opacity-50 disabled:cursor-wait"
                style={{ boxShadow: "var(--theme-shadow-glow)" }}
              >
                {joining ? "FINDING MATCH..." : "PLAY NOW"}
              </button>
              <span className="mt-2 text-xs text-text-muted capitalize">
                Recently played {lastMode}
              </span>
            </div>
          ) : (
            <button
              onClick={() => navigate(user ? "/lobby" : "/auth")}
              className="rounded-full bg-primary px-10 py-4 text-lg font-black tracking-[0.18em] text-app transition-all hover:scale-[var(--hover-scale)]"
              style={{ boxShadow: "var(--theme-shadow-glow)" }}
            >
              {user ? "PLAY NOW" : "GET STARTED"}
            </button>
          )}
          {user && (
            <button
              onClick={() => navigate("/lobby")}
              className="rounded-full border border-surface px-8 py-4 text-sm font-bold uppercase tracking-wider text-text-muted transition-colors hover:border-primary hover:text-primary"
            >
              Browse Lobby
            </button>
          )}
        </div>

        {!user && (
          <p className="mt-4 text-xs uppercase tracking-[0.22em] text-text-muted">
            Fast rounds. Tight pressure. Clean wins.
          </p>
        )}
      </div>

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
    </div>
  );
};

export default Home;

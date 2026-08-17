import React from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

export type ArenaStatusVariant = "connecting" | "waiting" | "error";

const TITLE_KEYS: Record<ArenaStatusVariant, string> = {
  connecting: "common.connecting",
  waiting: "play.preparingArena",
  error: "play.startFailed",
};

const BODY_KEYS: Record<ArenaStatusVariant, string | null> = {
  connecting: null,
  waiting: "play.preparingArenaHint",
  error: "play.startFailedHint",
};

interface ArenaStatusScreenProps {
  variant: ArenaStatusVariant;
  /** Players currently in the room, shown while the arena is being prepared. */
  playerCount?: number;
  /** Raw failure detail. Surfaced in dev builds only, mirroring ErrorBoundary. */
  errorDetail?: string | null;
  /** Retry the start attempt. Omitted for clients that cannot drive the room. */
  onRetry?: () => void;
  /** Escape hatch so a stalled or failed arena never traps the player. */
  onReturnToLobby?: () => void;
}

/**
 * Full-screen status panel for the arena's pre-gameplay states.
 *
 * The arena can only render gameplay once the server has moved the room into
 * `playing`. Before that the player is either connecting, waiting for the room
 * to be started, or looking at a failed start. Each of those needs its own
 * message and, crucially, a way back to the lobby.
 */
const ArenaStatusScreen: React.FC<ArenaStatusScreenProps> = ({
  variant,
  playerCount,
  errorDetail,
  onRetry,
  onReturnToLobby,
}) => {
  const { t } = useTranslation();
  const isError = variant === "error";
  const bodyKey = BODY_KEYS[variant];

  return (
    <div className="min-h-screen flex items-center justify-center bg-app p-6">
      <div
        aria-live="polite"
        className="max-w-md w-full text-center rounded-2xl border border-surface bg-panel p-8 shadow-xl"
        role="status"
      >
        {isError ? (
          <div className="text-5xl mb-4">🐝</div>
        ) : (
          <Loader2 className="w-10 h-10 mx-auto mb-4 animate-spin text-primary" />
        )}

        <h1 className="text-xl font-bold text-text-main mb-2">
          {t(TITLE_KEYS[variant])}
        </h1>

        {bodyKey && (
          <p className="text-sm text-text-muted leading-relaxed">{t(bodyKey)}</p>
        )}

        {variant === "waiting" && typeof playerCount === "number" && (
          <p className="mt-3 text-sm font-bold text-primary">
            {t("play.playersReady", { total: playerCount })}
          </p>
        )}

        {import.meta.env.DEV && isError && errorDetail && (
          <pre className="mt-6 max-h-32 overflow-auto rounded-lg bg-black/30 p-3 text-left text-xs text-red-300 border border-red-500/20">
            {errorDetail}
          </pre>
        )}

        {(onRetry || onReturnToLobby) && (
          <div className="mt-6 flex gap-3 justify-center">
            {onRetry && (
              <button
                className="px-5 py-2.5 rounded-xl bg-primary/20 text-primary font-bold text-sm border border-primary/30 hover:bg-primary/30 transition-colors"
                onClick={onRetry}
                type="button"
              >
                {t("common.retry")}
              </button>
            )}
            {onReturnToLobby && (
              <button
                className="px-5 py-2.5 rounded-xl bg-surface/50 text-text-muted font-bold text-sm border border-surface hover:text-text-main transition-colors"
                onClick={onReturnToLobby}
                type="button"
              >
                {t("play.returnToLobby")}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ArenaStatusScreen;

import React from "react";
import type { Room, Player } from "../../types/multiplayer";
import IntermissionStatus from "./IntermissionStatus";

interface GameplayStageProps {
  currentRoom: Room;
  definition: string;
  feedbackMessage?: string;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  inputValue: string;
  intermissionTime: number;
  isInputEnabled: boolean;
  isMyTurn: boolean;
  lastBurstWpm: number;
  myStatus: string;
  onExitArena: () => void;
  onReplayWord: () => void;
  paramMode?: string;
  playersList: Player[];
  status: "playing" | "intermission" | "speaking";
  streak: number;
  syncedInput: string;
  timeLeft: number;
  totalTime: number;
  userId?: string;
}

const GameplayStage: React.FC<GameplayStageProps> = ({
  currentRoom,
  definition,
  feedbackMessage,
  handleInputChange,
  handleSubmit,
  inputRef,
  inputValue,
  intermissionTime,
  isInputEnabled,
  isMyTurn,
  lastBurstWpm,
  myStatus,
  onExitArena,
  onReplayWord,
  paramMode,
  playersList,
  status,
  streak,
  syncedInput,
  timeLeft,
  totalTime,
  userId,
}) => {
  const currentTurnPlayerName =
    playersList.find((player) => player.id === currentRoom?.gameState?.currentTurnPlayerId)
      ?.name || "...";

  return (
    <div className="w-full max-w-xl flex flex-col items-center z-10 transition-all duration-500 p-4 sm:p-8 rounded-3xl border border-transparent relative bg-panel/30">
      <button
        onClick={onExitArena}
        className="hidden lg:block absolute top-4 left-4 p-2 text-red-400 hover:text-red-300 font-bold text-xs uppercase tracking-widest transition-colors border border-transparent hover:border-red-500/30 rounded"
      >
        Exit Arena
      </button>

      <div className="w-full max-w-lg mb-4 sm:mb-8 text-center min-h-[50px] mt-8">
        {status === "playing" ? (
          <p className="text-text-muted text-xs sm:text-sm italic font-serif leading-relaxed px-4 py-2 bg-panel/50 rounded-lg border border-surface">
            "{definition}"
          </p>
        ) : (
          <div className="h-[50px]">
            {status === "speaking" && (
              <div className="text-primary animate-pulse text-sm font-bold tracking-widest">
                LISTENING TO HIVE...
              </div>
            )}
            <IntermissionStatus
              status={currentRoom?.status}
              winnerId={currentRoom?.gameState?.winnerId}
              winnerName={currentRoom?.gameState?.winnerName}
              userId={userId}
              intermissionTime={intermissionTime}
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 mb-4 sm:mb-6">
        <div className="bg-panel/80 px-4 py-1 rounded text-xs font-bold tracking-widest uppercase text-primary border border-surface">
          {streak > 25
            ? "RAMPAGE MODE"
            : currentRoom?.settings?.difficulty || paramMode}
        </div>
      </div>

      <div className="w-full flex justify-between items-end mb-2 px-2 text-text-muted text-[10px] sm:text-xs font-bold tracking-widest">
        <div className="text-center">
          <div
            className={`text-xl sm:text-2xl mb-1 ${streak > 5 ? "text-accent animate-pulse" : "text-text-main"}`}
          >
            {streak} {streak > 5 && "🔥"}
          </div>
          <div>STREAK</div>
        </div>

        <div className="text-center">
          <div className="text-primary text-xl sm:text-2xl mb-1 flex flex-col items-center leading-none">
            <span>{currentRoom?.gameState?.currentPlayerWpm || lastBurstWpm || 0}</span>
          </div>
          <div>WPM</div>
        </div>
      </div>

      <div className="w-full text-center text-primary font-mono text-sm font-bold mb-1">
        {timeLeft.toFixed(1)}s
      </div>

      <div className="w-full h-2 sm:h-3 bg-panel rounded-full overflow-hidden mb-8 relative border border-surface">
        <div
          className={`h-full shadow-[0_0_15px_rgba(var(--primary-rgb),0.6)] ${timeLeft < 3 ? "bg-red-500" : "bg-primary"}`}
          style={{ width: `${Math.min(100, (timeLeft / totalTime) * 100)}%` }}
        ></div>
      </div>

      <div className="mb-8 relative min-h-[100px] flex items-center justify-center w-full">
        {status !== "intermission" ? (
          status === "speaking" ? (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary-dim border-2 border-primary flex items-center justify-center animate-spin-slow">
              <span className="text-2xl">🔊</span>
            </div>
          ) : (
            <button
              onClick={onReplayWord}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary-dim/10 hover:bg-primary-dim/20 border border-primary-dim flex items-center justify-center transition-all group cursor-pointer active:scale-95 animate-pulse-slow"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 sm:h-10 sm:w-10 text-primary group-hover:scale-110 transition-transform"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                />
              </svg>
            </button>
          )
        ) : (
          <div className="flex flex-col items-center bg-panel/90 p-4 rounded-xl border border-surface shadow-xl z-20 w-full max-w-sm">
            <div className="text-text-muted text-sm mb-4">
              Next word in{" "}
              <span className="text-text-main font-bold">{intermissionTime}</span>
              ...
            </div>
            {!feedbackMessage && <div className="text-3xl animate-bounce">⏳</div>}
          </div>
        )}
      </div>

      <div className="w-full max-w-lg mb-8 sm:mb-12">
        <div className="text-center text-text-muted text-[10px] font-bold tracking-[0.2em] mb-2 sm:mb-4">
          {isMyTurn ? "TYPE THE WORD YOU HEAR" : `WATCHING ${currentTurnPlayerName}`}
        </div>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            id="spelling-input"
            type="text"
            autoComplete="off"
            autoFocus
            value={isMyTurn ? inputValue : syncedInput}
            onChange={handleInputChange}
            disabled={
              !isMyTurn ||
              !isInputEnabled ||
              status !== "playing" ||
              myStatus === "eliminated"
            }
            placeholder={
              myStatus === "eliminated"
                ? "ELIMINATED"
                : !isMyTurn
                  ? "Watching..."
                  : "Type word..."
            }
            className={`w-full bg-transparent border-b-2 ${isMyTurn ? "border-primary" : "border-surface"} text-center text-3xl sm:text-5xl font-bold ${isMyTurn ? "text-text-main" : "text-text-muted"} outline-none py-2 sm:py-4 placeholder:text-surface transition-colors disabled:opacity-70 disabled:cursor-not-allowed`}
          />
        </form>
      </div>

      {currentRoom.type === "private" && (
        <div className="absolute top-20 right-6 flex flex-col items-end gap-2">
          <span className="text-[10px] text-slate-600">CODE: {currentRoom.code}</span>
        </div>
      )}
    </div>
  );
};

export default GameplayStage;

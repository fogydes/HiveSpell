import React from "react";
import type { Player } from "../../types/multiplayer";

interface PlayerListPanelProps {
  className: string;
  currentTurnPlayerId?: string;
  players: Player[];
  userId?: string;
  onSelectProfile: (userId: string) => void;
}

const PlayerListPanel: React.FC<PlayerListPanelProps> = ({
  className,
  currentTurnPlayerId,
  players,
  userId,
  onSelectProfile,
}) => {
  const visiblePlayers = players.filter(
    (player) => player.status !== "disconnected",
  );

  return (
    <div className={className}>
      <div className="p-3 border-b border-slate-700 bg-black/20 font-bold text-sm flex justify-between">
        <span>People ({visiblePlayers.length})</span>
      </div>
      <div className="grid grid-cols-[1fr_50px_40px] px-3 py-2 text-[10px] text-text-muted font-bold uppercase border-b border-surface/50">
        <span>Name</span>
        <span className="text-center">Corrects</span>
        <span className="text-right">Wins</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {visiblePlayers.map((player) => (
          <button
            key={player.id}
            onClick={() => onSelectProfile(player.id)}
            className={`grid grid-cols-[1fr_50px_40px] px-3 py-3 text-xs items-center transition-colors border-b border-surface/50 w-full text-left cursor-pointer ${player.id === userId ? "bg-primary-dim" : "hover:bg-white/5"} ${player.id === currentTurnPlayerId ? "ring-1 ring-primary" : ""}`}
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <div
                className={`w-2 h-2 rounded-full ${player.status === "alive" || player.status === "connected" ? "bg-primary" : "bg-red-500"}`}
              ></div>
              <span
                className={`truncate font-medium ${player.id === userId ? "text-primary" : "text-text-main"} ${player.status === "eliminated" ? "line-through text-text-muted" : ""}`}
              >
                {player.name}
              </span>
            </div>
            <div className="text-center font-mono text-primary">
              {player.corrects || 0}
            </div>
            <div className="text-right font-mono text-accent">
              {player.wins || 0}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default PlayerListPanel;

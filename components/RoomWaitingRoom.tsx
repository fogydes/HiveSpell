import React from 'react';
import { useMultiplayer } from '../context/MultiplayerContext';
import { useAuth } from '../context/AuthContext';

const RoomWaitingRoom: React.FC = () => {
  const { currentRoom, players, loading } = useMultiplayer();
  const { user } = useAuth();

  if (!currentRoom) return null;

  const isHost = currentRoom.hostId === user?.uid;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-4">
      <div className="bg-slate-800 p-8 rounded-2xl border-2 border-slate-700 shadow-2xl max-w-2xl w-full text-center">
        <h2 className="text-3xl font-extrabold mb-2 tracking-tight">Room Code</h2>
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-600 mb-8">
          <span className="text-5xl font-mono tracking-[0.5em] text-emerald-400 font-bold">
            {currentRoom.code}
          </span>
        </div>

        <div className="mb-8">
          <h3 className="text-xl font-bold mb-4 text-slate-400 uppercase tracking-wider">
            Players ({players.length}/{currentRoom.settings.maxPlayers})
          </h3>
          <div className="space-y-2">
            {players.map((player) => (
              <div 
                key={player.id}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  player.id === user?.uid ? 'bg-emerald-500/10 border border-emerald-500/50' : 'bg-slate-700/50 border border-slate-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center font-bold text-sm">
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-bold tracking-wide">
                    {player.name} {player.id === user?.uid && '(You)'}
                  </span>
                </div>
                {player.isHost && (
                  <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded font-bold uppercase tracking-wider border border-yellow-500/30">
                    Host
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {isHost ? (
          <button 
            disabled={loading}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-xl font-black text-xl uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
            onClick={() => alert('Start Game Logic Implementation Next Phase')}
          >
            Start Game
          </button>
        ) : (
          <div className="p-4 bg-slate-700/30 rounded-xl border border-slate-600 animate-pulse">
            <p className="font-bold text-slate-400 tracking-wide">Waiting for host to start...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomWaitingRoom;

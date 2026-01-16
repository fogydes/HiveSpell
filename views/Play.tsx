import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useMultiplayer } from '../context/MultiplayerContext';
import { wordBank, speak, checkAnswer, fetchDefinition, MODE_ORDER } from '../services/gameService';
import { MatchState } from '../services/multiplayerService';

// ... (Keep existing interfaces not replaced by context)

const Play: React.FC = () => {
  const { mode: paramMode } = useParams<{ mode: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { ttsVolume, playTypingSound } = useSettings();
  const { currentRoom, players, loading } = useMultiplayer();

  // Redirect if no room context (user refreshed page or direct link without join)
  useEffect(() => {
    if (!loading && !currentRoom) {
      console.warn("No Room Context found, redirecting to lobby...");
      navigate('/lobby');
    }
  }, [currentRoom, loading, navigate]);

  // Map Context State to Local Game State
  // TODO: Full refactor of Play.tsx to natively use Context instead of internal MatchState
  // For now, we will just display a basic HUD if connected.

  if (!currentRoom) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-4">
       <h1 className="text-3xl font-bold mb-4">Game Room: {currentRoom.type.toUpperCase()}</h1>
       {currentRoom.type === 'private' && (
           <div className="mb-4 bg-slate-800 p-2 rounded">
               Code: <span className="font-mono text-emerald-400">{currentRoom.code}</span>
           </div>
       )}
       <div className="mb-8 w-full max-w-md">
           <h2 className="text-xl mb-2 text-slate-400">Players</h2>
           <ul className="space-y-2">
               {players.map(p => (
                   <li key={p.id} className="bg-slate-800 p-2 rounded flex justify-between">
                       <span>{p.name} {p.isHost && '(Host)'}</span>
                       <span className={p.status === 'connected' ? 'text-emerald-400' : 'text-slate-500'}>{p.status}</span>
                   </li>
               ))}
           </ul>
       </div>
       
       <div className="animate-pulse text-slate-500">
           Gameplay synchronization logic is coming in the next update...
       </div>
       
       <button onClick={() => navigate('/lobby')} className="mt-8 text-red-400 hover:text-red-300">
           Exit Room
       </button>
    </div>
  );
};

export default Play;
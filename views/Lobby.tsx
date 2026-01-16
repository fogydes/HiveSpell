import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { wordBank } from '../services/gameService';
import { useAuth } from '../context/AuthContext';
// import { findPublicMatch, createPrivateMatch, joinPrivateMatchByCode } from '../services/multiplayerService';

const Lobby: React.FC = () => {
  const modes = Object.keys(wordBank);
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState('');
  // const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();

  const handleStartPublic = async (mode: string) => {
    // if (!user || isProcessing) return;
    // setIsProcessing(true);
    // try {
    //   const matchId = await findPublicMatch(user, mode);
    //   navigate(`/play/${mode}`, { state: { type: 'public', role: 'player', matchId } });
    // } catch (err) {
    //   console.error("Matchmaking failed:", err);
    //   alert("Failed to join public match. Please try again.");
    // } finally {
    //   setIsProcessing(false);
    // }
    console.log("Public match requested for", mode);
    alert("Multiplayer is currently being updated. Please check back later.");
  };

  const handleCreatePrivate = async (mode: string) => {
    // if (!user || isProcessing) return;
    // setIsProcessing(true);
    // try {
    //   const { matchId, code } = await createPrivateMatch(user, mode);
    //   navigate(`/play/${mode}`, { state: { type: 'private', role: 'host', code, matchId } });
    // } catch (err) {
    //   console.error("Private creation failed:", err);
    //   alert("Failed to create private room.");
    // } finally {
    //   setIsProcessing(false);
    // }
    console.log("Private match requested for", mode);
    alert("Multiplayer is currently being updated. Please check back later.");
  };

  const handleJoinPrivate = async (e: React.FormEvent) => {
    e.preventDefault();
    // if (!joinCode.trim() || !user || isProcessing) return;
    
    // setIsProcessing(true);
    // try {
    //   const matchId = await joinPrivateMatchByCode(user, joinCode.trim().toUpperCase());
    //   /** Join private match */
    //   // We'll pass 'polymath' as a placeholder or handle it in Play.tsx
    //   navigate(`/play/polymath`, { state: { type: 'private', role: 'player', code: joinCode, matchId } });
    // } catch (err) {
    //   alert("Invalid Code or Room Expired.");
    // } finally {
    //   setIsProcessing(false);
    // }
    console.log("Join private requested with code", joinCode);
    alert("Multiplayer is currently being updated. Please check back later.");
  };

  const getModeColor = (mode: string) => {
     const colors: any = {
       baby: 'text-cyan-400 border-cyan-500/30 hover:border-cyan-400',
       cakewalk: 'text-teal-400 border-teal-500/30 hover:border-teal-400',
       learner: 'text-emerald-400 border-emerald-500/30 hover:border-emerald-400',
       intermediate: 'text-green-400 border-green-500/30 hover:border-green-400',
       heated: 'text-yellow-400 border-yellow-500/30 hover:border-yellow-400',
       genius: 'text-orange-400 border-orange-500/30 hover:border-orange-400',
       omniscient: 'text-red-500 border-red-500/30 hover:border-red-500',
       polymath: 'text-purple-400 border-purple-500/30 hover:border-purple-400'
     };
     return colors[mode] || 'text-white border-slate-700';
  };

  return (
    <div className="min-h-screen pt-24 p-6 flex flex-col items-center bg-slate-900 pb-24">
      
      {/* Difficulty Selection UI */}
      <div className="w-full max-w-6xl text-center mb-10">
        <h2 className="text-4xl font-extrabold text-white mb-2 tracking-tight">Select Difficulty</h2>
        <p className="text-slate-400">Choose your challenge level to enter the hive.</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full max-w-6xl pb-20">
        {modes.map(mode => (
          <div 
            key={mode} 
            className={`bg-slate-800 border-2 rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-black/50 group ${getModeColor(mode)}`}
          >
            <div className="mb-6">
              <h3 className="text-2xl font-black capitalize mb-2 tracking-wide">{mode}</h3>
              <p className="text-slate-400 text-sm font-medium">
                {wordBank[mode].length} Words Available
              </p>
            </div>
            
            <div className="space-y-3">
              <button 
                  // disabled={isProcessing}
                  onClick={() => handleStartPublic(mode)}
                  className="w-full py-3 bg-slate-700 group-hover:bg-white group-hover:text-slate-900 text-white rounded-lg font-bold text-sm tracking-wider transition-colors uppercase disabled:opacity-50 disabled:cursor-wait"
              >
                {/* {isProcessing ? 'Connecting...' : 'Public Match'} */}
                Public Match
              </button>
              <button 
                  // disabled={isProcessing}
                  onClick={() => handleCreatePrivate(mode)}
                  className="w-full py-2 bg-transparent border border-slate-600 text-slate-400 hover:text-white hover:border-white rounded-lg text-xs font-bold transition-colors uppercase disabled:opacity-50 disabled:cursor-wait"
              >
                Create Private
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 w-full bg-slate-900/80 backdrop-blur-xl border-t border-slate-700 p-6 flex justify-center z-40">
        <form onSubmit={handleJoinPrivate} className="flex items-center gap-3 w-full max-w-lg bg-slate-800 p-2 rounded-xl border border-slate-600 focus-within:border-emerald-500 transition-colors">
          <div className="pl-3 text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <input 
            type="text" 
            placeholder="ENTER PRIVATE CODE" 
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            className="flex-1 bg-transparent text-white placeholder-slate-500 focus:outline-none font-mono text-lg tracking-widest uppercase"
          />
          <button 
            type="submit"
            // disabled={isProcessing}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 px-6 py-2 rounded-lg font-bold transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-wait"
          >
            {/* {isProcessing ? '...' : 'JOIN'} */}
            JOIN
          </button>
        </form>
      </div>

    </div>
  );
};
export default Lobby;
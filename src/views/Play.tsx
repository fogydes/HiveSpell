import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { wordBank, speak } from '../services/gameService';
import { db } from '../firebase';
import { ref, get, update } from 'firebase/database';

interface GameState {
  type: 'public' | 'private';
  role: 'host' | 'player';
  code?: string;
}

const Play: React.FC = () => {
  // 1. Hooks
  const { mode: paramMode } = useParams<{ mode: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  
  // Game Configuration State
  const gameState = (location.state as GameState) || { type: 'public', role: 'player' };

  // 2. State
  // Use local state for mode to allow Host to change it dynamically
  const [currentMode, setCurrentMode] = useState(paramMode || 'baby');
  const [timeLeft, setTimeLeft] = useState(15);
  const [streak, setStreak] = useState(0);
  const [wpm, setWpm] = useState(0);
  const [currentWord, setCurrentWord] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [status, setStatus] = useState<'playing' | 'intermission'>('playing');
  const [intermissionTime, setIntermissionTime] = useState(10);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  // Refs for tracking WPM
  const startTimeRef = useRef<number>(Date.now());
  const totalCharsRef = useRef<number>(0);

  // Helper to determine base time and Star Reward based on mode
  const getModeConfig = (mode: string) => {
    switch (mode) {
      case 'baby': return { time: 25, stars: 6 };
      case 'cakewalk': return { time: 20, stars: 8 };
      case 'learner': return { time: 18, stars: 10 };
      case 'intermediate': return { time: 16, stars: 12 };
      case 'heated': return { time: 14, stars: 14 };
      case 'genius': return { time: 12, stars: 16 };
      case 'omniscient': return { time: 10, stars: 18 };
      case 'polymath': return { time: 12, stars: 20 }; // Bonus for mixed
      default: return { time: 15, stars: 5 };
    }
  };

  // 3. Next Word Logic
  const nextWord = useCallback(async () => {
    if (!currentMode || !wordBank[currentMode]) return;
    
    const words = wordBank[currentMode];
    const randomIndex = Math.floor(Math.random() * words.length);
    const word = words[randomIndex];
    
    setCurrentWord(word);
    setInputValue('');
    
    // Dynamic Timer Logic
    const { time: baseTime } = getModeConfig(currentMode);
    const calculatedTime = Math.max(5, Math.floor(baseTime - (streak * 0.2))); 
    
    setTimeLeft(calculatedTime);
    setStatus('playing');
    setIntermissionTime(10);
    setFeedback(null);
    
    const inputEl = document.getElementById('spelling-input');
    if (inputEl) inputEl.focus();

    await speak(word);
  }, [currentMode, streak]);

  // Handle Mode Change for Host
  const handleModeChange = (newMode: string) => {
    setCurrentMode(newMode);
    setStreak(0); // Reset streak on mode change
    // Force a restart
    setTimeout(() => nextWord(), 100);
  };

  // Initial Start
  useEffect(() => {
    nextWord();
    startTimeRef.current = Date.now();
    totalCharsRef.current = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 4. Timer Logic
  useEffect(() => {
    let interval: any;

    if (status === 'playing') {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleFail("Time's up!");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (status === 'intermission') {
      interval = setInterval(() => {
        setIntermissionTime((prev) => {
          if (prev <= 1) {
             nextWord();
             return 10;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [status, nextWord]);


  const handleFail = (msg: string) => {
    setStreak(0);
    setStatus('intermission');
    setFeedback({ type: 'error', msg: `${msg} The word was: ${currentWord}` });
  };

  const calculateWPM = (wordLen: number) => {
    totalCharsRef.current += wordLen;
    const timeElapsedMin = (Date.now() - startTimeRef.current) / 60000;
    
    if (timeElapsedMin > 0.01) { 
      const netWpm = Math.round((totalCharsRef.current / 5) / timeElapsedMin);
      setWpm(netWpm);
    }
  };

  // 5. Handle Submit Logic
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status !== 'playing') return;

    if (inputValue.trim().toLowerCase() === currentWord.toLowerCase()) {
      // Correct
      calculateWPM(currentWord.length);
      
      const newStreak = streak + 1;
      setStreak(newStreak);
      
      const { stars: starReward } = getModeConfig(currentMode);

      // Update Firebase
      if (user) {
        const userRef = ref(db, `users/${user.uid}`);
        // Fetch current values first to ensure accuracy, though we have userData from context, 
        // direct read avoids stale state race conditions if user is tapping fast.
        try {
           const snapshot = await get(userRef);
           const currentData = snapshot.val() || {};
           const currentStars = currentData.stars || 0;
           const currentCorrects = currentData.corrects || 0;

           await update(userRef, {
             stars: currentStars + starReward,
             corrects: currentCorrects + 1,
           });
        } catch (err) {
            console.error("Error updating stats", err);
        }
      }

      setFeedback({ type: 'success', msg: `Correct! +${starReward} Stars` });
      
      setTimeout(() => {
        nextWord();
      }, 300);

    } else {
      handleFail("Incorrect.");
    }
  };

  const skipIntermission = () => {
    nextWord();
  };

  const exitArena = () => {
    navigate('/lobby');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      
      {/* Game Container */}
      <div className="w-full max-w-md bg-slate-800 rounded-2xl shadow-2xl overflow-hidden border border-slate-700 relative">
        
        {/* Top Bar: Timer & Streak */}
        <div className="bg-slate-700/50 p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-mono font-bold ${timeLeft < 5 ? 'text-red-500 animate-pulse' : 'text-emerald-400'}`}>
              {status === 'playing' ? timeLeft : '--'}s
            </span>
          </div>
          <div className="flex flex-col items-end">
             <span className="text-xs text-slate-400 uppercase tracking-wider">Streak</span>
             <span className="text-xl font-bold text-orange-400">{streak} 🔥</span>
          </div>
        </div>

        {/* Private Server Header with Host Controls */}
        {gameState.type === 'private' && (
          <div className="bg-purple-900/40 border-b border-purple-500/30 p-2 text-center">
             <div className="inline-block bg-purple-900 border border-purple-500/50 px-3 py-1 rounded-full text-xs text-purple-200 mb-2">
                ROOM {gameState.code && `[${gameState.code}]`}
             </div>
             
             {/* Host Difficulty Selector */}
             {gameState.role === 'host' && (
               <div className="flex justify-center gap-2 items-center">
                 <label className="text-xs text-purple-300">MODE:</label>
                 <select 
                   value={currentMode} 
                   onChange={(e) => handleModeChange(e.target.value)}
                   className="bg-purple-950 text-white text-xs p-1 rounded border border-purple-500 outline-none"
                 >
                   {Object.keys(wordBank).map(m => (
                     <option key={m} value={m}>{m.toUpperCase()}</option>
                   ))}
                 </select>
               </div>
             )}
          </div>
        )}

        {/* Main Content */}
        <div className="p-8 flex flex-col items-center gap-6">
          
          {/* Audio Button */}
          {status === 'playing' ? (
             <button 
               onClick={() => speak(currentWord)}
               className="w-20 h-20 rounded-full bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-900/50 transition-all hover:scale-105 active:scale-95 group"
             >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white group-hover:animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
               </svg>
             </button>
          ) : (
            <div className="text-center animate-bounce">
              <span className="text-6xl">⏳</span>
            </div>
          )}

          {status === 'intermission' && (
             <div className="text-center space-y-2">
               <h3 className="text-red-400 font-bold text-lg">{feedback?.msg}</h3>
               <p className="text-slate-400">Next word in <span className="text-white font-bold">{intermissionTime}</span> seconds...</p>
               
               {/* Owner Skip Button */}
               {gameState.type === 'private' && gameState.role === 'host' && (
                 <button 
                   onClick={skipIntermission}
                   className="mt-4 px-4 py-1 bg-purple-700 hover:bg-purple-600 text-xs text-white rounded border border-purple-500 transition-colors shadow-lg"
                 >
                   Owner Skip ⏩
                 </button>
               )}
             </div>
          )}

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="w-full relative">
            <input
              id="spelling-input"
              type="text"
              autoComplete="off"
              autoFocus
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={status !== 'playing'}
              placeholder={status === 'playing' ? "Type what you hear..." : "Wait for next word..."}
              className={`w-full bg-slate-900 border-2 ${
                status === 'playing' ? 'border-emerald-500/50 focus:border-emerald-400' : 'border-slate-700 opacity-50'
              } rounded-xl px-4 py-4 text-center text-xl text-white outline-none transition-all placeholder:text-slate-600`}
            />
          </form>

        </div>

        {/* Footer Stats & Exit */}
        <div className="bg-slate-900 p-4 border-t border-slate-700 flex justify-between items-center text-sm text-slate-400 font-mono">
           <span>WPM: {wpm}</span>
           <button 
             onClick={exitArena}
             className="text-red-400 hover:text-red-300 hover:underline uppercase text-xs font-bold"
           >
             EXIT ARENA
           </button>
           <span className="uppercase text-emerald-500 font-bold">{currentMode}</span>
        </div>

      </div>
    </div>
  );
};

export default Play;
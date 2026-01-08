import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { wordBank, speak, checkAnswer, fetchDefinition, getTitle, MODE_ORDER } from '../services/gameService';
import { db } from '../firebase';
import { ref, get, update, onValue, set, push, onDisconnect, serverTimestamp, query, limitToLast } from 'firebase/database';

interface GameState {
  type: 'public' | 'private';
  role: 'host' | 'player';
  code?: string;
}

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  type: 'user' | 'server';
}

interface PlayerPresence {
  uid: string;
  title: string;
  photoSeed: string;
  corrects: number;
  wins: number;
}

const Play: React.FC = () => {
  const { mode: paramMode } = useParams<{ mode: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const gameState = (location.state as GameState) || { type: 'public', role: 'player' };

  const [currentMode, setCurrentMode] = useState(paramMode || 'baby');
  const [timeLeft, setTimeLeft] = useState(10);
  const [totalTime, setTotalTime] = useState(10);
  const [streak, setStreak] = useState(0);
  const [wpm, setWpm] = useState(0);
  const [currentWord, setCurrentWord] = useState('');
  const [definition, setDefinition] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [status, setStatus] = useState<'playing' | 'intermission'>('playing');
  const [intermissionTime, setIntermissionTime] = useState(10);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  
  // New UI States
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [players, setPlayers] = useState<PlayerPresence[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // High Precision Refs
  const wordStartTimeRef = useRef<number>(0);
  const timerEndRef = useRef<number>(0);
  const totalActiveTimeMsRef = useRef<number>(0);
  const totalCharsRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);

  // PRESENCE SYSTEM
  useEffect(() => {
    if (!user || !currentMode) return;
    
    // Register presence
    const presenceRef = ref(db, `presence/${currentMode}/${user.uid}`);
    set(presenceRef, true); // Just marking existence
    onDisconnect(presenceRef).remove();

    // Listen for players in this mode
    const modePresenceRef = ref(db, `presence/${currentMode}`);
    const unsubscribePresence = onValue(modePresenceRef, async (snapshot) => {
      const uids = snapshot.val() ? Object.keys(snapshot.val()) : [];
      
      // Fetch data for these players
      // Optimization: In a real app, listen to specific nodes or use a user list context
      const newPlayers: PlayerPresence[] = [];
      for (const uid of uids) {
         const userRef = ref(db, `users/${uid}`);
         const userSnap = await get(userRef);
         const uData = userSnap.val() || {};
         newPlayers.push({
           uid,
           title: uData.title || (user.uid === uid ? 'You' : 'Player'),
           photoSeed: uid,
           corrects: uData.corrects || 0,
           wins: uData.wins || 0
         });
      }
      // Sort by corrects desc
      newPlayers.sort((a, b) => b.corrects - a.corrects);
      setPlayers(newPlayers);
    });

    return () => {
      unsubscribePresence();
      set(presenceRef, null); // Manual cleanup on unmount
    };
  }, [user, currentMode]);

  // CHAT SYSTEM
  useEffect(() => {
    if (!currentMode) return;
    
    const chatRef = query(ref(db, `chat/${currentMode}`), limitToLast(50));
    const unsubscribeChat = onValue(chatRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const msgList = Object.entries(data).map(([key, val]: [string, any]) => ({
          id: key,
          sender: val.sender,
          text: val.text,
          type: val.type || 'user'
        }));
        setMessages(msgList);
      } else {
        setMessages([]);
      }
    });

    return () => unsubscribeChat();
  }, [currentMode]);

  // Auto scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !user) return;

    const chatRef = ref(db, `chat/${currentMode}`);
    await push(chatRef, {
      sender: userData?.title || 'Player',
      text: chatInput,
      timestamp: serverTimestamp(),
      type: 'user'
    });
    setChatInput('');
  };


  const getModeConfig = (mode: string) => {
    switch (mode) {
      case 'baby': return { time: 10, stars: 6 };
      case 'cakewalk': return { time: 12, stars: 8 };
      case 'learner': return { time: 14, stars: 10 };
      case 'intermediate': return { time: 18, stars: 12 };
      case 'heated': return { time: 20, stars: 14 };
      case 'genius': return { time: 25, stars: 16 };
      case 'omniscient': return { time: 30, stars: 18 };
      case 'polymath': return { time: 20, stars: 20 };
      default: return { time: 15, stars: 5 };
    }
  };

  const nextWord = useCallback(async () => {
    if (!currentMode || !wordBank[currentMode]) return;
    
    let activeMode = currentMode;
    if (streak > 25) {
      const currentIndex = MODE_ORDER.indexOf(currentMode);
      if (currentIndex !== -1 && currentIndex < MODE_ORDER.length - 1) {
        activeMode = MODE_ORDER[currentIndex + 1];
      }
    }

    const words = wordBank[activeMode];
    const randomIndex = Math.floor(Math.random() * words.length);
    const word = words[randomIndex];
    
    setCurrentWord(word);
    setInputValue('');
    setDefinition('Loading definition...');
    fetchDefinition(word).then(setDefinition);
    
    const { time: baseTime } = getModeConfig(activeMode);
    const decay = streak * 0.5;
    const calculatedTime = Math.max(3, baseTime - decay); 
    
    setTotalTime(calculatedTime);
    setTimeLeft(calculatedTime);
    setStatus('playing');
    setIntermissionTime(5); 
    setFeedback(null);
    
    const now = Date.now();
    wordStartTimeRef.current = now;
    timerEndRef.current = now + (calculatedTime * 1000);
    
    const inputEl = document.getElementById('spelling-input');
    if (inputEl) inputEl.focus();

    await speak(word);
  }, [currentMode, streak]);

  const handleModeChange = (newMode: string) => {
    setCurrentMode(newMode);
    setStreak(0);
    setTimeout(() => nextWord(), 100);
  };

  useEffect(() => {
    nextWord();
    totalActiveTimeMsRef.current = 0;
    totalCharsRef.current = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const updateTimer = () => {
      if (status === 'playing') {
        const now = Date.now();
        const delta = timerEndRef.current - now;
        
        if (delta <= 0) {
          setTimeLeft(0);
          handleFail("Time's up!");
        } else {
          setTimeLeft(delta / 1000); 
          animationFrameRef.current = requestAnimationFrame(updateTimer);
        }
      }
    };

    if (status === 'playing') {
      animationFrameRef.current = requestAnimationFrame(updateTimer);
    } else {
      cancelAnimationFrame(animationFrameRef.current);
    }
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [status, currentWord]);

  useEffect(() => {
    let interval: any;
    if (status === 'intermission') {
      interval = setInterval(() => {
        setIntermissionTime((prev) => {
          if (prev <= 1) {
             nextWord();
             return 5;
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

  const updateWPM = (wordLen: number) => {
    const now = Date.now();
    const durationMs = now - wordStartTimeRef.current;
    totalActiveTimeMsRef.current += durationMs;
    totalCharsRef.current += wordLen;
    const totalMinutes = totalActiveTimeMsRef.current / 60000;
    if (totalMinutes > 0) {
      setWpm(Math.round((totalCharsRef.current / 5) / totalMinutes));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status !== 'playing') return;

    if (checkAnswer(currentWord, inputValue.trim())) {
      updateWPM(currentWord.length);
      const newStreak = streak + 1;
      setStreak(newStreak);
      
      const { stars: starReward } = getModeConfig(currentMode);

      if (user) {
        const userRef = ref(db, `users/${user.uid}`);
        try {
           const snapshot = await get(userRef);
           const currentData = snapshot.val() || {};
           const currentStars = currentData.stars || 0;
           const currentCorrects = currentData.corrects || 0;
           const currentWins = currentData.wins || 0;

           const newWins = newStreak % 10 === 0 ? currentWins + 1 : currentWins;
           const newCorrects = currentCorrects + 1;
           const newTitle = getTitle(newCorrects, newWins);

           await update(userRef, {
             stars: currentStars + starReward,
             corrects: newCorrects,
             wins: newWins,
             title: newTitle
           });
        } catch (err) {
            console.error("Error updating stats", err);
        }
      }

      setFeedback({ type: 'success', msg: `Correct! +${starReward}` });
      setTimeout(() => nextWord(), 200);

    } else {
      handleFail("Incorrect.");
    }
  };

  const skipIntermission = () => nextWord();
  const exitArena = () => navigate('/lobby');

  const getFireIntensity = () => {
    if (streak > 25) return 'bg-red-900/40 border-red-500 shadow-[0_0_50px_rgba(220,38,38,0.5)]';
    if (streak > 10) return 'bg-orange-900/30 border-orange-500';
    if (streak > 5) return 'bg-yellow-900/20';
    return '';
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans text-white transition-colors duration-1000 ${streak > 25 ? 'bg-[#1a0505]' : 'bg-[#050914]'}`}>
      
      {/* Background Glows */}
      <div className={`absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[100px] pointer-events-none transition-all duration-1000 ${streak > 25 ? 'bg-red-600/20' : 'bg-emerald-500/5'}`}></div>
      
      {/* Chat Box - Mid Left (Roblox Style) */}
      <div className="absolute top-24 left-4 w-72 h-64 bg-black/50 backdrop-blur-sm rounded-lg flex flex-col border border-slate-700/50 overflow-hidden z-40 shadow-xl">
         <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-slate-700">
             {messages.map((msg) => (
               <div key={msg.id} className="text-xs break-words">
                 {msg.type === 'server' ? (
                   <span className="text-red-400 font-bold">[Server] {msg.text}</span>
                 ) : (
                   <>
                     <span className="text-yellow-400 font-bold">[{msg.sender}]:</span> <span className="text-white drop-shadow-md">{msg.text}</span>
                   </>
                 )}
               </div>
             ))}
             <div ref={chatEndRef} />
         </div>
         <form onSubmit={handleSendMessage} className="p-2 bg-black/30">
            <input 
              type="text" 
              value={chatInput} 
              onChange={(e) => setChatInput(e.target.value)} 
              placeholder="To chat click here or press / key"
              className="w-full bg-transparent text-white text-xs placeholder-slate-400 outline-none"
            />
         </form>
      </div>

      {/* Player List - Top Right (Roblox Style) */}
      <div className="absolute top-24 right-4 w-64 bg-black/50 backdrop-blur-sm rounded-lg border border-slate-700/50 overflow-hidden z-40 shadow-xl">
         <div className="flex justify-between items-center px-3 py-1 bg-black/30 border-b border-slate-700/50">
             <span className="text-xs text-slate-300 font-bold">People</span>
             <button className="text-slate-400 hover:text-white">✕</button>
         </div>
         <div className="grid grid-cols-[1fr_50px_40px] px-3 py-1 text-[10px] text-slate-400 font-bold uppercase border-b border-slate-700/30">
            <span>Name</span>
            <span className="text-right">Correct</span>
            <span className="text-right">Wins</span>
         </div>
         <div className="max-h-60 overflow-y-auto">
            {players.map((p) => (
              <div key={p.uid} className="grid grid-cols-[1fr_50px_40px] px-3 py-2 text-xs items-center hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-2 overflow-hidden">
                     <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.photoSeed}`} className="w-5 h-5 rounded bg-slate-700" alt="p" />
                     <span className="truncate text-white drop-shadow-sm font-medium">{p.title}</span>
                  </div>
                  <div className="text-right text-white font-mono">{p.corrects}</div>
                  <div className="text-right text-slate-300 font-mono">{p.wins}</div>
              </div>
            ))}
         </div>
      </div>


      {/* Main Game Interface */}
      <div className={`w-full max-w-3xl flex flex-col items-center z-10 transition-all duration-500 p-8 rounded-3xl border border-transparent ${getFireIntensity()}`}>
        
        {/* Description Box */}
        <div className="w-full max-w-lg mb-8 text-center min-h-[60px]">
           {status === 'playing' ? (
             <p className="text-slate-400 text-sm italic font-serif leading-relaxed px-4 py-2 bg-slate-900/50 rounded-lg border border-slate-800">
               "{definition}"
             </p>
           ) : (
             <div className="h-[60px]"></div>
           )}
        </div>

        {/* Mode Badge */}
        <div className="flex items-center gap-4 mb-6">
          <div className="bg-slate-800/80 px-4 py-1 rounded text-sm font-bold tracking-widest uppercase text-emerald-400 border border-slate-700">
             {streak > 25 ? 'RAMPAGE MODE' : currentMode}
          </div>
        </div>

        {/* Stats Row */}
        <div className="w-full flex justify-between items-end mb-2 px-2 text-slate-400 text-xs font-bold tracking-widest">
           <div className="text-center">
             <div className={`text-2xl mb-1 ${streak > 5 ? 'text-orange-500 animate-pulse' : 'text-white'}`}>
               {streak} {streak > 5 && '🔥'}
             </div>
             <div>STREAK</div>
           </div>
           <div className="text-center">
             <div className="text-emerald-400 text-xl mb-1">{wpm}</div>
             <div>WPM</div>
           </div>
        </div>

        {/* Precise Timer on Top */}
        <div className="w-full text-center text-emerald-400 font-mono text-sm font-bold mb-1">
           {timeLeft.toFixed(1)}s
        </div>

        {/* Progress Bar */}
        <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden mb-8 relative border border-slate-700">
           <div 
             className={`h-full shadow-[0_0_15px_rgba(16,185,129,0.6)] ${timeLeft < 3 ? 'bg-red-500' : 'bg-emerald-500'}`}
             style={{ width: `${Math.min(100, (timeLeft / totalTime) * 100)}%` }}
           ></div>
        </div>

        {/* Speaker / Feedback Area */}
        <div className="mb-12 relative min-h-[100px] flex items-center justify-center w-full">
           {status === 'playing' ? (
             <button 
               onClick={() => speak(currentWord)}
               className="w-24 h-24 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center transition-all group cursor-pointer active:scale-95"
             >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-emerald-400 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
             </button>
           ) : (
             <div className="flex flex-col items-center bg-slate-900/90 p-4 rounded-xl border border-slate-700 shadow-xl z-20 w-full max-w-sm">
               <div className="text-red-400 font-bold mb-2 text-center text-lg">{feedback?.msg}</div>
               <div className="text-slate-400 text-sm mb-4">Next word in <span className="text-white font-bold">{intermissionTime}</span>...</div>
               
               {gameState.type === 'private' && gameState.role === 'host' && (
                  <button onClick={skipIntermission} className="text-xs bg-slate-800 px-3 py-1 rounded border border-slate-700 hover:border-emerald-500 transition-colors text-white">
                    SKIP
                  </button>
               )}
               {!feedback?.msg && <div className="text-3xl animate-bounce">⏳</div>}
             </div>
           )}
        </div>

        {/* Input Area */}
        <div className="w-full max-w-lg mb-24">
           <div className="text-center text-slate-500 text-xs font-bold tracking-[0.2em] mb-4">
             TYPE THE WORD YOU HEAR
           </div>
           <form onSubmit={handleSubmit}>
              <input
                id="spelling-input"
                type="text"
                autoComplete="off"
                autoFocus
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={status !== 'playing'}
                placeholder="Type word..."
                className="w-full bg-transparent border-b-2 border-slate-700 focus:border-emerald-500 text-center text-4xl md:text-5xl font-bold text-white outline-none py-4 placeholder:text-slate-800 transition-colors"
              />
           </form>
        </div>

        <button 
          onClick={exitArena}
          className="text-slate-500 hover:text-white text-xs font-bold tracking-widest transition-colors"
        >
          EXIT ARENA
        </button>

        {gameState.type === 'private' && gameState.role === 'host' && (
          <div className="absolute top-20 right-6 flex flex-col items-end gap-2">
             <select 
               value={currentMode}
               onChange={(e) => handleModeChange(e.target.value)}
               className="bg-slate-800 text-xs text-slate-300 border border-slate-700 rounded p-1 outline-none"
             >
                {Object.keys(wordBank).map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
             </select>
             <span className="text-[10px] text-slate-600">CODE: {gameState.code}</span>
          </div>
        )}

      </div>
    </div>
  );
};

export default Play;
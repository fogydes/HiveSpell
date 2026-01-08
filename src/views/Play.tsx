import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
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
  timestamp: number;
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
  const { ttsVolume, playTypingSound } = useSettings();
  const gameState = (location.state as GameState) || { type: 'public', role: 'player' };

  const [currentMode, setCurrentMode] = useState(paramMode || 'baby');
  const [timeLeft, setTimeLeft] = useState(10);
  const [totalTime, setTotalTime] = useState(10);
  const [streak, setStreak] = useState(0);
  const [wpm, setWpm] = useState(0);
  const [currentWord, setCurrentWord] = useState('');
  const [definition, setDefinition] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [status, setStatus] = useState<'playing' | 'intermission' | 'speaking'>('playing');
  const [intermissionTime, setIntermissionTime] = useState(10);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const [isInputDisabled, setIsInputDisabled] = useState(false);
  
  // UI States
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [players, setPlayers] = useState<PlayerPresence[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Track join time to filter old chat history
  const joinTimeRef = useRef<number>(Date.now());

  // Sidebar Toggles (Mobile Only)
  const [activeTab, setActiveTab] = useState<'none' | 'chat' | 'players'>('none');

  // High Precision Refs for WPM
  const wordStartTimeRef = useRef<number>(0);
  const timerEndRef = useRef<number>(0);
  // Track valid typed characters (correct words)
  const totalCorrectCharsRef = useRef<number>(0);
  // Track total time spent ONLY during valid words
  const totalTypingTimeSecRef = useRef<number>(0);
  const previousWordRef = useRef<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  const animationFrameRef = useRef<number>(0);

  // PRESENCE SYSTEM
  useEffect(() => {
    if (!user || !currentMode) return;
    
    const presenceRef = ref(db, `presence/${currentMode}/${user.uid}`);
    set(presenceRef, true).catch(err => {}); // Silent fail for permission
    onDisconnect(presenceRef).remove().catch(err => {});

    const modePresenceRef = ref(db, `presence/${currentMode}`);
    const unsubscribePresence = onValue(modePresenceRef, async (snapshot) => {
      const uids = snapshot.val() ? Object.keys(snapshot.val()) : [];
      
      const newPlayers: PlayerPresence[] = [];
      for (const uid of uids) {
         try {
           const userRef = ref(db, `users/${uid}`);
           const userSnap = await get(userRef);
           const uData = userSnap.val() || {};
           newPlayers.push({
             uid,
             // Fix: Show Username for everyone, including self (removed 'You' override)
             title: uData.username || (uData.email ? uData.email.split('@')[0] : 'Player'),
             photoSeed: uid,
             corrects: uData.corrects || 0,
             wins: uData.wins || 0
           });
         } catch (e) {
           newPlayers.push({
             uid,
             title: 'Unknown',
             photoSeed: uid,
             corrects: 0,
             wins: 0
           });
         }
      }
      newPlayers.sort((a, b) => b.corrects - a.corrects);
      setPlayers(newPlayers);
    }, (error) => {
      console.warn("Presence listener failed (Perms?):", error);
      // Fallback
      if (user) {
        setPlayers([{
           uid: user.uid,
           title: userData?.username || (user.email ? user.email.split('@')[0] : 'Player'),
           photoSeed: user.uid,
           corrects: userData?.corrects || 0,
           wins: userData?.wins || 0
        }]);
      }
    });

    return () => {
      unsubscribePresence();
      set(presenceRef, null).catch(() => {});
    };
  }, [user, currentMode, userData]);

  // CHAT SYSTEM
  useEffect(() => {
    if (!currentMode) return;
    
    // We still query the last 50, but we will filter them client-side based on joinTime
    const chatRef = query(ref(db, `chat/${currentMode}`), limitToLast(50));
    const unsubscribeChat = onValue(chatRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const msgList = Object.entries(data)
          .map(([key, val]: [string, any]) => ({
            id: key,
            sender: val.sender,
            text: val.text,
            timestamp: val.timestamp,
            type: val.type || 'user'
          }))
          // FILTER: Only show messages sent AFTER I joined this session
          .filter(msg => msg.timestamp && msg.timestamp >= joinTimeRef.current);
          
        setMessages(msgList);
      } else {
        setMessages([]);
      }
    }, (error) => {
      console.warn("Chat listener failed:", error);
      setMessages([{ id: 'sys', sender: 'System', text: 'Chat disconnected', timestamp: Date.now(), type: 'server'}]);
    });

    return () => unsubscribeChat();
  }, [currentMode]);

  useEffect(() => {
    // Auto scroll if tab is open OR if on desktop (where it's always open)
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTab]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !user) return;

    const chatRef = ref(db, `chat/${currentMode}`);
    try {
      await push(chatRef, {
        sender: userData?.username || (user.email ? user.email.split('@')[0] : 'Player'),
        text: chatInput,
        timestamp: serverTimestamp(),
        type: 'user'
      });
      setChatInput('');
    } catch (e) {
      console.error("Failed to send message:", e);
    }
  };


  const getModeConfig = (mode: string) => {
    switch (mode) {
      case 'baby': return { time: 10, stars: 6 };
      case 'cakewalk': return { time: 12, stars: 8 };
      case 'learner': return { time: 14, stars: 10 };
      case 'intermediate': return { time: 18, stars: 12 };
      case 'heated': return { time: 20, stars: 14 };
      case 'genius': return { time: 25, stars: 16 };
      case 'polymath': return { time: 30, stars: 18 };
      case 'omniscient': return { time: 20, stars: 20 };
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
    let word = '';
    // Prevent immediate repetition
    let attempts = 0;
    do {
      const randomIndex = Math.floor(Math.random() * words.length);
      word = words[randomIndex];
      attempts++;
    } while (word === previousWordRef.current && attempts < 5);
    
    previousWordRef.current = word;

    setCurrentWord(word);
    setInputValue('');
    setDefinition('Loading definition...');
    fetchDefinition(word).then(setDefinition);
    
    const { time: baseTime } = getModeConfig(activeMode);
    const decay = streak * 0.5;
    const calculatedTime = Math.max(3, baseTime - decay); 
    
    setTotalTime(calculatedTime);
    setTimeLeft(calculatedTime);
    setIntermissionTime(5); 
    setFeedback(null);
    
    // Disable input while speaking
    setIsInputDisabled(true);
    setStatus('speaking');

    // Wait for TTS to finish
    await speak(word, ttsVolume);

    // Re-enable and start timer
    setIsInputDisabled(false);
    setStatus('playing');

    const now = Date.now();
    wordStartTimeRef.current = now;
    timerEndRef.current = now + (calculatedTime * 1000);
    
    // Autofocus
    setTimeout(() => {
        if(inputRef.current) inputRef.current.focus();
    }, 10);

  }, [currentMode, streak, ttsVolume]);

  const handleModeChange = (newMode: string) => {
    setCurrentMode(newMode);
    setStreak(0);
    // Reset join time when switching modes so chat clears
    joinTimeRef.current = Date.now();
    setTimeout(() => nextWord(), 100);
  };

  useEffect(() => {
    nextWord();
    totalCorrectCharsRef.current = 0;
    totalTypingTimeSecRef.current = 0;
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
    const durationSec = (now - wordStartTimeRef.current) / 1000;
    
    // Accumulate total valid time and characters
    totalTypingTimeSecRef.current += durationSec;
    totalCorrectCharsRef.current += wordLen;

    const totalMinutes = totalTypingTimeSecRef.current / 60;
    
    if (totalMinutes > 0) {
      // Standard WPM formula: (All Chars / 5) / Minutes
      // Using word length here assumes perfect typing of that word
      const grossWPM = (totalCorrectCharsRef.current / 5) / totalMinutes;
      setWpm(Math.round(grossWPM));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.length > inputValue.length) {
        playTypingSound();
    }
    setInputValue(val);
  }

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
             // We don't overwrite username here to save writes
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

  const toggleTab = (tab: 'chat' | 'players') => {
    setActiveTab(activeTab === tab ? 'none' : tab);
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans text-white transition-colors duration-1000 ${streak > 25 ? 'bg-[#1a0505]' : 'bg-[#050914]'}`}>
      
      {/* Background Glows */}
      <div className={`absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[100px] pointer-events-none transition-all duration-1000 ${streak > 25 ? 'bg-red-600/20' : 'bg-emerald-500/5'}`}></div>
      
      {/* =======================
          MOBILE CONTROLS 
      ======================== */}
      <div className="lg:hidden fixed right-4 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-50 pointer-events-auto">
         <button onClick={exitArena} className="p-3 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-full border border-red-500/50 backdrop-blur-sm transition-all shadow-lg mb-4">
           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
           </svg>
         </button>
         <button onClick={() => toggleTab('chat')} className={`p-3 rounded-full border shadow-lg backdrop-blur-sm transition-all ${activeTab === 'chat' ? 'bg-emerald-600 border-emerald-500' : 'bg-slate-800/80 border-slate-600'}`}>
           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
         </button>
         <button onClick={() => toggleTab('players')} className={`p-3 rounded-full border shadow-lg backdrop-blur-sm transition-all ${activeTab === 'players' ? 'bg-emerald-600 border-emerald-500' : 'bg-slate-800/80 border-slate-600'}`}>
           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
         </button>
      </div>

      {/* =======================
          CHAT BOX (Dual Mode)
      ======================== */}
      {/* On Mobile: It's a drawer. On Desktop: It's a fixed box on left */}
      <div className={`
         fixed z-40 bg-slate-900/95 backdrop-blur-xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden transition-all duration-300
         /* Mobile Styles */
         lg:hidden right-20 top-1/2 -translate-y-1/2 w-[80vw] h-[50vh] rounded-2xl origin-right
         ${activeTab === 'chat' ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'}
         
         /* Desktop Styles */
         lg:pointer-events-auto lg:scale-100 lg:opacity-100 lg:left-4 lg:top-1/2 lg:-translate-y-1/2 lg:w-72 lg:h-[60vh] lg:rounded-xl lg:origin-center
      `}>
         <div className="p-3 border-b border-slate-700 bg-black/20 font-bold text-sm">Hive Chat</div>
         <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-slate-700">
             {messages.length === 0 && (
                <div className="text-xs text-slate-500 text-center mt-4">Welcome to the chat!</div>
             )}
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
         <form onSubmit={handleSendMessage} className="p-3 bg-black/30 border-t border-slate-700">
            <input 
              type="text" 
              value={chatInput} 
              onChange={(e) => setChatInput(e.target.value)} 
              placeholder="Message..."
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-400 outline-none focus:border-emerald-500"
            />
         </form>
      </div>

      {/* =======================
          PLAYER LIST (Dual Mode)
      ======================== */}
      {/* On Mobile: Drawer. On Desktop: Fixed box on right */}
      <div className={`
         fixed z-40 bg-slate-900/95 backdrop-blur-xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden transition-all duration-300
         /* Mobile Styles */
         lg:hidden right-20 top-1/2 -translate-y-1/2 w-[80vw] h-[50vh] rounded-2xl origin-right
         ${activeTab === 'players' ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'}

         /* Desktop Styles */
         lg:pointer-events-auto lg:scale-100 lg:opacity-100 lg:right-4 lg:top-1/2 lg:-translate-y-1/2 lg:w-64 lg:h-[60vh] lg:rounded-xl lg:origin-center
      `}>
         <div className="p-3 border-b border-slate-700 bg-black/20 font-bold text-sm flex justify-between">
            <span>People ({players.length})</span>
         </div>
         <div className="grid grid-cols-[1fr_50px_40px] px-3 py-2 text-[10px] text-slate-400 font-bold uppercase border-b border-slate-700/50">
            <span>Name</span>
            <span className="text-right">Correct</span>
            <span className="text-right">Wins</span>
         </div>
         <div className="flex-1 overflow-y-auto">
            {players.map((p) => (
              <div key={p.uid} className={`grid grid-cols-[1fr_50px_40px] px-3 py-3 text-xs items-center transition-colors border-b border-slate-800/50 ${p.uid === user?.uid ? 'bg-emerald-900/20' : 'hover:bg-white/5'}`}>
                  <div className="flex items-center gap-2 overflow-hidden">
                     <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.photoSeed}`} className="w-6 h-6 rounded bg-slate-700" alt="p" />
                     <span className={`truncate font-medium ${p.uid === user?.uid ? 'text-emerald-400' : 'text-white'}`}>
                       {p.title} {p.uid === user?.uid && '(You)'}
                     </span>
                  </div>
                  <div className="text-right text-emerald-400 font-mono">{p.corrects}</div>
                  <div className="text-right text-slate-300 font-mono">{p.wins}</div>
              </div>
            ))}
         </div>
      </div>


      {/* MAIN GAME INTERFACE */}
      <div className={`w-full max-w-xl flex flex-col items-center z-10 transition-all duration-500 p-4 sm:p-8 rounded-3xl border border-transparent ${getFireIntensity()}`}>
        
        {/* Desktop Exit Button - Top Right of Game Container */}
        <button 
           onClick={exitArena}
           className="hidden lg:block absolute -top-12 right-0 p-2 text-red-400 hover:text-red-300 font-bold text-sm uppercase tracking-widest transition-colors"
         >
           Exit Arena
         </button>

        {/* Description Box */}
        <div className="w-full max-w-lg mb-4 sm:mb-8 text-center min-h-[50px]">
           {status === 'playing' ? (
             <p className="text-slate-400 text-xs sm:text-sm italic font-serif leading-relaxed px-4 py-2 bg-slate-900/50 rounded-lg border border-slate-800">
               "{definition}"
             </p>
           ) : (
             <div className="h-[50px]">
                {status === 'speaking' && <div className="text-emerald-400 animate-pulse text-sm font-bold tracking-widest">LISTENING TO HIVE...</div>}
             </div>
           )}
        </div>

        {/* Mode Badge */}
        <div className="flex items-center gap-4 mb-4 sm:mb-6">
          <div className="bg-slate-800/80 px-4 py-1 rounded text-xs font-bold tracking-widest uppercase text-emerald-400 border border-slate-700">
             {streak > 25 ? 'RAMPAGE MODE' : currentMode}
          </div>
        </div>

        {/* Stats Row */}
        <div className="w-full flex justify-between items-end mb-2 px-2 text-slate-400 text-[10px] sm:text-xs font-bold tracking-widest">
           <div className="text-center">
             <div className={`text-xl sm:text-2xl mb-1 ${streak > 5 ? 'text-orange-500 animate-pulse' : 'text-white'}`}>
               {streak} {streak > 5 && '🔥'}
             </div>
             <div>STREAK</div>
           </div>
           <div className="text-center">
             <div className="text-emerald-400 text-xl sm:text-2xl mb-1">{wpm}</div>
             <div>WPM</div>
           </div>
        </div>

        {/* Precise Timer on Top */}
        <div className="w-full text-center text-emerald-400 font-mono text-sm font-bold mb-1">
           {timeLeft.toFixed(1)}s
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 sm:h-3 bg-slate-800 rounded-full overflow-hidden mb-8 relative border border-slate-700">
           <div 
             className={`h-full shadow-[0_0_15px_rgba(16,185,129,0.6)] ${timeLeft < 3 ? 'bg-red-500' : 'bg-emerald-500'}`}
             style={{ width: `${Math.min(100, (timeLeft / totalTime) * 100)}%` }}
           ></div>
        </div>

        {/* Speaker / Feedback Area */}
        <div className="mb-8 relative min-h-[100px] flex items-center justify-center w-full">
           {status === 'playing' ? (
             <button 
               onClick={() => speak(currentWord, ttsVolume)}
               className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center transition-all group cursor-pointer active:scale-95 animate-pulse-slow"
             >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 sm:h-10 sm:w-10 text-emerald-400 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
             </button>
           ) : status === 'speaking' ? (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center animate-spin-slow">
                     <span className="text-2xl">🔊</span>
                </div>
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

        {/* Input Area - Adjusted for mobile keyboard */}
        <div className="w-full max-w-lg mb-8 sm:mb-12">
           <div className="text-center text-slate-500 text-[10px] font-bold tracking-[0.2em] mb-2 sm:mb-4">
             TYPE THE WORD YOU HEAR
           </div>
           <form onSubmit={handleSubmit}>
              <input
                ref={inputRef}
                id="spelling-input"
                type="text"
                autoComplete="off"
                autoFocus
                value={inputValue}
                onChange={handleInputChange}
                disabled={isInputDisabled || status !== 'playing'}
                placeholder="Type word..."
                className="w-full bg-transparent border-b-2 border-slate-700 focus:border-emerald-500 text-center text-3xl sm:text-5xl font-bold text-white outline-none py-2 sm:py-4 placeholder:text-slate-800 transition-colors disabled:opacity-50 disabled:cursor-wait"
              />
           </form>
        </div>

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
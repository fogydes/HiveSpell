import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { wordBank, speak, checkAnswer, fetchDefinition } from '../services/gameService';
import { db } from '../firebase';
import * as firebaseDatabase from 'firebase/database';

// SAFEGUARD: Move destructuring inside component or use directly to prevent module eval crashes
const dbRef = (firebaseDatabase as any).ref;
const dbGet = (firebaseDatabase as any).get;
const dbUpdate = (firebaseDatabase as any).update;
const dbOnValue = (firebaseDatabase as any).onValue;
const dbSet = (firebaseDatabase as any).set;
const dbPush = (firebaseDatabase as any).push;
const dbOnDisconnect = (firebaseDatabase as any).onDisconnect;
const dbServerTimestamp = (firebaseDatabase as any).serverTimestamp;
const dbQuery = (firebaseDatabase as any).query;
const dbLimitToLast = (firebaseDatabase as any).limitToLast;

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
  joinedAt: number;
}

interface SharedMatchState {
  currentWord: string;
  activePlayerUid: string;
  deadline: number;
  lastUpdate: number;
}

const Play: React.FC = () => {
  const { mode: paramMode } = useParams<{ mode: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const { ttsVolume, playTypingSound } = useSettings();
  const gameState = (location.state as GameState) || { type: 'public', role: 'player' };

  // Match ID logic
  const matchId = gameState.type === 'private' && gameState.code 
    ? `${paramMode}_${gameState.code}` 
    : `${paramMode}_public`;

  const [currentMode] = useState(paramMode || 'baby');
  
  // Game Logic State
  const [timeLeft, setTimeLeft] = useState(0);
  const [isInputEnabled, setIsInputEnabled] = useState(false);

  const [currentWord, setCurrentWord] = useState('');
  const [definition, setDefinition] = useState('Loading...');
  const [inputValue, setInputValue] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const [activePlayerUid, setActivePlayerUid] = useState<string | null>(null);
  
  // UI States
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [players, setPlayers] = useState<PlayerPresence[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const animationFrameRef = useRef<number>(0);
  const timerEndRef = useRef<number>(0);

  // TURN LOGIC - Derived State
  const isMyTurn = user && activePlayerUid === user.uid;
  const activePlayerName = players.find(p => p.uid === activePlayerUid)?.title || "Unknown";
  const isSolo = players.length === 1;

  // AUTO-FOCUS / AUDIO TRIGGER
  useEffect(() => {
    if (isMyTurn && currentWord) {
       setFeedback(null);
       setInputValue('');
       speak(currentWord, ttsVolume);
       const timer = setTimeout(() => {
          setIsInputEnabled(true);
          if (inputRef.current) inputRef.current.focus();
       }, 500);
       return () => clearTimeout(timer);
    } else {
       setIsInputEnabled(false);
       if(inputRef.current) inputRef.current.blur();
    }
  }, [isMyTurn, currentWord, ttsVolume]);

  // HOST HELPER: Pick Word & Update DB
  const setNewWord = async (playerUid: string) => {
     const words = wordBank[currentMode] || wordBank['baby'];
     const randomWord = words[Math.floor(Math.random() * words.length)];
     
     const duration = 5 + Math.ceil(randomWord.length * 1.5); 
     const deadline = Date.now() + (duration * 1000);

     await dbUpdate(dbRef(db, `matches/${matchId}/state`), {
       currentWord: randomWord,
       activePlayerUid: playerUid,
       deadline: deadline,
       lastUpdate: Date.now()
     });
  };

  // HOST HELPER: Start New Turn
  const startNewTurn = async () => {
     if (!players.length) return;
     const nextPlayer = players[0].uid; 
     await setNewWord(nextPlayer);
  };

  // HOST HELPER: Advance Turn
  const advanceTurn = async (currentUid: string) => {
     if (!players.length) return;
     
     const currentIndex = players.findIndex(p => p.uid === currentUid);
     let nextIndex = 0;
     if (currentIndex !== -1) {
        nextIndex = (currentIndex + 1) % players.length;
     }
     // If the calculated next player is the same as current (e.g. solo play), 
     // setNewWord still triggers a new word/deadline, effectively restarting the loop.
     
     const nextPlayerUid = players[nextIndex].uid;
     await setNewWord(nextPlayerUid);
  };

  // CONSOLIDATED HOST LOGIC
  useEffect(() => {
    if (!user || players.length === 0) return;
    
    // Only the 'oldest' player acts as Host to prevent write conflicts
    const isHost = players[0].uid === user.uid;

    if (isHost) {
      const interval = setInterval(async () => {
         const snap = await dbGet(dbRef(db, `matches/${matchId}/state`));
         const state = snap.val() as SharedMatchState;
         const now = Date.now();

         // 1. Initialize if empty
         if (!state) {
            await startNewTurn();
            return;
         }

         // 2. Validate Active Player (Fix "Spectating Unknown" or Ghost Users)
         const activeUid = state.activePlayerUid;
         const isActivePlayerPresent = players.some(p => p.uid === activeUid);

         if (!isActivePlayerPresent) {
            console.log("Host Recovery: Active player not present. Advancing turn.");
            // If the active player is gone, just move to the next valid player (which might be the host themselves)
            await advanceTurn(activeUid);
            return;
         }

         // 3. Check for Timeout
         if (state.deadline > 0 && now > state.deadline) {
             await advanceTurn(activeUid);
         }
      }, 1000); // Check every second

      return () => clearInterval(interval);
    }
  }, [players, user, matchId]);


  // LISTENER: Game State (Word, Active Player)
  useEffect(() => {
     const matchStateRef = dbRef(db, `matches/${matchId}/state`);
     const unsub = dbOnValue(matchStateRef, (snap: any) => {
        const state = snap.val() as SharedMatchState;
        if (state) {
           if (state.currentWord !== currentWord) {
              setCurrentWord(state.currentWord);
              fetchDefinition(state.currentWord).then(setDefinition);
           }
           setActivePlayerUid(state.activePlayerUid);
           
           const remaining = Math.max(0, (state.deadline - Date.now()) / 1000);
           setTimeLeft(remaining);
           timerEndRef.current = state.deadline;
        } else {
            setActivePlayerUid(null);
        }
     });
     return () => unsub();
  }, [matchId]);

  // ANIMATION: Smooth Timer
  useEffect(() => {
    const updateTimer = () => {
        if (timerEndRef.current > 0) {
            const now = Date.now();
            const delta = Math.max(0, (timerEndRef.current - now) / 1000);
            setTimeLeft(delta);
            animationFrameRef.current = requestAnimationFrame(updateTimer);
        }
    };
    animationFrameRef.current = requestAnimationFrame(updateTimer);
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [activePlayerUid]);

  // PLAYER SUBMISSION LOGIC
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMyTurn || !user) return;
    
    if (checkAnswer(currentWord, inputValue.trim())) {
       setFeedback({ type: 'success', msg: 'Correct!' });
       playTypingSound(); 
       
       const userRef = dbRef(db, `users/${user.uid}`);
       try {
           const snapshot = await dbGet(userRef);
           const uData = snapshot.val() || {};
           await dbUpdate(userRef, {
             corrects: (uData.corrects || 0) + 1,
           });
       } catch (e) {}

       await advanceTurn(user.uid);

    } else {
       setFeedback({ type: 'error', msg: 'Incorrect!' });
       await advanceTurn(user.uid);
    }
  };

  // PRESENCE SYSTEM
  useEffect(() => {
    if (!user || !matchId) return;
    
    const presenceRef = dbRef(db, `matches/${matchId}/presence/${user.uid}`);
    dbSet(presenceRef, {
       uid: user.uid,
       joinedAt: dbServerTimestamp()
    }).catch((err: any) => {}); 
    dbOnDisconnect(presenceRef).remove().catch((err: any) => {});

    const lobbyRef = dbRef(db, `matches/${matchId}/presence`);
    const unsub = dbOnValue(lobbyRef, async (snapshot: any) => {
      const data = snapshot.val();
      if (!data) {
        setPlayers([]);
        return;
      }
      
      const pList: PlayerPresence[] = [];
      const uids = Object.keys(data);

      for (const uid of uids) {
         try {
           const userRef = dbRef(db, `users/${uid}`);
           const userSnap = await dbGet(userRef);
           const uData = userSnap.val() || {};
           pList.push({
             uid,
             title: uData.username || 'Player',
             photoSeed: uid,
             corrects: uData.corrects || 0,
             wins: uData.wins || 0,
             joinedAt: data[uid].joinedAt || 0
           });
         } catch (e) {
           pList.push({ uid, title: 'Unknown', photoSeed: uid, corrects: 0, wins: 0, joinedAt: 0 });
         }
      }
      pList.sort((a, b) => a.joinedAt - b.joinedAt);
      setPlayers(pList);
    });

    return () => {
      unsub();
      dbSet(presenceRef, null).catch(() => {});
    };
  }, [user, matchId]);

  // CHAT SYSTEM
  useEffect(() => {
    if (!matchId) return;
    const chatRef = dbQuery(dbRef(db, `matches/${matchId}/chat`), dbLimitToLast(50));
    const unsub = dbOnValue(chatRef, (snapshot: any) => {
      const data = snapshot.val();
      if (data) {
        const msgList = Object.entries(data)
          .map(([key, val]: [string, any]) => ({
            id: key,
            ...val
          }))
          .sort((a,b) => a.timestamp - b.timestamp);
        setMessages(msgList);
      } else {
        setMessages([]);
      }
    });
    return () => unsub();
  }, [matchId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isChatOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !user) return;
    const chatRef = dbRef(db, `matches/${matchId}/chat`);
    await dbPush(chatRef, {
      sender: userData?.username || 'Player',
      text: chatInput,
      timestamp: dbServerTimestamp(),
      type: 'user'
    });
    setChatInput('');
  };

  const exitArena = () => navigate('/lobby');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.length > inputValue.length) playTypingSound();
    setInputValue(val);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans text-white bg-[#050914]">
      {/* Background Ambience */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[100px] pointer-events-none bg-emerald-500/5 transition-colors duration-1000"></div>
      
      {/* Mobile Header Controls - Moved down to top-24 to avoid header overlap */}
      <div className="lg:hidden fixed right-4 top-24 flex gap-3 z-40 pointer-events-auto">
         <button onClick={() => setIsChatOpen(!isChatOpen)} className={`p-3 rounded-full border shadow-lg backdrop-blur-sm ${isChatOpen ? 'bg-emerald-600 border-emerald-500' : 'bg-slate-800/80 border-slate-600'}`}>
           <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
         </button>
         <button onClick={exitArena} className="p-3 bg-red-600/20 text-red-400 rounded-full border border-red-500/50 backdrop-blur-sm shadow-lg">
           <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
         </button>
      </div>

      {/* Chat Module (Slide-out) */}
      <div className={`fixed z-50 bg-slate-900/95 backdrop-blur-xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden transition-all duration-300
        ${isChatOpen ? 'right-4 top-40 w-[85vw] h-[40vh] scale-100 opacity-100 pointer-events-auto rounded-2xl' : 'right-4 top-40 w-[85vw] h-[40vh] scale-0 opacity-0 pointer-events-none rounded-2xl'}
        lg:left-4 lg:bottom-4 lg:top-auto lg:right-auto lg:w-80 lg:h-64 lg:rounded-xl lg:scale-100 lg:opacity-100 lg:pointer-events-auto lg:transform-none
      `}>
         <div className="p-2 border-b border-slate-700 bg-black/20 font-bold text-xs">Chat</div>
         <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin scrollbar-thumb-slate-700">
             {messages.map((msg) => (
               <div key={msg.id} className="text-xs break-words">
                  <span className="text-yellow-400 font-bold">[{msg.sender}]:</span> <span className="text-white drop-shadow-md">{msg.text}</span>
               </div>
             ))}
             <div ref={chatEndRef} />
         </div>
         <form onSubmit={handleSendMessage} className="p-2 bg-black/30 border-t border-slate-700">
            <input 
              type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Type..."
              className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white placeholder-slate-400 outline-none focus:border-emerald-500"
            />
         </form>
      </div>

      {/* Player List (Right Side Desktop) */}
      <div className="absolute top-24 right-4 z-10 hidden lg:flex flex-col gap-2 pointer-events-none">
          {players.map((p) => {
             const isActive = p.uid === activePlayerUid;
             return (
               <div key={p.uid} className={`flex items-center gap-2 p-2 rounded-lg backdrop-blur-sm transition-all duration-300 ${isActive ? 'bg-emerald-600/30 border border-emerald-500/50 translate-x-0' : 'bg-slate-900/40 border border-white/5 translate-x-2 opacity-80'}`}>
                  {isActive && <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>}
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.photoSeed}`} className="w-6 h-6 rounded bg-slate-700" alt="p" />
                  <span className={`text-xs font-bold ${isActive ? 'text-white' : 'text-slate-400'}`}>
                    {p.title} {p.uid === user?.uid && '(You)'}
                  </span>
               </div>
             );
          })}
      </div>

      {/* Main Game Arena */}
      <div className={`w-full max-w-xl flex flex-col items-center z-10 transition-all duration-500 p-8 rounded-3xl relative border border-slate-800 bg-slate-900/50 mt-12 lg:mt-0`}>
        
        <button onClick={exitArena} className="hidden lg:block absolute top-4 left-4 p-2 text-red-400 hover:text-red-300 font-bold text-xs uppercase tracking-widest border border-transparent hover:border-red-500/30 rounded">
           Exit
         </button>

         {/* Mobile Player List (Visible at Top of Card) */}
         <div className="lg:hidden w-full flex gap-3 overflow-x-auto pb-4 mb-4 border-b border-slate-800/50">
            {players.map((p) => (
                <div key={p.uid} className={`flex-shrink-0 flex flex-col items-center w-14 ${p.uid === activePlayerUid ? 'opacity-100' : 'opacity-40 grayscale'}`}>
                   <div className={`relative p-0.5 rounded-full ${p.uid === activePlayerUid ? 'bg-emerald-500' : 'bg-transparent'}`}>
                     <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.photoSeed}`} className="w-10 h-10 rounded-full bg-slate-800" alt="p" />
                   </div>
                   <span className="text-[10px] truncate w-full text-center mt-1 font-bold">{p.title.slice(0, 8)}</span>
                </div>
            ))}
         </div>

         {/* Info Badge */}
         <div className="mb-6">
            <span className="bg-slate-800 border border-slate-700 px-3 py-1 rounded text-[10px] font-bold tracking-widest uppercase text-slate-400">
               {gameState.type === 'private' ? `CODE: ${gameState.code}` : `${currentMode.toUpperCase()}`}
            </span>
         </div>

         {/* Turn Status Indicator */}
         <div className="mb-8 text-center min-h-[60px]">
            {isMyTurn ? (
                <div className="animate-bounce">
                    <span className="text-4xl">🫵</span>
                    <h2 className="text-2xl font-black text-emerald-400 uppercase tracking-wider mt-2">
                       {isSolo ? "Solo Practice" : "Your Turn"}
                    </h2>
                </div>
            ) : (
                <div className="opacity-80">
                    <span className="text-4xl grayscale">👀</span>
                    <h2 className="text-xl font-bold text-slate-400 mt-2">
                       {activePlayerName === "Unknown" ? "Synchronizing..." : `Spectating ${activePlayerName}`}
                    </h2>
                </div>
            )}
         </div>

         {/* Timer Bar */}
         <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden mb-8 relative border border-slate-700">
             <div 
               className={`h-full shadow-[0_0_15px_rgba(16,185,129,0.6)] ${timeLeft < 5 ? 'bg-red-500' : 'bg-emerald-500'} transition-all duration-100 ease-linear`}
               style={{ width: `${Math.min(100, (timeLeft / 20) * 100)}%` }} 
             ></div>
         </div>

         {/* Action / Feedback Area */}
         <div className="mb-8 relative min-h-[100px] flex items-center justify-center w-full">
            {isMyTurn ? (
               <div className="flex flex-col items-center gap-4">
                  <button 
                    onClick={() => speak(currentWord, ttsVolume)}
                    className="w-24 h-24 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500 flex items-center justify-center transition-all group cursor-pointer animate-pulse-slow shadow-[0_0_30px_rgba(16,185,129,0.2)]"
                  >
                      <svg className="h-10 w-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                  </button>
                  <p className="text-xs text-slate-400 font-medium bg-slate-900/80 px-3 py-1 rounded-full">{definition.slice(0, 60)}...</p>
               </div>
            ) : (
               <div className="text-slate-500 text-sm font-mono flex flex-col items-center gap-2">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${activePlayerUid || 'unknown'}`} className="w-16 h-16 rounded-full bg-slate-800 border border-slate-600 grayscale opacity-50" alt="Active" />
                  <span>{activePlayerName === "Unknown" ? "Starting game..." : "Waiting for player..."}</span>
               </div>
            )}
            
            {/* Overlay Feedback */}
            {feedback && (
                <div className={`absolute inset-0 flex items-center justify-center bg-slate-900/90 rounded-2xl z-20 backdrop-blur-sm animate-fade-in-up border ${feedback.type === 'success' ? 'border-emerald-500' : 'border-red-500'}`}>
                    <div className={`text-2xl font-black uppercase ${feedback.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                       {feedback.msg}
                    </div>
                </div>
            )}
         </div>

         {/* Input Area */}
         <div className="w-full max-w-lg mb-8">
            <form onSubmit={handleSubmit}>
               <input
                 ref={inputRef}
                 type="text"
                 autoComplete="off"
                 value={inputValue}
                 onChange={handleInputChange}
                 disabled={!isMyTurn}
                 placeholder={isMyTurn ? "Type here..." : "Spectating..."}
                 className="w-full bg-transparent border-b-2 border-slate-700 focus:border-emerald-500 text-center text-4xl sm:text-5xl font-bold text-white outline-none py-4 placeholder:text-slate-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
               />
            </form>
         </div>

      </div>
    </div>
  );
};

export default Play;
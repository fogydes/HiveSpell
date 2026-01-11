import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { wordBank, speak, checkAnswer, fetchDefinition, getTitle, stopAudio } from '../services/gameService';
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

  // Match ID logic: Public = "mode_public", Private = "mode_code"
  const matchId = gameState.type === 'private' && gameState.code 
    ? `${paramMode}_${gameState.code}` 
    : `${paramMode}_public`;

  const [currentMode] = useState(paramMode || 'baby');
  
  // Game Logic State
  const [timeLeft, setTimeLeft] = useState(0);
  const [isInputEnabled, setIsInputEnabled] = useState(false);

  const [currentWord, setCurrentWord] = useState('');
  const [definition, setDefinition] = useState('Waiting for round to start...');
  const [inputValue, setInputValue] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const [activePlayerUid, setActivePlayerUid] = useState<string | null>(null);
  
  // UI States
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [players, setPlayers] = useState<PlayerPresence[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'none' | 'chat' | 'players'>('none');

  const inputRef = useRef<HTMLInputElement>(null);
  const animationFrameRef = useRef<number>(0);
  const joinTimeRef = useRef<number>(Date.now());
  const timerEndRef = useRef<number>(0);

  // TURN LOGIC - Derived State
  const isMyTurn = user && activePlayerUid === user.uid;
  const activePlayerName = players.find(p => p.uid === activePlayerUid)?.title || "Unknown";

  // AUTO-FOCUS / AUDIO TRIGGER
  // When turn changes to me, play audio and focus
  useEffect(() => {
    if (isMyTurn && currentWord) {
       setFeedback(null);
       setInputValue('');
       // 1. Play Audio
       speak(currentWord, ttsVolume);
       // 2. Wait 500ms then Focus
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


  // HOST LOGIC: Heartbeat & Game Coordinator
  // If I am the first player in the list, I am the "Host" responsible for advancing state
  useEffect(() => {
    if (!user || players.length === 0) return;
    
    // Sort players by join time to determine stable host
    // (Existing presence fetch in separate effect sorts by corrects, we might want to respect that or strictly join time)
    // For turn-based, stable order is best. Let's assume `players[0]` is host.
    const isHost = players[0].uid === user.uid;

    if (isHost) {
      const matchStateRef = dbRef(db, `matches/${matchId}/state`);
      
      const checkState = async () => {
         const snap = await dbGet(matchStateRef);
         const state = snap.val() as SharedMatchState;
         const now = Date.now();

         // 1. Initialize if empty
         if (!state) {
            startNewTurn();
            return;
         }

         // 2. Check if current player is invalid (left game)
         const currentPlayerStillHere = players.some(p => p.uid === state.activePlayerUid);
         if (!currentPlayerStillHere) {
            // Force next turn
            advanceTurn(state.activePlayerUid);
            return;
         }

         // 3. Check for Timeout
         if (state.deadline > 0 && now > state.deadline) {
             // Time expired for current player
             // We can trigger a "Fail" message in chat or just skip
             advanceTurn(state.activePlayerUid);
         }
      };

      const interval = setInterval(checkState, 1000);
      return () => clearInterval(interval);
    }
  }, [players, user, matchId]);


  // HOST HELPER: Start New Turn
  const startNewTurn = async () => {
     if (!players.length) return;
     const nextPlayer = players[0].uid; // Default start
     await setNewWord(nextPlayer);
  };

  // HOST HELPER: Advance Turn
  const advanceTurn = async (currentUid: string) => {
     if (!players.length) return;
     
     const currentIndex = players.findIndex(p => p.uid === currentUid);
     const nextIndex = (currentIndex + 1) % players.length;
     const nextPlayerUid = players[nextIndex].uid;

     await setNewWord(nextPlayerUid);
  };

  // HOST HELPER: Pick Word & Update DB
  const setNewWord = async (playerUid: string) => {
     const words = wordBank[currentMode] || wordBank['baby'];
     const randomWord = words[Math.floor(Math.random() * words.length)];
     
     // Calculate deadline: 10s base + length adjustment
     const duration = 5 + Math.ceil(randomWord.length * 1.5); 
     const deadline = Date.now() + (duration * 1000);

     await dbUpdate(dbRef(db, `matches/${matchId}/state`), {
       currentWord: randomWord,
       activePlayerUid: playerUid,
       deadline: deadline,
       lastUpdate: Date.now()
     });
  };

  // LISTENER: Game State (Word, Active Player)
  useEffect(() => {
     const matchStateRef = dbRef(db, `matches/${matchId}/state`);
     const unsub = dbOnValue(matchStateRef, (snap: any) => {
        const state = snap.val() as SharedMatchState;
        if (state) {
           // Only update word if it changed (avoids audio replay loops if logic wasn't guarded)
           if (state.currentWord !== currentWord) {
              setCurrentWord(state.currentWord);
              fetchDefinition(state.currentWord).then(setDefinition);
           }
           
           setActivePlayerUid(state.activePlayerUid);
           
           // Sync Timer
           const remaining = Math.max(0, (state.deadline - Date.now()) / 1000);
           setTimeLeft(remaining);
           // Store deadline locally for animation frame
           timerEndRef.current = state.deadline;
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
  }, [activePlayerUid]); // Restart loop on turn change


  // PLAYER SUBMISSION LOGIC
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMyTurn || !user) return;
    
    // Check Answer
    if (checkAnswer(currentWord, inputValue.trim())) {
       // 1. Reward
       setFeedback({ type: 'success', msg: 'Correct!' });
       playTypingSound(); // Reuse specific sound or add success sound
       
       // Update Stats
       const userRef = dbRef(db, `users/${user.uid}`);
       try {
           const snapshot = await dbGet(userRef);
           const uData = snapshot.val() || {};
           await dbUpdate(userRef, {
             corrects: (uData.corrects || 0) + 1,
             // Simple streak logic for now (could be elaborated)
           });
       } catch (e) {}

       // 2. Advance Turn (If Host, loop handles it. If Client, we can trigger it or wait for host)
       // To ensure responsiveness, the Active Player (who just won) acts as temporary authority to trigger next
       // Or we just update a "result" node that the host watches. 
       // SIMPLEST: Active Player calculates next and updates state directly.
       await advanceTurn(user.uid);

    } else {
       // Wrong
       setFeedback({ type: 'error', msg: 'Incorrect!' });
       // Simple: Pass turn on fail
       await advanceTurn(user.uid);
    }
  };


  // PRESENCE SYSTEM
  useEffect(() => {
    if (!user || !matchId) return;
    
    // Join Lobby
    const presenceRef = dbRef(db, `matches/${matchId}/presence/${user.uid}`);
    dbSet(presenceRef, {
       uid: user.uid,
       joinedAt: dbServerTimestamp()
    }).catch((err: any) => {}); 
    dbOnDisconnect(presenceRef).remove().catch((err: any) => {});

    // Listen to Lobby
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
      // Sort by join time for stable turn order
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
  }, [messages, activeTab]);

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
  const toggleTab = (tab: 'chat' | 'players') => setActiveTab(activeTab === tab ? 'none' : tab);

  const getChatClasses = () => {
    const base = "fixed z-40 bg-slate-900/95 backdrop-blur-xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden transition-all duration-300";
    const mobilePos = "right-4 top-1/2 -translate-y-1/2 w-[85vw] h-[50vh] rounded-2xl origin-right";
    const mobileState = activeTab === 'chat' ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-0 opacity-0 pointer-events-none';
    const desktop = "lg:right-auto lg:left-4 lg:top-1/2 lg:-translate-y-1/2 lg:w-72 lg:h-[60vh] lg:rounded-xl lg:origin-center lg:scale-100 lg:opacity-100 lg:pointer-events-auto";
    return `${base} ${mobilePos} ${mobileState} ${desktop}`;
  };

  const getPlayerListClasses = () => {
    const base = "fixed z-40 bg-slate-900/95 backdrop-blur-xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden transition-all duration-300";
    const mobilePos = "right-4 top-1/2 -translate-y-1/2 w-[85vw] h-[50vh] rounded-2xl origin-right";
    const mobileState = activeTab === 'players' ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-0 opacity-0 pointer-events-none';
    const desktop = "lg:right-4 lg:top-1/2 lg:-translate-y-1/2 lg:w-64 lg:h-[60vh] lg:rounded-xl lg:origin-center lg:scale-100 lg:opacity-100 lg:pointer-events-auto";
    return `${base} ${mobilePos} ${mobileState} ${desktop}`;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.length > inputValue.length) playTypingSound();
    setInputValue(val);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans text-white bg-[#050914]">
      {/* Background Ambience */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[100px] pointer-events-none bg-emerald-500/5 transition-colors duration-1000"></div>
      
      {/* Mobile Controls */}
      <div className="lg:hidden fixed right-4 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-50 pointer-events-auto">
         <button onClick={exitArena} className="p-3 bg-red-600/20 text-red-400 rounded-full border border-red-500/50 backdrop-blur-sm shadow-lg mb-4">
           <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
         </button>
         <button onClick={() => toggleTab('chat')} className={`p-3 rounded-full border shadow-lg backdrop-blur-sm ${activeTab === 'chat' ? 'bg-emerald-600 border-emerald-500' : 'bg-slate-800/80 border-slate-600'}`}>
           <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
         </button>
         <button onClick={() => toggleTab('players')} className={`p-3 rounded-full border shadow-lg backdrop-blur-sm ${activeTab === 'players' ? 'bg-emerald-600 border-emerald-500' : 'bg-slate-800/80 border-slate-600'}`}>
           <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
         </button>
      </div>

      {/* Chat Module */}
      <div className={getChatClasses()}>
         <div className="p-3 border-b border-slate-700 bg-black/20 font-bold text-sm">Hive Chat ({players.length})</div>
         <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-slate-700">
             {messages.map((msg) => (
               <div key={msg.id} className="text-xs break-words">
                  <span className="text-yellow-400 font-bold">[{msg.sender}]:</span> <span className="text-white drop-shadow-md">{msg.text}</span>
               </div>
             ))}
             <div ref={chatEndRef} />
         </div>
         <form onSubmit={handleSendMessage} className="p-3 bg-black/30 border-t border-slate-700">
            <input 
              type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Message..."
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-400 outline-none focus:border-emerald-500"
            />
         </form>
      </div>

      {/* Player List Module (Turn Order) */}
      <div className={getPlayerListClasses()}>
         <div className="p-3 border-b border-slate-700 bg-black/20 font-bold text-sm flex justify-between">
            <span>Turn Order</span>
         </div>
         <div className="flex-1 overflow-y-auto">
            {players.map((p, idx) => {
               const isActive = p.uid === activePlayerUid;
               return (
                  <div key={p.uid} className={`flex items-center gap-3 px-4 py-3 border-b border-slate-800/50 transition-all ${isActive ? 'bg-emerald-600/20 border-l-4 border-l-emerald-500' : ''}`}>
                      <div className="text-xs font-mono text-slate-500 w-4">{idx + 1}</div>
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.photoSeed}`} className="w-8 h-8 rounded bg-slate-700" alt="p" />
                      <div className="flex-1 min-w-0">
                          <div className={`truncate font-bold text-xs ${isActive ? 'text-emerald-400' : 'text-slate-300'}`}>
                             {p.title} {p.uid === user?.uid && '(You)'}
                          </div>
                          {isActive && <div className="text-[10px] text-emerald-500 animate-pulse">SPELLING...</div>}
                      </div>
                  </div>
               );
            })}
         </div>
      </div>

      {/* Main Game Arena */}
      <div className={`w-full max-w-xl flex flex-col items-center z-10 transition-all duration-500 p-8 rounded-3xl relative border border-slate-800 bg-slate-900/50`}>
        
        <button onClick={exitArena} className="hidden lg:block absolute top-4 left-4 p-2 text-red-400 hover:text-red-300 font-bold text-xs uppercase tracking-widest border border-transparent hover:border-red-500/30 rounded">
           Exit
         </button>

         {/* Info Badge */}
         <div className="mb-6">
            <span className="bg-slate-800 border border-slate-700 px-3 py-1 rounded text-[10px] font-bold tracking-widest uppercase text-slate-400">
               {gameState.type === 'private' ? `PRIVATE: ${gameState.code}` : `PUBLIC: ${currentMode}`}
            </span>
         </div>

         {/* Turn Status Indicator */}
         <div className="mb-8 text-center min-h-[60px]">
            {isMyTurn ? (
                <div className="animate-bounce">
                    <span className="text-4xl">🫵</span>
                    <h2 className="text-2xl font-black text-emerald-400 uppercase tracking-wider mt-2">Your Turn</h2>
                </div>
            ) : (
                <div className="opacity-80">
                    <span className="text-4xl grayscale">👀</span>
                    <h2 className="text-xl font-bold text-slate-400 mt-2">
                       It is <span className="text-white">{activePlayerName}'s</span> turn
                    </h2>
                </div>
            )}
         </div>

         {/* Timer Bar */}
         <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden mb-8 relative border border-slate-700">
             <div 
               className={`h-full shadow-[0_0_15px_rgba(16,185,129,0.6)] ${timeLeft < 5 ? 'bg-red-500' : 'bg-emerald-500'} transition-all duration-100 ease-linear`}
               style={{ width: `${Math.min(100, (timeLeft / 20) * 100)}%` }} // Assuming avg 20s max for bar visual
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
               <div className="text-slate-500 text-sm font-mono flex items-center gap-2">
                  <span className="animate-spin">⏳</span> Waiting for player...
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
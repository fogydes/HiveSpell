import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { wordBank, speak, checkAnswer, fetchDefinition, getTitle, MODE_ORDER, stopAudio } from '../services/gameService';
import { db } from '../firebase';
import * as firebaseDatabase from 'firebase/database';
import { MatchState, Player } from '../services/multiplayerService';

// Firebase References (Direct Access)
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
  matchId: string;
  code?: string;
}

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  type: 'user' | 'server';
}

interface WordStat {
  word: string;
  wpm: number;
}

const Play: React.FC = () => {
  const { mode: paramMode } = useParams<{ mode: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const { ttsVolume, playTypingSound } = useSettings();
  
  const gameState = (location.state as GameState);

  // If no matchId (e.g. direct URL visit), kick back to lobby
  useEffect(() => {
    if (!gameState || !gameState.matchId) {
      console.warn("No Match ID found, redirecting to lobby...");
      navigate('/lobby');
    }
  }, [gameState, navigate]);

  // --- Multiplayer & Game State ---
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [myPlayerStatus, setMyPlayerStatus] = useState<'alive' | 'eliminated' | 'spectating'>('spectating');
  
  // Gameplay State (Synced or Local)
  const [timeLeft, setTimeLeft] = useState(10);
  const [totalTime, setTotalTime] = useState(10);
  const [streak, setStreak] = useState(0); // This is GLOBAL streak now
  
  // WPM & Stats State
  const [correctWords, setCorrectWords] = useState<WordStat[]>([]);
  const [startTime, setStartTime] = useState<number | undefined>(undefined);
  const [avgWpm, setAvgWpm] = useState(0);
  const [lastBurstWpm, setLastBurstWpm] = useState(0);
  const [isInputEnabled, setIsInputEnabled] = useState(false);

  const [currentWord, setCurrentWord] = useState('');
  const [definition, setDefinition] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [status, setStatus] = useState<'playing' | 'intermission' | 'speaking'>('playing');
  const [intermissionTime, setIntermissionTime] = useState(10);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  
  // UI States
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [playersList, setPlayersList] = useState<Player[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const joinTimeRef = useRef<number>(Date.now());
  const [activeTab, setActiveTab] = useState<'none' | 'chat' | 'players'>('none');

  const previousWordRef = useRef<string>('');
  const lastSpokenWordRef = useRef<string>('');
  const inputRef = useRef<HTMLInputElement>(null);
  const matchStateRef = useRef<MatchState | null>(null);

  // Sync Match State Ref
  useEffect(() => {
    matchStateRef.current = matchState;
  }, [matchState]);

  const processingRef = useRef(false);
  const timerEndRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);

  // 1. Real-time Match Subscription
  useEffect(() => {
    if (!gameState?.matchId) return;

    const matchRef = dbRef(db, `matches/${gameState.matchId}`);
    const unsubscribe = dbOnValue(matchRef, (snapshot: any) => {
      const val = snapshot.val();
      if (val) {
         setMatchState(val);
         
         // Sync Players List
         const pList: Player[] = val.players ? Object.values(val.players) : [];
         // Sort by join time
         pList.sort((a, b) => a.joinedAt - b.joinedAt);
         setPlayersList(pList);

         // Sync Global Streak & Difficulty
         setStreak(val.streak || 0);
         
         // Sync Status
         if (val.status) setStatus(val.status);

         // Determine MY Status
         if (user && val.players && val.players[user.uid]) {
            const me = val.players[user.uid];
            // If match is 'playing' and I am 'eliminated', I am spectating
            // If match is 'intermission', everyone is waiting (but effectively alive for next round)
            setMyPlayerStatus(me.status);
         }
      } else {
        // Match deleted or invalid
        navigate('/lobby');
      }
    });

    return () => unsubscribe();
  }, [gameState?.matchId, user, navigate]);


  // SESSION STORAGE SYNC
  useEffect(() => {
    if (correctWords.length > 0) {
      // Use match difficulty if available, else param
      const diff = matchState?.difficulty || paramMode || 'baby';
      sessionStorage.setItem("gameData", JSON.stringify({ difficulty: diff, correctWords: correctWords }));
      
      // Calculate Average WPM
      const total = correctWords.reduce((sum, item) => sum + item.wpm, 0);
      setAvgWpm(Math.round(total / correctWords.length));
    }
  }, [correctWords, matchState?.difficulty, paramMode]);

  // AUTO-FOCUS FIX: This effect runs after render, ensuring the input is enabled in the DOM before we focus it
  useEffect(() => {
    if (isInputEnabled && status === 'playing' && inputRef.current) {
      // Immediate attempt
      inputRef.current.focus();
      // Backup attempt to handle any slight render delays
      const timer = setTimeout(() => {
        if(inputRef.current) inputRef.current.focus();
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [isInputEnabled, status]);

  // CHAT SYSTEM (Scoped to Match ID now)
  useEffect(() => {
    if (!gameState?.matchId) return;
    
    // Use matchId for chat room
    const chatRef = dbQuery(dbRef(db, `matches/${gameState.matchId}/chat`), dbLimitToLast(50));
    const unsubscribeChat = dbOnValue(chatRef, (snapshot: any) => {
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
          .filter(msg => msg.timestamp && msg.timestamp >= joinTimeRef.current);
          
        setMessages(msgList);
      } else {
        setMessages([]);
      }
    }, (error: any) => {
      console.warn("Chat listener failed:", error);
      setMessages([{ id: 'sys', sender: 'System', text: 'Chat disconnected', timestamp: Date.now(), type: 'server'}]);
    });

    return () => unsubscribeChat();
  }, [gameState?.matchId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTab]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !user || !gameState?.matchId) return;

    const chatRef = dbRef(db, `matches/${gameState.matchId}/chat`);
    try {
      await dbPush(chatRef, {
        sender: userData?.username || (user.email ? user.email.split('@')[0] : 'Player'),
        text: chatInput,
        timestamp: dbServerTimestamp(),
        type: 'user'
      });
      setChatInput('');
    } catch (e) {
      console.error("Failed to send message:", e);
    }
  };

  const getModeConfig = (mode: string) => {
    switch (mode) {
      case 'baby': return { stars: 6 };
      case 'cakewalk': return { stars: 8 };
      case 'learner': return { stars: 10 };
      case 'intermediate': return { stars: 12 };
      case 'heated': return { stars: 14 };
      case 'genius': return { stars: 16 };
      case 'polymath': return { stars: 18 };
      case 'omniscient': return { stars: 20 };
      default: return { stars: 5 };
    }
  };

  // --- HELPER: Identify Roles ---
  const isGameDriver = React.useMemo(() => {
    if (!matchState || playersList.length === 0) return false;
    // Private: Host is driver
    if (gameState.type === 'private' && gameState.role === 'host') return true;
    // Public: Player 0 (First joiner) is driver
    if (gameState.type === 'public' && user && playersList[0].uid === user.uid) return true;
    return false;
  }, [matchState, playersList, gameState, user]);

  const amIActivePlayer = React.useMemo(() => {
    if (!matchState || !user || playersList.length === 0) return false;
    
    // Debug Difficulty
    if (matchState.difficulty) {
       console.log("Active Difficulty:", matchState.difficulty);
    }

    // Safety check: ensure turnIndex is within bounds
    const safeIndex = (matchState.turnIndex || 0) % playersList.length;
    const activePlayer = playersList[safeIndex];
    return activePlayer && activePlayer.uid === user.uid && activePlayer.status === 'alive';
  }, [matchState, user, playersList]);

  // --- 2. AUDIO & INPUT SYNC (Everyone) ---
  useEffect(() => {
    if (!matchState) return;

    // A. Detect New Word -> Play Audio & Reset Input
    if (matchState.currentWord && matchState.currentWord !== lastSpokenWordRef.current) {
      lastSpokenWordRef.current = matchState.currentWord;
      setCurrentWord(matchState.currentWord); // SYNC LOCAL STATE
      
      // Reset local input for everyone
      setInputValue('');
      setFeedback(null);
      setDefinition('Loading...');
      
      // Fetch Definition (Visual only)
      fetchDefinition(matchState.currentWord).then(setDefinition);

      // Play Audio
      setStatus('speaking');
      speak(matchState.currentWord, ttsVolume).then(() => {
        setStatus('playing');
        // If I am active, I focus. If not, I just watch.
        if (amIActivePlayer) {
           setIsInputEnabled(true);
        }
      });
    }

    // B. Spectator Input Sync
    if (!amIActivePlayer && matchState.currentInput !== undefined) {
       setInputValue(matchState.currentInput);
    }

    // C. Timer Sync
    if (matchState.timerEnd) {
       timerEndRef.current = matchState.timerEnd;
    }

  }, [matchState?.currentWord, matchState?.currentInput, matchState?.timerEnd, amIActivePlayer, ttsVolume]);


  // --- Game Loop Driver (Host or Player 0) ---
  const driverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isGameDriver || !matchState || !gameState.matchId) return;

    // A. INITIALIZE TURN (If currentWord is missing)
    if (matchState.status === 'playing' && !matchState.currentWord) {
        if (processingRef.current) return;
        processingRef.current = true;

        let activeDifficulty = matchState.difficulty || 'baby';
        if (streak >= 25) {
           const idx = MODE_ORDER.indexOf(activeDifficulty);
           if (idx !== -1 && idx < MODE_ORDER.length - 1) {
              activeDifficulty = MODE_ORDER[idx + 1];
           }
        }

        const words = wordBank[activeDifficulty];
        const newWord = words[Math.floor(Math.random() * words.length)];

        const wordLen = newWord.length;
        const decay = Math.max(0.6, 1 - (streak * 0.01));
        const finalTime = Math.max(3, (2.0 + wordLen) * decay);
        const newTimerEnd = Date.now() + (finalTime * 1000) + 1000;

        dbUpdate(dbRef(db, `matches/${gameState.matchId}`), {
           currentWord: newWord,
           timerEnd: newTimerEnd,
           currentInput: '',
           difficulty: activeDifficulty
        }).then(() => processingRef.current = false);
    }

    // B. MONITOR TURN TIMER
    if (matchState.status === 'playing' && matchState.currentWord && matchState.timerEnd) {
       const checkTimeout = () => {
          const now = Date.now();
          if (now > matchState.timerEnd!) {
             // WHO FAILS?
             // If I am the active player, I fail.
             // If someone else is active but dead/gone, I (as Driver) must skip them.
             const safeIndex = (matchState.turnIndex || 0) % playersList.length;
             const activePlayer = playersList[safeIndex];
             
             // Trigger fail/skip
             console.log("Timer expired. Triggering fail for active player.");
             // We'll call passTurn logic here, but we need to know WHO failed.
             // For now, let's just trigger a fail for the active player.
             // Since I am driver, I will update the DB.
             
             const updates: any = {
                turnIndex: (matchState.turnIndex + 1) % playersList.length,
                currentWord: null,
                timerEnd: null,
                currentInput: '',
                streak: 0
             };
             // If the active player was me, set my status
             if (activePlayer?.uid === user?.uid) {
                updates[`players/${user?.uid}/status`] = 'eliminated';
             } else if (activePlayer) {
                updates[`players/${activePlayer.uid}/status`] = 'eliminated';
             }

             // Win Condition Check (Single player logic included)
             const aliveCount = playersList.filter(p => p.status === 'alive').length;
             // If active player just died, they are no longer alive
             if (aliveCount <= 1) {
                updates['status'] = 'intermission';
             }

             dbUpdate(dbRef(db, `matches/${gameState.matchId}`), updates);
          } else {
             const remaining = matchState.timerEnd! - now;
             driverTimeoutRef.current = setTimeout(checkTimeout, remaining + 100);
          }
       };
       checkTimeout();
    }

    return () => { if (driverTimeoutRef.current) clearTimeout(driverTimeoutRef.current); };
  }, [isGameDriver, matchState?.status, matchState?.currentWord, matchState?.timerEnd, streak, playersList, gameState.matchId]);


  // --- Timer Visuals (Everyone) ---
  useEffect(() => {
    const updateTimer = () => {
      if (matchState?.status === 'playing' && matchState.timerEnd) {
        const delta = matchState.timerEnd - Date.now();
        if (delta <= 0) {
          setTimeLeft(0);
        } else {
          setTimeLeft(delta / 1000);
          animationFrameRef.current = requestAnimationFrame(updateTimer);
        }
      }
    };
    if (matchState?.status === 'playing') {
      animationFrameRef.current = requestAnimationFrame(updateTimer);
    }
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [matchState?.status, matchState?.timerEnd, matchState?.currentWord]);

  // --- HANDLERS ---

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    
    // Sync to DB if I am active
    if (amIActivePlayer && gameState.matchId) {
        if (val.length > (matchState?.currentInput || '').length) {
            playTypingSound();
        }
        // Debounce slightly if needed, but for local LAN/fast internet direct is fine
        dbUpdate(dbRef(db, `matches/${gameState.matchId}`), { currentInput: val });
    }
  }

  const passTurn = async (wasEliminated: boolean) => {
     if (!matchState || !gameState.matchId) return;
     
     let nextTurnIndex = (matchState.turnIndex + 1) % playersList.length;
     let loopCount = 0;
     
     // Find next ALIVE player
     while (loopCount < playersList.length) {
        const p = playersList[nextTurnIndex];
        // If I was just eliminated, I am not 'alive' in the local list yet, so logic handles it
        // BUT, we are updating DB.
        
        // We need to know who IS alive.
        // If I was eliminated, I am definitely out.
        // We need to look at OTHER players.
        
        if (p.uid !== user?.uid && p.status === 'alive') {
           break; 
        }
        // If it's me, and I was eliminated, skip me.
        if (p.uid === user?.uid && wasEliminated) {
           nextTurnIndex = (nextTurnIndex + 1) % playersList.length;
           loopCount++;
           continue;
        }
        
        // If it's me and I am alive, I can play again (if solo)
        if (p.uid === user?.uid && !wasEliminated) {
           break;
        }
        
        nextTurnIndex = (nextTurnIndex + 1) % playersList.length;
        loopCount++;
     }

     const updates: any = {
        turnIndex: nextTurnIndex,
        currentWord: null, // Clear word to trigger next turn generation
        timerEnd: null,
        currentInput: ''
     };

     if (wasEliminated) {
        updates[`players/${user?.uid}/status`] = 'eliminated';
        updates['streak'] = 0; // Global reset
     } else {
        updates['streak'] = (matchState.streak || 0) + 1;
     }

     // Win Condition Check:
     // If >1 players: End when 1 alive.
     // If 1 player: End when 0 alive (Solo practice mode)
     const aliveCount = playersList.filter(p => p.status === 'alive').length;
     const effectiveAlive = wasEliminated ? aliveCount - 1 : aliveCount;
     
     if ((playersList.length > 1 && effectiveAlive <= 1) || (playersList.length === 1 && effectiveAlive === 0)) {
        updates['status'] = 'intermission';
     }

     await dbUpdate(dbRef(db, `matches/${gameState.matchId}`), updates);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amIActivePlayer || status !== 'playing') return;
    
    // Debug Log
    console.log(`Checking Answer: Target="${currentWord}", Input="${inputValue.trim()}"`);
    
    if (checkAnswer(currentWord, inputValue.trim())) {
       setFeedback({ type: 'success', msg: 'Correct!' });
       await passTurn(false);
    } else {
       console.warn("Answer Incorrect. Homophones check failed.");
       handleFail("Incorrect.");
    }
  };

  const handleFail = async (msg: string) => {
     if (!amIActivePlayer) return;
     setFeedback({ type: 'error', msg });
     await passTurn(true);
  };

  // --- Intermission & Round Reset Logic ---
  useEffect(() => {
    // Only Game Driver runs this
    if (!matchState || matchState.status !== 'intermission' || !gameState.matchId || !isGameDriver) return;

    const intermissionDuration = 15; // 15 seconds
    
    // 1. Initialize Timer if missing
    if (!matchState.intermissionEndsAt) {
       console.log("Driver: Starting Intermission Timer");
       dbUpdate(dbRef(db, `matches/${gameState.matchId}`), {
          intermissionEndsAt: Date.now() + (intermissionDuration * 1000)
       });
       return;
    }

    // 2. Monitor Timer
    const timer = setInterval(() => {
       const now = Date.now();
       const currentMatch = matchStateRef.current;
       if (currentMatch?.intermissionEndsAt && now > currentMatch.intermissionEndsAt) {
           clearInterval(timer);
           startNewRound();
       }
    }, 1000);

    return () => clearInterval(timer);
  }, [matchState?.status, matchState?.intermissionEndsAt, isGameDriver, gameState.matchId]);

  // --- SYNC INTERMISSION TIMER (Visuals for Everyone) ---
  useEffect(() => {
     if (matchState?.status === 'intermission' && matchState.intermissionEndsAt) {
        const updateVisuals = () => {
           const left = Math.ceil((matchState.intermissionEndsAt! - Date.now()) / 1000);
           setIntermissionTime(Math.max(0, left));
           if (left > 0) requestAnimationFrame(updateVisuals);
        };
        requestAnimationFrame(updateVisuals);
     }
  }, [matchState?.status, matchState?.intermissionEndsAt]);


  const startNewRound = async () => {
     if (!gameState.matchId || !matchState) return;
     
     // REVIVAL LOGIC
     const updates: any = {
        status: 'playing',
        intermissionEndsAt: null,
        currentWord: null, // Triggers active player to pick word
        turnIndex: 0, // Reset turn order
        streak: 0,
        // Reset Difficulty:
        // Private: Use nextRoundDifficulty if set
        // Public: Keep existing difficulty (Do not use paramMode, it corrupts the lobby)
        difficulty: (gameState.type === 'private' && matchState.nextRoundDifficulty) 
                    ? matchState.nextRoundDifficulty 
                    : matchState.difficulty // Keep current
     };

     // Set all players to ALIVE
     playersList.forEach(p => {
        updates[`players/${p.uid}/status`] = 'alive';
     });

     await dbUpdate(dbRef(db, `matches/${gameState.matchId}`), updates);
  };

  const skipIntermission = async () => {
     if (gameState.role === 'host') {
        startNewRound();
     }
  };

  // --- Private Match Settings ---
  const handleModeChange = async (newMode: string) => {
     if (gameState.role !== 'host' || !gameState.matchId) return;
     // Just queue it for next round
     await dbUpdate(dbRef(db, `matches/${gameState.matchId}`), {
        nextRoundDifficulty: newMode
     });
     // Visual feedback locally
     setCurrentMode(newMode);
  };
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

  // --- DEBUG LOADING STATE ---
  if (!matchState) {
     return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
           <div className="text-center">
              <div className="text-2xl font-bold mb-4 text-emerald-500">Entering Hive...</div>
              <div className="text-slate-400 text-xs font-mono">
                 Match ID: {gameState?.matchId || 'None'} <br/>
                 Status: Connecting to Neural Link...
              </div>
           </div>
        </div>
     );
  }

  // --- RENDER HELPERS ---
  const renderStatusMessage = () => {
     if (myPlayerStatus === 'eliminated') {
        return <div className="text-red-500 font-bold text-xl uppercase tracking-widest animate-pulse">Spectating Next Round</div>;
     }
     if (matchState?.status === 'intermission') {
        return <div className="text-yellow-400 font-bold text-xl uppercase tracking-widest">Intermission</div>;
     }
     return null;
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans text-white transition-colors duration-1000 ${streak > 25 ? 'bg-[#1a0505]' : 'bg-[#050914]'}`}>
      <div className={`absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[100px] pointer-events-none transition-all duration-1000 ${streak > 25 ? 'bg-red-600/20' : 'bg-emerald-500/5'}`}></div>
      
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

      <div className={getChatClasses()}>
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

      <div className={getPlayerListClasses()}>
         <div className="p-3 border-b border-slate-700 bg-black/20 font-bold text-sm flex justify-between">
            <span>People ({playersList.length})</span>
         </div>
         <div className="grid grid-cols-[1fr_50px_40px] px-3 py-2 text-[10px] text-slate-400 font-bold uppercase border-b border-slate-700/50">
            <span>Name</span>
            <span className="text-right">Status</span>
         </div>
         <div className="flex-1 overflow-y-auto">
            {playersList.map((p) => (
              <div key={p.uid} className={`grid grid-cols-[1fr_50px_40px] px-3 py-3 text-xs items-center transition-colors border-b border-slate-800/50 ${p.uid === user?.uid ? 'bg-emerald-900/20' : 'hover:bg-white/5'}`}>
                  <div className="flex items-center gap-2 overflow-hidden">
                     {/* Placeholder Avatar */}
                     <div className={`w-2 h-2 rounded-full ${p.status === 'alive' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                     <span className={`truncate font-medium ${p.uid === user?.uid ? 'text-emerald-400' : 'text-white'} ${p.status === 'eliminated' ? 'line-through text-slate-500' : ''}`}>
                       {p.username} {p.uid === user?.uid && '(You)'}
                     </span>
                  </div>
                  <div className={`text-right font-mono ${p.status === 'alive' ? 'text-emerald-400' : 'text-red-500'}`}>{p.status === 'alive' ? 'LIVE' : 'DEAD'}</div>
              </div>
            ))}
         </div>
      </div>

      <div className={`w-full max-w-xl flex flex-col items-center z-10 transition-all duration-500 p-4 sm:p-8 rounded-3xl border border-transparent relative ${getFireIntensity()}`}>
        
        <button 
           onClick={exitArena}
           className="hidden lg:block absolute top-4 left-4 p-2 text-red-400 hover:text-red-300 font-bold text-xs uppercase tracking-widest transition-colors border border-transparent hover:border-red-500/30 rounded"
         >
           Exit Arena
         </button>

        <div className="w-full max-w-lg mb-4 sm:mb-8 text-center min-h-[50px] mt-8">
           {status === 'playing' ? (
             <p className="text-slate-400 text-xs sm:text-sm italic font-serif leading-relaxed px-4 py-2 bg-slate-900/50 rounded-lg border border-slate-800">
               "{definition}"
             </p>
           ) : (
             <div className="h-[50px]">
                {status === 'speaking' && <div className="text-emerald-400 animate-pulse text-sm font-bold tracking-widest">LISTENING TO HIVE...</div>}
                {renderStatusMessage()}
             </div>
           )}
        </div>

        <div className="flex items-center gap-4 mb-4 sm:mb-6">
          <div className="bg-slate-800/80 px-4 py-1 rounded text-xs font-bold tracking-widest uppercase text-emerald-400 border border-slate-700">
             {streak > 25 ? 'RAMPAGE MODE' : (matchState?.difficulty || currentMode)}
          </div>
        </div>

        <div className="w-full flex justify-between items-end mb-2 px-2 text-slate-400 text-[10px] sm:text-xs font-bold tracking-widest">
           <div className="text-center">
             <div className={`text-xl sm:text-2xl mb-1 ${streak > 5 ? 'text-orange-500 animate-pulse' : 'text-white'}`}>
               {streak} {streak > 5 && '🔥'}
             </div>
             <div>STREAK</div>
           </div>
           
           <div className="text-center">
             <div className="text-emerald-400 text-xl sm:text-2xl mb-1 flex flex-col items-center leading-none">
                 <span>{lastBurstWpm}</span>
             </div>
             <div>WPM</div>
           </div>
        </div>

        <div className="w-full text-center text-emerald-400 font-mono text-sm font-bold mb-1">
           {timeLeft.toFixed(1)}s
        </div>

        <div className="w-full h-2 sm:h-3 bg-slate-800 rounded-full overflow-hidden mb-8 relative border border-slate-700">
           <div 
             className={`h-full shadow-[0_0_15px_rgba(16,185,129,0.6)] ${timeLeft < 3 ? 'bg-red-500' : 'bg-emerald-500'}`}
             style={{ width: `${Math.min(100, (timeLeft / totalTime) * 100)}%` }}
           ></div>
        </div>

        <div className="mb-8 relative min-h-[100px] flex items-center justify-center w-full">
           {status !== 'intermission' ? (
             status === 'speaking' ? (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center animate-spin-slow">
                     <span className="text-2xl">🔊</span>
                </div>
             ) : (
               <button 
                 onClick={() => speak(currentWord, ttsVolume)}
                 className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center transition-all group cursor-pointer active:scale-95 animate-pulse-slow"
               >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 sm:h-10 sm:w-10 text-emerald-400 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
               </button>
             )
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
                disabled={!isInputEnabled || status !== 'playing' || myPlayerStatus !== 'alive'} // ONLY ALIVE CAN TYPE
                placeholder={myPlayerStatus === 'alive' ? "Type word..." : "SPECTATING..."}
                className="w-full bg-transparent border-b-2 border-slate-700 focus:border-emerald-500 text-center text-3xl sm:text-5xl font-bold text-white outline-none py-2 sm:py-4 placeholder:text-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
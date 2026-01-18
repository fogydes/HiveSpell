import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { useMultiplayer } from "../context/MultiplayerContext";
import {
  wordBank,
  speak,
  checkAnswer,
  fetchDefinition,
  stopAudio,
  MODE_ORDER,
  getTitle,
} from "../services/gameService";
import { db } from "../firebase";
import * as firebaseDatabase from "firebase/database";
import { Room, Player } from "../types/multiplayer";

// Firebase References (Direct Access)
const dbRef = (firebaseDatabase as any).ref;
const dbUpdate = (firebaseDatabase as any).update;
const dbOnValue = (firebaseDatabase as any).onValue;
const dbPush = (firebaseDatabase as any).push;
const dbServerTimestamp = (firebaseDatabase as any).serverTimestamp;
const dbQuery = (firebaseDatabase as any).query;
const dbLimitToLast = (firebaseDatabase as any).limitToLast;

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  type: "user" | "server";
}

interface WordStat {
  word: string;
  wpm: number;
}

const Play: React.FC = () => {
  const { mode: paramMode } = useParams<{ mode: string }>();
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const { ttsVolume, playTypingSound } = useSettings();
  const {
    currentRoom,
    players: playersList,
    loading: contextLoading,
  } = useMultiplayer();

  // If no room context (user refreshed page or direct link without join), kick back to lobby
  // Use a ref to avoid redirecting immediately on first mount before context syncs
  const hasAttemptedLoadRef = useRef(false);
  useEffect(() => {
    // Don't check on first mount, give context time to sync
    if (!hasAttemptedLoadRef.current) {
      hasAttemptedLoadRef.current = true;
      return;
    }

    // Wait a beat before deciding to redirect (context might be updating)
    if (!contextLoading && !currentRoom) {
      const timer = setTimeout(() => {
        if (!currentRoom) {
          console.warn(
            "No Room Context found after delay, redirecting to lobby...",
          );
          navigate("/lobby");
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentRoom, contextLoading, navigate]);

  // --- Gameplay State ---
  const [timeLeft, setTimeLeft] = useState(10);
  const [totalTime, setTotalTime] = useState(10);
  const [streak, setStreak] = useState(0);

  // WPM & Stats State
  const [correctWords, setCorrectWords] = useState<WordStat[]>([]);
  const [startTime, setStartTime] = useState<number | undefined>(undefined);
  const [avgWpm, setAvgWpm] = useState(0);
  const [lastBurstWpm, setLastBurstWpm] = useState(0);
  const [isInputEnabled, setIsInputEnabled] = useState(false);

  const [currentWord, setCurrentWord] = useState("");
  const [definition, setDefinition] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [status, setStatus] = useState<"playing" | "intermission" | "speaking">(
    "playing",
  );
  const [intermissionTime, setIntermissionTime] = useState(10);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    msg: string;
    typed?: string;
    correct?: string;
  } | null>(null);

  // UI States
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const joinTimeRef = useRef<number>(Date.now());
  const [activeTab, setActiveTab] = useState<"none" | "chat" | "players">(
    "none",
  );

  const lastSpokenWordRef = useRef<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Use currentRoom from context as the source of truth
  const processingRef = useRef(false);
  const timerEndRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);

  // Sync Room State to Local State
  useEffect(() => {
    if (currentRoom) {
      // Sync status from room (don't sync streak - it's local)
      if (currentRoom.status) setStatus(currentRoom.status as any);
    }
  }, [currentRoom]);

  // SESSION STORAGE SYNC
  useEffect(() => {
    if (correctWords.length > 0) {
      const diff = currentRoom?.settings?.difficulty || paramMode || "baby";
      sessionStorage.setItem(
        "gameData",
        JSON.stringify({ difficulty: diff, correctWords: correctWords }),
      );

      const total = correctWords.reduce((sum, item) => sum + item.wpm, 0);
      setAvgWpm(Math.round(total / correctWords.length));
    }
  }, [correctWords, currentRoom?.settings?.difficulty, paramMode]);

  // AUTO-FOCUS
  useEffect(() => {
    if (isInputEnabled && status === "playing" && inputRef.current) {
      inputRef.current.focus();
      const timer = setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [isInputEnabled, status]);

  // CHAT SYSTEM (Scoped to Room ID)
  useEffect(() => {
    if (!currentRoom?.id) return;

    const chatRef = dbQuery(
      dbRef(db, `rooms/${currentRoom.id}/chat`),
      dbLimitToLast(50),
    );
    const unsubscribeChat = dbOnValue(chatRef, (snapshot: any) => {
      const data = snapshot.val();
      if (data) {
        const msgList = Object.entries(data)
          .map(([key, val]: [string, any]) => ({
            id: key,
            sender: val.sender,
            text: val.text,
            timestamp: val.timestamp,
            type: val.type || "user",
          }))
          .filter(
            (msg) => msg.timestamp && msg.timestamp >= joinTimeRef.current,
          );

        setMessages(msgList);
      } else {
        setMessages([]);
      }
    });

    return () => unsubscribeChat();
  }, [currentRoom?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeTab]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !user || !currentRoom?.id) return;

    const chatRef = dbRef(db, `rooms/${currentRoom.id}/chat`);
    try {
      await dbPush(chatRef, {
        sender:
          userData?.username ||
          (user.email ? user.email.split("@")[0] : "Player"),
        text: chatInput,
        timestamp: dbServerTimestamp(),
        type: "user",
      });
      setChatInput("");
    } catch (e) {
      console.error("Failed to send message:", e);
    }
  };

  // --- HELPER: Identify Roles ---
  const isGameDriver = React.useMemo(() => {
    if (!currentRoom || playersList.length === 0) return false;
    // Host is driver
    if (user && currentRoom.hostId === user.uid) {
      console.log("[Driver] I am HOST, so I am driver.");
      return true;
    }
    // Fallback: First joiner is driver
    if (user && playersList[0].id === user.uid) {
      console.log("[Driver] I am FIRST PLAYER, so I am driver.");
      return true;
    }
    return false;
  }, [currentRoom, playersList, user]);

  // Determine MY status from the list
  const myStatus = React.useMemo(() => {
    const me = playersList.find((p) => p.id === user?.uid);
    return me ? me.status : "spectating";
  }, [playersList, user]);

  const amIActivePlayer = myStatus === "alive" || myStatus === "connected";

  // --- AUDIO & INPUT SYNC ---
  useEffect(() => {
    if (!currentRoom?.gameState?.currentWord) return;

    const syncedWord = currentRoom.gameState.currentWord;
    console.log(
      `[Audio] Synced word: "${syncedWord}", Last spoken: "${lastSpokenWordRef.current}"`,
    );

    if (syncedWord !== lastSpokenWordRef.current) {
      console.log(`[Audio] New word detected, will speak: "${syncedWord}"`);
      lastSpokenWordRef.current = syncedWord;
      setCurrentWord(syncedWord);

      setInputValue("");
      setFeedback(null);
      setDefinition("Loading...");
      fetchDefinition(syncedWord).then(setDefinition);

      // Only play audio if we are in 'playing' state or transitioning to it
      if (currentRoom.status === "playing") {
        setStatus("speaking");
        stopAudio();
        speak(syncedWord, ttsVolume).then(() => {
          setTimeout(() => {
            // Check if we are still on the same word before enabling input
            if (lastSpokenWordRef.current === syncedWord) {
              setStatus("playing");
              setIsInputEnabled(true);
              setStartTime(Date.now());
              if (inputRef.current) inputRef.current.focus();
            }
          }, 500);
        });
      }
    }

    // Cleanup to prevent double audio on unmount/re-render
    return () => stopAudio();
  }, [currentRoom?.gameState?.currentWord]);

  // --- SELF-ELIMINATION TIMER (only for current turn player) ---
  const isMyTurn = currentRoom?.gameState?.currentTurnPlayerId === user?.uid;
  useEffect(() => {
    // Only the player whose turn it is should self-eliminate on timeout
    if (!isMyTurn) return;

    if (
      status === "playing" &&
      currentRoom?.gameState?.startTime &&
      (currentRoom.gameState as any).timerDuration
    ) {
      const duration = (currentRoom.gameState as any).timerDuration;
      const start = currentRoom.gameState.startTime;

      const timer = setInterval(() => {
        const now = Date.now();
        const elapsed = (now - start) / 1000;
        const remaining = duration - elapsed;

        if (remaining <= 0) {
          clearInterval(timer);
          // Ensure we only kill alive/connected players
          if (myStatus === "alive" || myStatus === "connected") {
            console.log("[Timer] Time expired. Self-eliminating.");
            handleFail("Time's up!", "", currentRoom.gameState.currentWord);
          }
        }
      }, 100);
      return () => clearInterval(timer);
    }
  }, [isMyTurn, status, currentRoom?.gameState?.startTime, myStatus]);

  // --- INTERMISSION COUNTDOWN (UI) ---
  useEffect(() => {
    if (
      currentRoom?.status === "intermission" &&
      currentRoom.intermissionEndsAt
    ) {
      const interval = setInterval(() => {
        const remaining = Math.ceil(
          (currentRoom.intermissionEndsAt - Date.now()) / 1000,
        );
        setIntermissionTime(Math.max(0, remaining));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [currentRoom?.status, currentRoom?.intermissionEndsAt]);

  // Reset streak when new round starts (after intermission ends)
  const prevStatusRef = useRef(currentRoom?.status);
  useEffect(() => {
    const prevStatus = prevStatusRef.current;
    const newStatus = currentRoom?.status;

    // If we just transitioned from intermission to playing, reset streak
    if (prevStatus === "intermission" && newStatus === "playing") {
      console.log("[Streak] New round started, resetting streak");
      setStreak(0);
    }

    prevStatusRef.current = newStatus;
  }, [currentRoom?.status]);

  // --- Game Loop Driver (Host/Driver ONLY) ---
  useEffect(() => {
    if (!isGameDriver || !currentRoom || !currentRoom.id) return;

    console.log(
      "[Driver] Effect running. Status:",
      currentRoom.status,
      "Word:",
      currentRoom.gameState?.currentWord,
    );

    // 0. If status is "waiting", transition to "playing"
    if (currentRoom.status === "waiting") {
      console.log("[Driver] Transitioning from 'waiting' to 'playing'...");
      dbUpdate(dbRef(db, `rooms/${currentRoom.id}`), { status: "playing" })
        .then(() => console.log("[Driver] Status set to playing."))
        .catch((err) => console.error("[Driver] Failed to set status:", err));
      return; // Wait for subscription to update
    }

    // A. Start New Round / Next Word
    if (
      currentRoom.status === "playing" &&
      !currentRoom.gameState?.currentWord
    ) {
      if (processingRef.current) {
        console.log("[Driver] Already processing, skipping.");
        return;
      }
      processingRef.current = true;

      const difficulty =
        currentRoom.settings?.difficulty || paramMode || "baby";
      console.log("[Driver] Setting new word for difficulty:", difficulty);
      const words = wordBank[difficulty];
      const newWord = words[Math.floor(Math.random() * words.length)];

      const wordLen = newWord.length;
      const decay = 1.0;
      const finalTime = Math.max(5, (2.0 + wordLen) * decay);
      const startTime = Date.now();

      // Calculate turn order: alive/connected players, sorted by join time (using player index as proxy)
      // In Firebase, player iteration order is typically insertion order
      const alivePlayers = playersList.filter(
        (p) => p.status === "alive" || p.status === "connected",
      );
      const turnOrder = alivePlayers.map((p) => p.id);
      const firstTurnPlayer = turnOrder[0] || null;

      console.log(
        "[Driver] Turn order:",
        turnOrder,
        "First turn:",
        firstTurnPlayer,
      );

      dbUpdate(dbRef(db, `rooms/${currentRoom.id}/gameState`), {
        currentWord: newWord,
        startTime: startTime,
        timerDuration: finalTime,
        turnOrder: turnOrder,
        currentTurnPlayerId: firstTurnPlayer,
        currentInput: "",
      })
        .then(() => {
          console.log("[Driver] Word set:", newWord);
          processingRef.current = false;
        })
        .catch((err) => {
          console.error("[Driver] Failed to set word:", err);
          processingRef.current = false;
        });
    }

    // B. Handle Intermission End with Robust Scheduling
    if (
      currentRoom.status === "intermission" &&
      currentRoom.intermissionEndsAt
    ) {
      const now = Date.now();
      const timeRemaining = currentRoom.intermissionEndsAt - now;

      console.log(
        "[Driver] Intermission detected. EndsAt:",
        currentRoom.intermissionEndsAt,
        "Now:",
        now,
        "TimeRemaining:",
        timeRemaining,
      );

      const restartRound = () => {
        console.log("[Driver] Intermission Over. Starting new round.");
        const updates: any = {
          status: "playing",
          intermissionEndsAt: null,
          gameState: {
            currentWord: null, // this will trigger logic A above
            currentWordIndex: 0,
            startTime: 0,
          },
        };

        // REVIVE ALL LOGIC
        playersList.forEach((p) => {
          updates[`players/${p.id}/status`] = "alive";
        });

        dbUpdate(dbRef(db, `rooms/${currentRoom.id}`), updates);
      };

      // Minimum 1 second delay to prevent race conditions
      const safeTimeRemaining = Math.max(timeRemaining, 1000);
      console.log(
        "[Driver] Setting intermission timeout for:",
        safeTimeRemaining,
        "ms",
      );
      const timerId = setTimeout(restartRound, safeTimeRemaining);
      return () => clearTimeout(timerId);
    }
  }, [
    isGameDriver,
    currentRoom?.status,
    currentRoom?.gameState?.currentWord,
    currentRoom?.intermissionEndsAt,
  ]);

  // Visual Timer (UI Only)
  // Visual Timer (UI Only)
  useEffect(() => {
    // Stop the timer if I am eliminated to show exact time of death
    if (myStatus === "eliminated") return;

    if (
      currentRoom?.gameState?.startTime &&
      (currentRoom.gameState as any).timerDuration
    ) {
      const duration = (currentRoom.gameState as any).timerDuration;
      const start = currentRoom.gameState.startTime;

      const update = () => {
        const elapsed = (Date.now() - start) / 1000;
        const remaining = Math.max(0, duration - elapsed);
        setTimeLeft(remaining);
        setTotalTime(duration);
        if (remaining > 0)
          animationFrameRef.current = requestAnimationFrame(update);
      };
      update();
    }
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [currentRoom?.gameState?.startTime, myStatus]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    if (val.length > inputValue.length) playTypingSound();

    // Sync typing to Firebase if it's my turn
    if (isMyTurn && currentRoom?.id) {
      dbUpdate(dbRef(db, `rooms/${currentRoom.id}/gameState`), {
        currentInput: val,
      }).catch(() => {}); // Silent fail for typing sync
    }
  };

  // Subscribe to synced input from other players (when not my turn)
  const syncedInput = currentRoom?.gameState?.currentInput || "";

  const passingTurnRef = useRef(false);
  const passTurn = async (wasEliminated: boolean) => {
    if (!currentRoom?.id) return;
    // Guard: prevent double-trigger
    if (passingTurnRef.current) {
      console.warn("[PassTurn] Already in progress, skipping.");
      return;
    }
    passingTurnRef.current = true;
    const roomId = currentRoom.id;

    console.log(`[PassTurn] Eliminated: ${wasEliminated}`);

    const updates: any = {
      "gameState/currentInput": "", // Clear typing
    };

    // Solo mode: trigger intermission on failure (15 sec break)
    const isSoloMode = playersList.length === 1;
    if (isSoloMode && wasEliminated) {
      console.log("[PassTurn] Solo mode - triggering intermission");
      updates["status"] = "intermission";
      updates["intermissionEndsAt"] = Date.now() + 15000; // 15 second break
      updates["gameState/currentWord"] = null;
      updates["gameState/startTime"] = null;
      updates["gameState/timerDuration"] = null;
      // Mark player as needing revive (will be revived by intermission handler)
      if (user?.uid) {
        updates[`players/${user.uid}/status`] = "eliminated";
      }
      await dbUpdate(dbRef(db, `rooms/${roomId}`), updates);
      passingTurnRef.current = false;
      return; // Exit early for solo mode
    }

    // Mark eliminated if wrong/timeout (multiplayer only)
    if (wasEliminated) {
      if (user?.uid) {
        updates[`players/${user.uid}/status`] = "eliminated";
      }
    } else {
      // Increment Room Score for correct answer
      if (user?.uid) {
        const currentScore =
          playersList.find((p) => p.id === user.uid)?.score || 0;
        updates[`players/${user.uid}/score`] = currentScore + 1;
      }
    }

    // Calculate next turn
    const turnOrder = currentRoom.gameState?.turnOrder || [];
    const currentTurn = currentRoom.gameState?.currentTurnPlayerId;
    const currentIndex = turnOrder.indexOf(currentTurn || "");

    // Get alive players after this action (exclude eliminated player if applicable)
    const aliveAfterThis = playersList.filter(
      (p) =>
        (p.status === "alive" || p.status === "connected") &&
        !(wasEliminated && p.id === user?.uid),
    );

    console.log(
      "[PassTurn] Alive after this:",
      aliveAfterThis.map((p) => p.id),
    );

    console.log(
      "[PassTurn] Win check: aliveAfterThis.length =",
      aliveAfterThis.length,
      "playersList.length =",
      playersList.length,
    );

    // Win Condition: only one player left AND there were multiple players
    if (aliveAfterThis.length <= 1 && playersList.length > 1) {
      console.log("[PassTurn] Triggering intermission!");
      updates["status"] = "intermission";
      updates["intermissionEndsAt"] = Date.now() + 15000;
      updates["gameState/currentWord"] = null;
      updates["gameState/currentTurnPlayerId"] = null;

      // Award win to survivor
      if (aliveAfterThis.length === 1) {
        const winner = aliveAfterThis[0];
        console.log("[PassTurn] Winner:", winner.name);
        // Award win (side effect)
        (firebaseDatabase as any).runTransaction(
          dbRef(db, `users/${winner.id}/wins`),
          (current: any) => (current || 0) + 1,
        );
      }
    } else {
      // Find next player in turn order who is still alive
      let nextIndex = (currentIndex + 1) % turnOrder.length;
      let attempts = 0;
      let nextPlayerId = currentTurn; // default to same player

      while (attempts < turnOrder.length) {
        const candidateId = turnOrder[nextIndex];
        const candidate = aliveAfterThis.find((p) => p.id === candidateId);
        if (candidate) {
          nextPlayerId = candidateId;
          break;
        }
        nextIndex = (nextIndex + 1) % turnOrder.length;
        attempts++;
      }

      console.log("[PassTurn] Next turn:", nextPlayerId, "Was:", currentTurn);
      updates["gameState/currentTurnPlayerId"] = nextPlayerId;

      // If we're cycling back to the same player (solo OR full rotation), get NEW word
      // Also reset word if correct answer to avoid same word twice
      if (
        !wasEliminated &&
        (nextPlayerId === currentTurn || aliveAfterThis.length === 1)
      ) {
        console.log(
          "[PassTurn] Same player or solo - resetting word for new round",
        );
        updates["gameState/currentWord"] = null; // Will trigger driver to pick new word
        updates["gameState/startTime"] = null;
        updates["gameState/timerDuration"] = null;
      }
    }

    await dbUpdate(dbRef(db, `rooms/${roomId}`), updates);
    passingTurnRef.current = false;

    // PERFORM LIFETIME CORRECTS + STARS UPDATE (if correct answer)
    if (!wasEliminated && user?.uid) {
      // Calculate stars based on difficulty
      const difficultyStars: Record<string, number> = {
        baby: 6,
        cakewalk: 8,
        learner: 10,
        intermediate: 12,
        heated: 14,
        genius: 16,
        omniscient: 18,
      };
      const difficulty =
        currentRoom.settings?.difficulty?.toLowerCase() || "baby";
      const starsToAdd = difficultyStars[difficulty] || 6;

      console.log(
        `[Stats] Adding ${starsToAdd} stars for difficulty: ${difficulty}`,
      );

      // Use namespace import for transaction
      (
        (firebaseDatabase as any).runTransaction(
          dbRef(db, `users/${user.uid}`),
          (userDoc: any) => {
            if (userDoc) {
              userDoc.corrects = (userDoc.corrects || 0) + 1;
              userDoc.stars = (userDoc.stars || 0) + starsToAdd;
              userDoc.title = getTitle(userDoc.corrects, userDoc.wins || 0);
            } else {
              return {
                corrects: 1,
                wins: 0,
                stars: starsToAdd,
                title: getTitle(1, 0),
                username: user.displayName || "Player",
              };
            }
            return userDoc;
          },
        ) as Promise<any>
      )
        .then((res: any) => {
          if (res.committed) {
            console.log("Lifetime Stats Updated:", res.snapshot.val());
          }
        })
        .catch((err: any) =>
          console.error("Lifetime Transaction Failed:", err),
        );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status !== "playing") return;

    // Only allow submit if it's my turn
    const isMyTurn = currentRoom?.gameState?.currentTurnPlayerId === user?.uid;
    if (!isMyTurn) {
      console.warn("[Submit] Not my turn, ignoring.");
      return;
    }

    if (checkAnswer(currentWord, inputValue.trim())) {
      // --- BURST WPM CALCULATION ---
      if (startTime) {
        const now = Date.now();
        const timeTakenMs = now - startTime;
        const timeInMinutes = Math.max(timeTakenMs, 1) / 60000;

        const wordLength = currentWord.length;
        const normalizedWordCount = wordLength / 4;

        const wpm = Math.round(normalizedWordCount / timeInMinutes);

        setLastBurstWpm(wpm);
        setCorrectWords((prev) => [...prev, { word: currentWord, wpm }]);
      }

      setFeedback({ type: "success", msg: "Correct!" });
      setStreak((prev) => prev + 1);
      await passTurn(false); // Advances turn to next player (same word)
    } else {
      console.warn("Incorrect Answer");
      handleFail("Incorrect!", inputValue, currentWord);
    }
  };

  const handleFail = async (msg: string, typed?: string, correct?: string) => {
    // if (!amIActivePlayer) return; // Removed strict check for now to ensure fail logic runs
    console.log(`[Death] ${msg}`);

    setFeedback({ type: "error", msg, typed, correct });
    await passTurn(true);
  };

  const exitArena = () => navigate("/lobby");

  const toggleTab = (tab: "chat" | "players") => {
    setActiveTab(activeTab === tab ? "none" : tab);
  };

  const getChatClasses = () => {
    const base =
      "fixed z-40 bg-slate-900/95 backdrop-blur-xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden transition-all duration-300";
    const mobilePos =
      "right-4 top-1/2 -translate-y-1/2 w-[85vw] h-[50vh] rounded-2xl origin-right";
    const mobileState =
      activeTab === "chat"
        ? "scale-100 opacity-100 pointer-events-auto"
        : "scale-0 opacity-0 pointer-events-none";
    const desktop =
      "lg:right-auto lg:left-4 lg:top-1/2 lg:-translate-y-1/2 lg:w-72 lg:h-[60vh] lg:rounded-xl lg:origin-center lg:scale-100 lg:opacity-100 lg:pointer-events-auto";
    return `${base} ${mobilePos} ${mobileState} ${desktop}`;
  };

  const getPlayerListClasses = () => {
    const base =
      "fixed z-40 bg-slate-900/95 backdrop-blur-xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden transition-all duration-300";
    const mobilePos =
      "right-4 top-1/2 -translate-y-1/2 w-[85vw] h-[50vh] rounded-2xl origin-right";
    const mobileState =
      activeTab === "players"
        ? "scale-100 opacity-100 pointer-events-auto"
        : "scale-0 opacity-0 pointer-events-none";
    const desktop =
      "lg:right-4 lg:top-1/2 lg:-translate-y-1/2 lg:w-64 lg:h-[60vh] lg:rounded-xl lg:origin-center lg:scale-100 lg:opacity-100 lg:pointer-events-auto";
    return `${base} ${mobilePos} ${mobileState} ${desktop}`;
  };

  const getFireIntensity = () => {
    if (streak > 25)
      return "bg-red-900/40 border-red-500 shadow-[0_0_50px_rgba(220,38,38,0.5)]";
    if (streak > 10) return "bg-orange-900/30 border-orange-500";
    if (streak > 5) return "bg-yellow-900/20";
    return "";
  };

  const renderWordCorrection = () => {
    if (feedback?.type === "error" && feedback.correct) {
      return (
        <div
          onClick={() => setFeedback(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
        >
          <div className="bg-[#111] border-2 border-slate-700 rounded-xl p-8 shadow-2xl max-w-2xl w-full mx-4 flex flex-col gap-6 transform scale-100 cursor-default">
            <h2 className="font-mono font-black text-3xl text-center text-white mb-2 uppercase tracking-[0.2em] drop-shadow-md">
              Word Correction
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* INCORRECT SIDE */}
              <div className="bg-[#2a1212] border-2 border-red-900/50 rounded-lg p-6 flex flex-col items-center gap-3 shadow-inner">
                <span className="text-xs text-red-300/80 font-bold uppercase tracking-widest">
                  Your Spelling:
                </span>
                <span className="text-red-500 font-black text-3xl font-mono tracking-wide break-all text-center">
                  {feedback.typed || "---"}
                </span>
              </div>

              {/* CORRECT SIDE */}
              <div className="bg-[#122a18] border-2 border-green-900/50 rounded-lg p-6 flex flex-col items-center gap-3 shadow-inner">
                <span className="text-xs text-green-300/80 font-bold uppercase tracking-widest">
                  Correct Word:
                </span>
                <span className="text-green-400 font-black text-3xl font-mono tracking-wide break-all text-center">
                  {feedback.correct}
                </span>
              </div>
            </div>

            <div className="mt-2 text-center text-slate-500 text-sm font-mono">
              (Click anywhere to dismiss)
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderStatusMessage = () => {
    if (currentRoom?.status === "intermission") {
      return (
        <div className="text-white font-bold text-xl uppercase tracking-widest">
          Intermission
        </div>
      );
    }
    return null;
  };

  if (!currentRoom)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-emerald-500">
        Connecting...
      </div>
    );

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans text-white transition-colors duration-1000 ${streak > 25 ? "bg-[#1a0505]" : "bg-[#050914]"}`}
    >
      {renderWordCorrection()}

      <div
        className={`absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[100px] pointer-events-none transition-all duration-1000 ${streak > 25 ? "bg-red-600/20" : "bg-emerald-500/5"}`}
      ></div>

      <div className="lg:hidden fixed right-4 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-50 pointer-events-auto">
        <button
          onClick={exitArena}
          className="p-3 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-full border border-red-500/50 backdrop-blur-sm transition-all shadow-lg mb-4"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
        </button>
        <button
          onClick={() => toggleTab("chat")}
          className={`p-3 rounded-full border shadow-lg backdrop-blur-sm transition-all ${activeTab === "chat" ? "bg-emerald-600 border-emerald-500" : "bg-slate-800/80 border-slate-600"}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </button>
        <button
          onClick={() => toggleTab("players")}
          className={`p-3 rounded-full border shadow-lg backdrop-blur-sm transition-all ${activeTab === "players" ? "bg-emerald-600 border-emerald-500" : "bg-slate-800/80 border-slate-600"}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        </button>
      </div>

      <div className={getChatClasses()}>
        <div className="p-3 border-b border-slate-700 bg-black/20 font-bold text-sm">
          Hive Chat
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-slate-700">
          {messages.length === 0 && (
            <div className="text-xs text-slate-500 text-center mt-4">
              Welcome to the chat!
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className="text-xs break-words">
              {msg.type === "server" ? (
                <span className="text-red-400 font-bold">
                  [Server] {msg.text}
                </span>
              ) : (
                <>
                  <span className="text-yellow-400 font-bold">
                    [{msg.sender}]:
                  </span>{" "}
                  <span className="text-white drop-shadow-md">{msg.text}</span>
                </>
              )}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <form
          onSubmit={handleSendMessage}
          className="p-3 bg-black/30 border-t border-slate-700"
        >
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
          <span>
            People (
            {playersList.filter((p) => p.status !== "disconnected").length})
          </span>
        </div>
        <div className="grid grid-cols-[1fr_50px_40px] px-3 py-2 text-[10px] text-slate-400 font-bold uppercase border-b border-slate-700/50">
          <span>Name</span>
          <span className="text-center">Corrects</span>
          <span className="text-right">Wins</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {playersList
            .filter((p) => p.status !== "disconnected")
            .map((p) => (
              <div
                key={p.id}
                className={`grid grid-cols-[1fr_50px_40px] px-3 py-3 text-xs items-center transition-colors border-b border-slate-800/50 ${p.id === user?.uid ? "bg-emerald-900/20" : "hover:bg-white/5"} ${p.id === currentRoom?.gameState?.currentTurnPlayerId ? "ring-1 ring-emerald-500" : ""}`}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  {/* Placeholder Avatar */}
                  <div
                    className={`w-2 h-2 rounded-full ${p.status === "alive" || p.status === "connected" ? "bg-emerald-500" : "bg-red-500"}`}
                  ></div>
                  <span
                    className={`truncate font-medium ${p.id === user?.uid ? "text-emerald-400" : "text-white"} ${p.status === "eliminated" ? "line-through text-slate-500" : ""}`}
                  >
                    {p.name}
                  </span>
                </div>
                <div className="text-center font-mono text-emerald-400">
                  {p.score || 0}
                </div>
                <div className="text-right font-mono text-yellow-400">
                  {p.wins || 0}
                </div>
              </div>
            ))}
        </div>
      </div>

      <div
        className={`w-full max-w-xl flex flex-col items-center z-10 transition-all duration-500 p-4 sm:p-8 rounded-3xl border border-transparent relative ${getFireIntensity()}`}
      >
        <button
          onClick={exitArena}
          className="hidden lg:block absolute top-4 left-4 p-2 text-red-400 hover:text-red-300 font-bold text-xs uppercase tracking-widest transition-colors border border-transparent hover:border-red-500/30 rounded"
        >
          Exit Arena
        </button>

        <div className="w-full max-w-lg mb-4 sm:mb-8 text-center min-h-[50px] mt-8">
          {status === "playing" ? (
            <p className="text-slate-400 text-xs sm:text-sm italic font-serif leading-relaxed px-4 py-2 bg-slate-900/50 rounded-lg border border-slate-800">
              "{definition}"
            </p>
          ) : (
            <div className="h-[50px]">
              {status === "speaking" && (
                <div className="text-emerald-400 animate-pulse text-sm font-bold tracking-widest">
                  LISTENING TO HIVE...
                </div>
              )}
              {renderStatusMessage()}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 mb-4 sm:mb-6">
          <div className="bg-slate-800/80 px-4 py-1 rounded text-xs font-bold tracking-widest uppercase text-emerald-400 border border-slate-700">
            {streak > 25
              ? "RAMPAGE MODE"
              : currentRoom?.settings?.difficulty || paramMode}
          </div>
        </div>

        <div className="w-full flex justify-between items-end mb-2 px-2 text-slate-400 text-[10px] sm:text-xs font-bold tracking-widest">
          <div className="text-center">
            <div
              className={`text-xl sm:text-2xl mb-1 ${streak > 5 ? "text-orange-500 animate-pulse" : "text-white"}`}
            >
              {streak} {streak > 5 && "🔥"}
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
            className={`h-full shadow-[0_0_15px_rgba(16,185,129,0.6)] ${timeLeft < 3 ? "bg-red-500" : "bg-emerald-500"}`}
            style={{ width: `${Math.min(100, (timeLeft / totalTime) * 100)}%` }}
          ></div>
        </div>

        <div className="mb-8 relative min-h-[100px] flex items-center justify-center w-full">
          {status !== "intermission" ? (
            status === "speaking" ? (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center animate-spin-slow">
                <span className="text-2xl">🔊</span>
              </div>
            ) : (
              <button
                onClick={() => speak(currentWord, ttsVolume)}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center transition-all group cursor-pointer active:scale-95 animate-pulse-slow"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 sm:h-10 sm:w-10 text-emerald-400 group-hover:scale-110 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  />
                </svg>
              </button>
            )
          ) : (
            <div className="flex flex-col items-center bg-slate-900/90 p-4 rounded-xl border border-slate-700 shadow-xl z-20 w-full max-w-sm">
              {/* Legacy feedback removed in favor of Modal */}
              <div className="text-slate-400 text-sm mb-4">
                Next word in{" "}
                <span className="text-white font-bold">{intermissionTime}</span>
                ...
              </div>
              {!feedback?.msg && (
                <div className="text-3xl animate-bounce">⏳</div>
              )}
            </div>
          )}
        </div>

        <div className="w-full max-w-lg mb-8 sm:mb-12">
          <div className="text-center text-slate-500 text-[10px] font-bold tracking-[0.2em] mb-2 sm:mb-4">
            {isMyTurn
              ? "TYPE THE WORD YOU HEAR"
              : `WATCHING ${playersList.find((p) => p.id === currentRoom?.gameState?.currentTurnPlayerId)?.name || "..."}`}
          </div>
          <form onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              id="spelling-input"
              type="text"
              autoComplete="off"
              autoFocus
              value={isMyTurn ? inputValue : syncedInput}
              onChange={handleInputChange}
              disabled={
                !isMyTurn ||
                !isInputEnabled ||
                status !== "playing" ||
                myStatus === "eliminated"
              }
              placeholder={
                myStatus === "eliminated"
                  ? "ELIMINATED"
                  : !isMyTurn
                    ? "Watching..."
                    : "Type word..."
              }
              className={`w-full bg-transparent border-b-2 ${isMyTurn ? "border-emerald-500" : "border-slate-700"} text-center text-3xl sm:text-5xl font-bold ${isMyTurn ? "text-white" : "text-slate-400"} outline-none py-2 sm:py-4 placeholder:text-slate-800 transition-colors disabled:opacity-70 disabled:cursor-not-allowed`}
            />
          </form>
        </div>

        {currentRoom.type === "private" && (
          <div className="absolute top-20 right-6 flex flex-col items-end gap-2">
            <span className="text-[10px] text-slate-600">
              CODE: {currentRoom.code}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Play;

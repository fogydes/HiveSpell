import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { useMultiplayer } from "../context/MultiplayerContext";
import { leaveRoom } from "../services/multiplayerService";
import { saveLastPlayedMode } from "./Home";
import {
  speak,
  checkAnswer,
  fetchDefinition,
  primeWordAudio,
  stopAudio,
} from "../services/gameService";
import i18n from "../i18n";
import { type LocaleId } from "../data/localization";
import { db } from "../firebase";
import {
  ref as dbRef,
  update as dbUpdate,
} from "firebase/database";
import { ProfileModal } from "../components/ProfileModal";
import GameplayStage from "../components/play/GameplayStage";
import MobilePlayActions from "../components/play/MobilePlayActions";
import PlayerListPanel from "../components/play/PlayerListPanel";
import RoomChatPanel from "../components/play/RoomChatPanel";
import WordCorrectionModal from "../components/play/WordCorrectionModal";
import { usePlayRoundTimers } from "../hooks/usePlayRoundTimers";
import { useRoomChat } from "../hooks/useRoomChat";
import { usePlayRoomLifecycle } from "../hooks/usePlayRoomLifecycle";
import { useWinnerAward } from "../hooks/useWinnerAward";
import { usePlayDriver } from "../hooks/usePlayDriver";
import { usePlayTurn } from "../hooks/usePlayTurn";
import { useGameplayEvents, useOnGameplayEvent } from "../hooks/useGameplayEvents";
import { useSessionState } from "../hooks/useSessionState";
import { useBattlePass } from "../hooks/useBattlePass";
import { useChallengeProgress } from "../hooks/useChallenges";
import { useLeaderboardStats } from "../hooks/useLeaderboards";
import { useCompetitiveIntegrity } from "../hooks/useCompetitiveIntegrity";
import { useReplayCreator } from "../hooks/useReplayCreator";
import {
  WordReveal,
  SuccessTheater,
  FailureTheater,
  TurnTransition,
  VictorySequence,
  IntermissionCard,
  StreakMilestone,
} from "../components/theater";
import {
  getChatPanelClasses,
  getPlayerPanelClasses,
  PlayPanelTab,
} from "../services/playPanelUtils";

interface WordStat {
  word: string;
  wpm: number;
}

const Play: React.FC = () => {
  const { mode: paramMode } = useParams<{ mode: string }>();
  const navigate = useNavigate();
  const { user, userData, refreshUser } = useAuth();
  const { ttsVolume, playTypingSound } = useSettings();
  const locale = i18n.language as LocaleId;
  const {
    currentRoom,
    players: playersList,
    loading: contextLoading,
    startGameRoom,
  } = useMultiplayer();

  const { recordGamePlayed } = useSessionState();
  const { addXp } = useBattlePass();
  const { recordCorrectWord, recordGameStart, recordGameEnd } = useChallengeProgress(user?.uid || null);
  const { incrementDailyStats, incrementModeStats } = useLeaderboardStats(user?.uid || null);
  const {
    enableKeystrokeLogging,
    disableKeystrokeLogging,
    startWord,
    recordKeystroke,
    submitKeystrokeLog,
    verifyKeystrokeLog,
    updateRankedRating
  } = useCompetitiveIntegrity();

  // Determine if this is a ranked game (must be before useReplayCreator)
  const isRanked = window.location.search.includes("ranked=true");

  // Replay Creator - records game events for post-game replay playback
  const {
    recordGameStart: recordReplayGameStart,
    recordTurnStart,
    recordTurnEnd,
    recordWordSpoken,
    recordWordCorrect,
    recordWordIncorrect,
    recordPlayerEliminated,
    recordGameEnd: recordReplayGameEnd,
  } = useReplayCreator({
    roomId: currentRoom?.id || null,
    userId: user?.uid || null,
    isRanked,
    mode: paramMode || 'baby',
    seasonId: isRanked ? '2026-s1' : null,
    currentRoom,
  });

  // --- HELPER: Identify Roles ---
  // isGameDriver is now isLocalDriver - for optimistic UI only
  // Server is authoritative via Supabase RPCs (Validated Driver pattern)
  // Only the "driver" client calls RPCs; all clients receive updates via Supabase Realtime
  const isLocalDriver = React.useMemo(() => {
    if (!currentRoom || playersList.length === 0 || !user) return false;

    // During intermission, eliminated players can also be driver (to restart the round)
    const isIntermission = currentRoom.status === "intermission";

    // Check if host is still in the game (connected, alive, or eliminated but not disconnected)
    const host = playersList.find((p) => p.id === currentRoom.hostId);
    const hostIsActive =
      host &&
      (host.status === "connected" ||
        host.status === "alive" ||
        (isIntermission && host.status === "eliminated"));

    // If host is active and I am the host, I am driver
    if (hostIsActive && currentRoom.hostId === user.uid) {
      console.log("[Driver] I am HOST and active, so I am local driver (optimistic UI).");
      return true;
    }

    // If host is not active, first ACTIVE player becomes driver (host migration)
    if (!hostIsActive) {
      // During intermission, include eliminated players in the pool
      const activePlayers = playersList.filter(
        (p) =>
          p.status === "connected" ||
          p.status === "alive" ||
          (isIntermission && p.status === "eliminated"),
      );
      if (activePlayers.length > 0 && activePlayers[0].id === user.uid) {
        console.log(
          "[Driver] HOST INACTIVE - I am first active player, becoming local driver (optimistic UI).",
        );
        return true;
      }
    }

    return false;
  }, [currentRoom, playersList, user]);

  usePlayRoomLifecycle({
    contextLoading,
    currentRoom,
    onMissingRoom: () => navigate("/lobby"),
    userId: user?.uid,
  });

  // Start game via RPC when room is waiting and I'm the host/local driver
  useEffect(() => {
    if (!currentRoom || !user || !isLocalDriver) return;
    if (currentRoom.status !== "waiting") return;
    if (contextLoading) return;
    if (gameStartAttemptedRef.current) return;

    gameStartAttemptedRef.current = true;

    // Host starts the game
    startGameRoom(locale, currentRoom.settings?.difficulty || paramMode || "baby")
      .catch((err) => {
        console.error("[Play] Failed to start game:", err);
        gameStartAttemptedRef.current = false;
      });
  }, [currentRoom?.status, isLocalDriver, locale, paramMode, contextLoading, startGameRoom]);

  // Reset game start flag when room leaves waiting status
  useEffect(() => {
    if (currentRoom && currentRoom.status !== "waiting") {
      gameStartAttemptedRef.current = false;
    }
  }, [currentRoom?.status]);

  // Save last played mode for the home page quick-play button
  useEffect(() => {
    if (paramMode) saveLastPlayedMode(paramMode);
  }, [paramMode]);

  // --- Gameplay State ---
  // Streak is now synced from room state, not local
  const streak = currentRoom?.gameState?.streak || 0;

  // WPM & Stats State
  const [correctWords, setCorrectWords] = useState<WordStat[]>([]);
  const [startTime, setStartTime] = useState<number | undefined>(undefined);
  const [avgWpm, setAvgWpm] = useState(0);
  const [lastBurstWpm, setLastBurstWpm] = useState(0);
  const [isInputEnabled, setIsInputEnabled] = useState(false);

  // Game stats for leaderboard tracking
  const [gameStats, setGameStats] = useState({
    correctWords: 0,
    totalXpEarned: 0,
    maxStreak: 0,
    gameEnded: false,
    isWin: false,
  });

  const [currentWord, setCurrentWord] = useState("");
  const [definition, setDefinition] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [status, setStatus] = useState<"playing" | "intermission" | "speaking">(
    "playing",
  );
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    msg: string;
    typed?: string;
    correct?: string;
  } | null>(null);

  // UI States
  const [activeTab, setActiveTab] = useState<PlayPanelTab>("none");
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
    null,
  );

  const lastSpokenWordRef = useRef<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const gameRecordedRef = useRef(false);
  const gameStartAttemptedRef = useRef(false);

  const { chatEndRef, chatInput, messages, sendMessage, setChatInput } =
    useRoomChat({
      roomId: currentRoom?.id,
      senderName:
        userData?.username ||
        (user?.email ? user.email.split("@")[0] : "Player"),
      scrollSignal: activeTab,
    });

  // Use currentRoom from context as the source of truth
  const processingRef = useRef(false);

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

  // Track turn changes for replay
  const lastTurnPlayerRef = useRef<string | null>(null);
  useEffect(() => {
    const currentTurnPlayerId = currentRoom?.gameState?.currentTurnPlayerId;
    if (currentTurnPlayerId && currentTurnPlayerId !== lastTurnPlayerRef.current) {
      // Turn changed - record end of previous turn and start of new turn
      if (lastTurnPlayerRef.current) {
        recordTurnEnd(lastTurnPlayerRef.current);
      }
      recordTurnStart(currentTurnPlayerId);
      lastTurnPlayerRef.current = currentTurnPlayerId;
    }
  }, [currentRoom?.gameState?.currentTurnPlayerId, recordTurnStart, recordTurnEnd]);

  // Track game end for leaderboard stats
  useEffect(() => {
    if (status === "intermission" && !gameStats.gameEnded && gameStats.correctWords > 0) {
      // Game ended, record final stats
      const isWin = currentRoom?.gameState?.winnerId === user?.uid;
      setGameStats((prev) => ({ ...prev, gameEnded: true, isWin }));

      // Increment daily stats with game completion
      incrementDailyStats(
        1, // games_played
        isWin ? 1 : 0, // games_won
        gameStats.correctWords, // correct_words
        gameStats.totalXpEarned, // xp_earned
        0, // nectar_earned (not tracked here)
        avgWpm, // best_wpm
        gameStats.maxStreak // max_streak
      );

      // Increment mode stats with game completion
      incrementModeStats(
        paramMode as any,
        1, // games_played
        isWin ? 1 : 0, // games_won
        gameStats.correctWords, // correct_words
        avgWpm, // wpm
        gameStats.maxStreak // streak
      );

      // Update ranked rating if this is a ranked game
      if (isRanked && currentRoom && user) {
        const opponentIds = playersList
          .filter(p => p.id !== user.uid)
          .map(p => p.id);

        const place = isWin ? 1 : playersList.length; // Simplified

        updateRankedRating(
          user.uid,
          // Get active season from somewhere - we'll need to fetch it
          // For now use a default season
          "2026-s1",
          paramMode as string,
          opponentIds,
          isWin ? "win" : "loss",
          place,
          playersList.length,
          Date.now() - (startTime || Date.now()),
          gameStats.correctWords,
          gameStats.maxStreak > 0 ? 600 : 0, // maxWpm
          gameStats.maxStreak
        ).then(result => {
          if (result) {
            console.log(`[Ranked] Rating updated: ${result.rating_change > 0 ? '+' : ''}${result.rating_change} (${result.new_rating})`);
          }
        }).catch(err => {
          console.error("[Ranked] Failed to update rating:", err);
        });
      }

      // Record game end for replay
      const winnerId = currentRoom?.gameState?.winnerId || null;
      recordReplayGameEnd(winnerId);
    } else if (status === "playing") {
      // Reset game ended flag when new game starts
      setGameStats((prev) => {
        if (prev.gameEnded) {
          return {
            correctWords: 0,
            totalXpEarned: 0,
            maxStreak: 0,
            gameEnded: false,
            isWin: false,
          };
        }
        return prev;
      });
    }
  }, [status, gameStats, avgWpm, paramMode, currentRoom?.gameState?.winnerId, user?.uid, incrementDailyStats, incrementModeStats]);

  // Determine MY status from the list
  const myStatus = React.useMemo(() => {
    const me = playersList.find((p) => p.id === user?.uid);
    return me ? me.status : "spectating";
  }, [playersList, user]);

  const isMyTurn = currentRoom?.gameState?.currentTurnPlayerId === user?.uid;

  // Initialize competitive integrity for ranked games
  useEffect(() => {
    if (isRanked && currentRoom && user) {
      enableKeystrokeLogging(currentRoom.id, user.uid);
    } else {
      disableKeystrokeLogging();
    }
    return () => {
      disableKeystrokeLogging();
    };
  }, [isRanked, currentRoom, user, enableKeystrokeLogging, disableKeystrokeLogging]);

  const { passTurn } = usePlayTurn({
    currentRoom,
    currentWord,
    playersList,
    refreshUser,
    userDisplayName: user?.displayName,
    username: userData?.username,
    userId: user?.uid,
  });

  const { emit } = useGameplayEvents();

  // Record player eliminations for replay
  useOnGameplayEvent("PLAYER_ELIMINATED", (event) => {
    recordPlayerEliminated(event.playerId, event.place);
  }, [recordPlayerEliminated]);

  const handleTurnExpired = useCallback(() => {
    if (
      currentRoom?.gameState?.currentWord &&
      (myStatus === "alive" || myStatus === "connected")
    ) {
      console.log("[Timer] Time expired. Self-eliminating.");
      setFeedback({
        type: "error",
        msg: "Time's up!",
        typed: "",
        correct: currentRoom.gameState.currentWord,
      });
      void passTurn(true);
    }
  }, [currentRoom?.gameState?.currentWord, myStatus, passTurn]);

  const { timeLeft, totalTime, intermissionTime } = usePlayRoundTimers({
    currentRoom,
    isMyTurn,
    myStatus,
    status,
    onTurnExpired: handleTurnExpired,
  });

  useWinnerAward({
    intermissionEndsAt: currentRoom?.intermissionEndsAt,
    refreshUser,
    roomId: currentRoom?.id,
    userDisplayName: user?.displayName,
    userId: user?.uid,
    winnerId: currentRoom?.gameState?.winnerId,
  });

  usePlayDriver({
    currentRoom,
    isLocalDriver,
    paramMode,
    playersList,
  });

  // --- AUDIO & INPUT SYNC ---
  useEffect(() => {
    if (!currentRoom?.gameState?.currentWord) return;

    const syncedWord = currentRoom.gameState.currentWord;
    console.log(
      `[Audio] Synced word: "${syncedWord}", Last spoken: "${lastSpokenWordRef.current}"`,
    );

    if (syncedWord !== lastSpokenWordRef.current) {
      // Record that a game was started (only once per game session)
      if (!gameRecordedRef.current) {
        recordGamePlayed();
        recordGameStart();
        // Record replay game start
        recordReplayGameStart();
        gameRecordedRef.current = true;
      }

      console.log(`[Audio] New word detected, will speak: "${syncedWord}"`);
      lastSpokenWordRef.current = syncedWord;
      setCurrentWord(syncedWord);

      // Record the word being spoken for replay
      const turnPlayerId = currentRoom?.gameState?.currentTurnPlayerId;
      if (turnPlayerId) {
        recordWordSpoken(syncedWord, turnPlayerId);
      }

      // Start keystroke tracking for ranked games
      if (isRanked) {
        startWord(syncedWord);
      }

      primeWordAudio(syncedWord);

      setInputValue("");
      setFeedback(null);
      setDefinition("Loading...");
      fetchDefinition(syncedWord, locale).then(setDefinition);

      // Only play audio if we are in 'playing' state or transitioning to it
      if (currentRoom.status === "playing") {
        setStatus("speaking");
        stopAudio();
        speak(syncedWord, ttsVolume, false, locale).then(() => {
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;

    // Anti-cheat: reject input that jumps by more than 2 characters at once
    // (catches programmatic injection, autocomplete, and dictation)
    if (val.length > inputValue.length + 2) {
      return;
    }

    setInputValue(val);
    if (val.length > inputValue.length) {
      playTypingSound();
      // Record keystrokes for ranked anti-cheat
      if (isRanked && val.length > inputValue.length) {
        const addedChars = val.slice(inputValue.length);
        for (const char of addedChars) {
          recordKeystroke(char);
        }
      }
    }

    // Sync typing to Firebase if it's my turn
    if (isMyTurn && currentRoom?.id) {
      dbUpdate(dbRef(db, `rooms/${currentRoom.id}/gameState`), {
        currentInput: val,
      }).catch(() => {}); // Silent fail for typing sync
    }
  };

  const handleInputPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
  };

  const handleInputDrop = (e: React.DragEvent<HTMLInputElement>) => {
    e.preventDefault();
  };

  // Subscribe to synced input from other players (when not my turn)
  const syncedInput = currentRoom?.gameState?.currentInput || "";

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
      let wpm = 0;
      if (startTime) {
        const now = Date.now();
        const timeTakenMs = now - startTime;
        const timeInMinutes = Math.max(timeTakenMs, 1) / 60000;

        const wordLength = currentWord.length;
        const normalizedWordCount = wordLength / 4;

        wpm = Math.round(normalizedWordCount / timeInMinutes);

        // --- ANTI-CHEAT: WPM VALIDATION ---
        // Threshold scales with word length:
        // - Short words (1-4 chars): Higher WPM possible (up to 800)
        // - Medium words (5-8 chars): Up to 600 WPM
        // - Long words (9+ chars): Up to 400 WPM
        // These are generous limits to avoid false positives
        let maxAllowedWpm = 600; // Base threshold
        if (wordLength <= 4) {
          maxAllowedWpm = 800; // Short words can be typed very fast
        } else if (wordLength <= 8) {
          maxAllowedWpm = 600;
        } else {
          maxAllowedWpm = 400; // Long words are harder to type quickly
        }

        if (wpm > maxAllowedWpm) {
          console.warn(
            `[Anti-Cheat] Suspicious WPM detected: ${wpm} for "${currentWord}" (max: ${maxAllowedWpm})`,
          );
          setFeedback({ type: "error", msg: "Slow down, speed demon!" });
          // Don't count this as correct, treat as suspicious
          return;
        }

        setLastBurstWpm(wpm);
        setCorrectWords((prev) => [...prev, { word: currentWord, wpm }]);

        // Submit keystroke log for ranked anti-cheat
        if (isRanked && startTime) {
          const timeTakenMs = Date.now() - startTime;
          submitKeystrokeLog(currentWord, wpm, timeTakenMs);

          // Trigger server-side verification for suspicious patterns
          // (We'll verify on the server side for statistical analysis)
          if (currentRoom?.id && user?.uid) {
            verifyKeystrokeLog(currentRoom.id, user.uid, currentWord).then(result => {
              if (result?.is_suspicious) {
                console.warn(`[Anti-Cheat] Server flagged suspicious activity: ${result.anomaly_reasons?.join(", ")}`);
              }
            }).catch(err => {
              console.error("[Anti-Cheat] Verification failed:", err);
            });
          }
        }

        // Record correct word for replay
        const replayTimeTakenMs = startTime ? Date.now() - startTime : 0;
        const currentStreak = currentRoom?.gameState?.streak || 0;
        recordWordCorrect(user?.uid || '', currentWord, wpm, replayTimeTakenMs, currentStreak + 1);

        setFeedback({ type: "success", msg: "Correct!" });
      }
      // Increment room-wide streak and sync WPM in Firebase
      const currentStreak = currentRoom?.gameState?.streak || 0;
      await dbUpdate(dbRef(db, `rooms/${currentRoom?.id}/gameState`), {
        streak: currentStreak + 1,
        currentPlayerWpm: wpm,
      });

      // Award XP for correct answer
      await addXp(50); // Base XP per correct word

      // Record challenge progress for correct word
      await recordCorrectWord(currentWord, wpm);

      // Increment leaderboard stats for correct word
      await incrementDailyStats(0, 0, 1, 0, 0, wpm, currentStreak + 1);
      await incrementModeStats(paramMode as any, 0, 0, 1, wpm, currentStreak + 1);

      // Update game stats
      setGameStats((prev) => ({
        correctWords: prev.correctWords + 1,
        totalXpEarned: prev.totalXpEarned + 50,
        maxStreak: Math.max(prev.maxStreak, currentStreak + 1),
        gameEnded: false,
        isWin: false,
      }));

      await passTurn(false); // Advances turn to next player
    } else {
      console.warn("Incorrect Answer");
      // Emit ANSWER_INCORRECT event for FailureTheater
      emit({
        type: "ANSWER_INCORRECT",
        word: currentWord,
        typed: inputValue,
        timeTakenMs: 0, // Would need to track this from input timing
        timestamp: Date.now(),
      });
      await handleFail("Incorrect!", inputValue, currentWord);
    }
  };

  async function handleFail(msg: string, typed?: string, correct?: string) {
    console.log(`[Death] ${msg}`);

    setFeedback({ type: "error", msg, typed, correct });
    // Record incorrect word for replay
    const timeTakenMs = startTime ? Date.now() - startTime : 0;
    recordWordIncorrect(user?.uid || '', currentWord, timeTakenMs);
    // Record challenge progress for game end (lost)
    await recordGameEnd(false, false);
    await passTurn(true);
  }

  const exitArena = async () => {
    // Mark player as disconnected before leaving
    if (currentRoom?.id && user?.uid) {
      await leaveRoom(currentRoom.id, user.uid);
    }
    // Record challenge progress for game end (won or lost, but not perfect - that's tracked elsewhere)
    await recordGameEnd(false, false);
    gameRecordedRef.current = false;
    navigate("/lobby");
  };

  const toggleTab = (tab: "chat" | "players") => {
    setActiveTab(activeTab === tab ? "none" : tab);
  };

  if (!currentRoom) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-emerald-500">
        Connecting...
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans text-text-main transition-colors duration-1000 bg-app`}
    >
      <WordCorrectionModal
        feedback={feedback}
        onClose={() => setFeedback(null)}
      />

      <div
        className={`absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[100px] pointer-events-none transition-all duration-1000 bg-emerald-500/5`}
      ></div>

      <MobilePlayActions
        activeTab={activeTab}
        onExit={exitArena}
        onToggleTab={toggleTab}
      />

      <RoomChatPanel
        chatEndRef={chatEndRef}
        chatInput={chatInput}
        className={getChatPanelClasses(activeTab)}
        messages={messages}
        onChatInputChange={setChatInput}
        onSubmit={sendMessage}
      />

      <PlayerListPanel
        className={getPlayerPanelClasses(activeTab)}
        currentTurnPlayerId={currentRoom?.gameState?.currentTurnPlayerId}
        players={playersList}
        userId={user?.uid}
        onSelectProfile={setSelectedProfileId}
      />

      <GameplayStage
        currentRoom={currentRoom}
        definition={definition}
        feedbackMessage={feedback?.msg}
        handleInputChange={handleInputChange}
        handleInputDrop={handleInputDrop}
        handleInputPaste={handleInputPaste}
        handleSubmit={handleSubmit}
        inputRef={inputRef}
        inputValue={inputValue}
        intermissionTime={intermissionTime}
        isInputEnabled={isInputEnabled}
        isMyTurn={isMyTurn}
        lastBurstWpm={lastBurstWpm}
        myStatus={myStatus}
        onExitArena={exitArena}
        onReplayWord={() => speak(currentWord, ttsVolume, true, locale)}
        paramMode={paramMode}
        playersList={playersList}
        status={status}
        streak={streak}
        syncedInput={syncedInput}
        timeLeft={timeLeft}
        totalTime={totalTime}
        userId={user?.uid}
      />

      {/* Theater Components - Phase 2b */}
      {/* Word reveal when new word is spoken */}
      <WordReveal word={currentWord} />

      {/* Success theater on correct answer */}
      <SuccessTheater />

      {/* Failure theater on incorrect answer */}
      <FailureTheater />

      {/* Turn transition when turn passes */}
      <TurnTransition />

      {/* Victory sequence when player wins */}
      <VictorySequence />

      {/* Intermission card between rounds */}
      <IntermissionCard />

      {/* Streak milestone celebrations */}
      <StreakMilestone />

      {/* Profile Modal */}
      {selectedProfileId && (
        <ProfileModal
          userId={selectedProfileId}
          onClose={() => setSelectedProfileId(null)}
        />
      )}
    </div>
  );
};

export default Play;

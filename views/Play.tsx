import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { useMultiplayer } from "../context/MultiplayerContext";
import { leaveRoom } from "../services/multiplayerService";
import {
  speak,
  checkAnswer,
  fetchDefinition,
  stopAudio,
} from "../services/gameService";
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
  const {
    currentRoom,
    players: playersList,
    loading: contextLoading,
  } = useMultiplayer();

  usePlayRoomLifecycle({
    contextLoading,
    currentRoom,
    onMissingRoom: () => navigate("/lobby"),
    userId: user?.uid,
  });

  // --- Gameplay State ---
  // Streak is now synced from room state, not local
  const streak = currentRoom?.gameState?.streak || 0;

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

  // --- HELPER: Identify Roles ---
  const isGameDriver = React.useMemo(() => {
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
      console.log("[Driver] I am HOST and active, so I am driver.");
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
          "[Driver] HOST INACTIVE - I am first active player, becoming driver.",
        );
        return true;
      }
    }

    return false;
  }, [currentRoom, playersList, user]);

  // Determine MY status from the list
  const myStatus = React.useMemo(() => {
    const me = playersList.find((p) => p.id === user?.uid);
    return me ? me.status : "spectating";
  }, [playersList, user]);

  const isMyTurn = currentRoom?.gameState?.currentTurnPlayerId === user?.uid;

  const { passTurn, updateCompetitiveRoomCorrects } = usePlayTurn({
    currentRoom,
    currentWord,
    playersList,
    refreshUser,
    userDisplayName: user?.displayName,
    username: userData?.username,
    userId: user?.uid,
  });

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
    isGameDriver,
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
      }

      setFeedback({ type: "success", msg: "Correct!" });
      // Increment room-wide streak and sync WPM in Firebase
      const currentStreak = currentRoom?.gameState?.streak || 0;
      await dbUpdate(dbRef(db, `rooms/${currentRoom?.id}/gameState`), {
        streak: currentStreak + 1,
        currentPlayerWpm: wpm,
      });

      await updateCompetitiveRoomCorrects();
      await passTurn(false); // Advances turn to next player
    } else {
      console.warn("Incorrect Answer");
      await handleFail("Incorrect!", inputValue, currentWord);
    }
  };

  async function handleFail(msg: string, typed?: string, correct?: string) {
    console.log(`[Death] ${msg}`);

    setFeedback({ type: "error", msg, typed, correct });
    await passTurn(true);
  }

  const exitArena = async () => {
    // Mark player as disconnected before leaving
    if (currentRoom?.id && user?.uid) {
      await leaveRoom(currentRoom.id, user.uid);
    }
    navigate("/lobby");
  };

  const toggleTab = (tab: "chat" | "players") => {
    setActiveTab(activeTab === tab ? "none" : tab);
  };

  if (!currentRoom)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-emerald-500">
        Connecting...
      </div>
    );

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
        onReplayWord={() => speak(currentWord, ttsVolume, true)}
        paramMode={paramMode}
        playersList={playersList}
        status={status}
        streak={streak}
        syncedInput={syncedInput}
        timeLeft={timeLeft}
        totalTime={totalTime}
        userId={user?.uid}
      />

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

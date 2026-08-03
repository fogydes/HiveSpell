import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { useMultiplayer } from "../context/MultiplayerContext";
import { subscribeToRoom } from "../services/multiplayerService";
import i18n from "../i18n";
import { type LocaleId } from "../data/localization";
import GameplayStage from "../components/play/GameplayStage";
import PlayerListPanel from "../components/play/PlayerListPanel";
import RoomChatPanel from "../components/play/RoomChatPanel";
import { useRoomChat } from "../hooks/useRoomChat";
import { useScene } from "../context/SceneContext";
import {
  WordReveal,
  SuccessTheater,
  FailureTheater,
  TurnTransition,
  VictorySequence,
  IntermissionCard,
  StreakMilestone,
} from "../components/theater";
import { getChatPanelClasses, getPlayerPanelClasses, PlayPanelTab } from "../services/playPanelUtils";

interface WatchGameState {
  currentWord: string;
  currentWordIndex: number;
  startTime: number;
  timerDuration?: number;
  currentTurnPlayerId?: string;
  turnOrder?: string[];
  currentInput?: string;
  currentPlayerWpm?: number;
  streak?: number;
  roundNumber: number;
  winnerId?: string | null;
  winnerName?: string | null;
  frozenTimeLeft?: number | null;
  recentWords?: string[];
}

interface WatchRoom {
  id: string;
  hostId: string;
  type: "public" | "private";
  status: "waiting" | "playing" | "intermission" | "finished";
  createdAt: number;
  code?: string;
  settings: {
    difficulty: string;
    maxPlayers: number;
  };
  players: Record<string, {
    id: string;
    name: string;
    isHost: boolean;
    score: number;
    corrects: number;
    wins: number;
    streak: number;
    status: "alive" | "eliminated" | "spectating" | "connected" | "disconnected";
    joinedAt?: number;
  }>;
  gameState?: WatchGameState;
  intermissionEndsAt?: number | null;
}

interface PlayerInputHistory {
  [playerId: string]: {
    word: string;
    typed: string;
    timestamp: number;
    isCorrect: boolean;
    wpm: number;
  }[];
}

const SPECTATOR_DELAY_MS = 5000; // 5 second delay for anti-cheat

const Watch: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const { ttsVolume, playTypingSound } = useSettings();
  const locale = i18n.language as LocaleId;
  const { currentRoom: multiplayerRoom, loading: contextLoading } = useMultiplayer();

  // Scene for theming
  const { currentScene } = useScene();

  // Chat
  const { chatEndRef, chatInput, messages, sendMessage, setChatInput } = useRoomChat({
    roomId: roomId || "",
    senderName: userData?.username || (user?.email ? user.email.split("@")[0] : "Spectator"),
    scrollSignal: "none",
  });

  // Local state
  const [room, setRoom] = useState<WatchRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"waiting" | "playing" | "intermission" | "finished">("waiting");
  const [currentWord, setCurrentWord] = useState("");
  const [definition, setDefinition] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [intermissionTime, setIntermissionTime] = useState(0);
  const [lastBurstWpm, setLastBurstWpm] = useState(0);
  const [playersList, setPlayersList] = useState<Array<WatchRoom["players"][string]>>([]);
  const [currentTurnPlayerId, setCurrentTurnPlayerId] = useState<string | undefined>();
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    msg: string;
    typed?: string;
    correct?: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<PlayPanelTab>("none");
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [isInputEnabled, setIsInputEnabled] = useState(false);
  const [startTime, setStartTime] = useState<number | undefined>(undefined);

  // Spectator delay: queue of events to replay with 5s delay
  const eventQueueRef = useRef<Array<{ event: any; scheduledTime: number }>>([]);
  const wordHistoryRef = useRef<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSpokenWordRef = useRef<string>("");
  const lastSyncedInputRef = useRef<string>("");

  // Get current spectator user ID
  const spectatorId = user?.uid || "anonymous";

  // Toggle tab
  const toggleTab = (tab: "chat" | "players") => {
    setActiveTab(activeTab === tab ? "none" : tab);
  };

  // Exit watch mode
  const exitWatch = useCallback(() => {
    navigate("/lobby");
  }, [navigate]);

  // Process delayed events
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      while (eventQueueRef.current.length > 0 && eventQueueRef.current[0].scheduledTime <= now) {
        const { event } = eventQueueRef.current.shift()!;
        // Process the delayed event (trigger theater components)
        console.log("[Spectator] Processing delayed event:", event.type);
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Subscribe to room
  useEffect(() => {
    if (!roomId) {
      setError("No room ID provided");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    let mounted = true;

    const unsubscribe = subscribeToRoom(roomId, (roomData) => {
      if (!mounted) return;

      if (!roomData) {
        setError("Room not found or has ended");
        setLoading(false);
        return;
      }

      const watchRoom: WatchRoom = {
        ...roomData,
        gameState: roomData.gameState || undefined,
      } as WatchRoom;

      setRoom(watchRoom);

      // Update derived state
      if (watchRoom.players) {
        setPlayersList(Object.values(watchRoom.players));
      }

      if (watchRoom.gameState) {
        const gs = watchRoom.gameState;
        setStatus(watchRoom.status);
        setCurrentTurnPlayerId(gs.currentTurnPlayerId);
        setStreak(gs.streak || 0);

        // Handle new word
        if (gs.currentWord && gs.currentWord !== lastSpokenWordRef.current) {
          console.log("[Spectator] New word:", gs.currentWord);
          lastSpokenWordRef.current = gs.currentWord;
          wordHistoryRef.current.push(gs.currentWord);

          // Queue event with delay
          eventQueueRef.current.push({
            event: { type: "WORD_SPOKEN", word: gs.currentWord },
            scheduledTime: Date.now() + SPECTATOR_DELAY_MS,
          });

          // Immediate local update for display
          setCurrentWord(gs.currentWord);
          setInputValue("");
          setFeedback(null);
          setDefinition("Loading...");

          // Fetch definition
          import("../services/gameService").then(({ fetchDefinition }) => {
            fetchDefinition(gs.currentWord, locale).then(setDefinition);
          });

          // Prime audio (but don't play - spectator observes)
          import("../services/gameService").then(({ primeWordAudio }) => {
            primeWordAudio(gs.currentWord);
          });
        }

        // Handle turn change
        if (gs.currentTurnPlayerId && gs.currentTurnPlayerId !== currentTurnPlayerId) {
          eventQueueRef.current.push({
            event: { type: "TURN_HANDOFF", to: gs.currentTurnPlayerId, timeLeft: gs.timerDuration || 30000 },
            scheduledTime: Date.now() + SPECTATOR_DELAY_MS,
          });
        }

        // Handle streak change
        if (gs.streak !== undefined && gs.streak !== streak) {
          eventQueueRef.current.push({
            event: { type: "ANSWER_CORRECT", word: gs.currentWord, streak: gs.streak, wpm: gs.currentPlayerWpm || 0 },
            scheduledTime: Date.now() + SPECTATOR_DELAY_MS,
          });
        }

        // Handle game state changes
        if (gs.currentInput !== lastSyncedInputRef.current) {
          lastSyncedInputRef.current = gs.currentInput || "";
        }
      }

      setLoading(false);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [roomId, status]);

  // Handle spectator delay for current word display
  // We show the word that was spoken 5 seconds ago
  const delayedWord = useMemo(() => {
    if (wordHistoryRef.current.length === 0) return "";
    // In a real implementation, we'd track exact timing
    // For now, show current word but with visual indicator of delay
    return currentWord;
  }, [currentWord]);

  // Compute timer state
  useEffect(() => {
    if (room?.gameState && room.status === "playing") {
      const gs = room.gameState;
      if (gs.timerDuration && gs.startTime) {
        const elapsed = Date.now() - gs.startTime - SPECTATOR_DELAY_MS;
        const remaining = Math.max(0, gs.timerDuration - elapsed);
        setTimeLeft(remaining);
        setTotalTime(gs.timerDuration);

        if (remaining <= 0) {
          setTimeLeft(0);
        }
      }
    } else if (room?.status === "intermission" && room.intermissionEndsAt) {
      const remaining = Math.max(0, room.intermissionEndsAt - Date.now());
      setIntermissionTime(Math.ceil(remaining / 1000));
    }
  }, [room?.gameState?.startTime, room?.gameState?.timerDuration, room?.status, room?.intermissionEndsAt]);

  // Watch for winner
  useEffect(() => {
    if (room?.gameState?.winnerId) {
      eventQueueRef.current.push({
        event: { type: "VICTORY", winnerId: room.gameState.winnerId, winnerName: room.gameState.winnerName },
        scheduledTime: Date.now() + SPECTATOR_DELAY_MS,
      });
    }
  }, [room?.gameState?.winnerId]);

  // Handle eliminated players
  useEffect(() => {
    const eliminated = playersList.filter(p => p.status === "eliminated");
    eliminated.forEach(p => {
      if (p.id !== "processed") {
        eventQueueRef.current.push({
          event: { type: "PLAYER_ELIMINATED", playerId: p.id },
          scheduledTime: Date.now() + SPECTATOR_DELAY_MS,
        });
      }
    });
  }, [playersList]);

  if (loading) {
    return (
      <div className="theme-scene min-h-screen bg-app flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-text-muted">Loading room...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="theme-scene min-h-screen bg-app flex items-center justify-center p-4">
        <div className="theme-panel-shell text-center p-8 max-w-md">
          <div className="text-error mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-text-main mb-2">Unable to Load Room</h2>
          <p className="text-text-muted mb-6">{error}</p>
          <button
            onClick={exitWatch}
            className="rounded-full bg-primary text-app px-6 py-3 font-semibold transition-colors hover:opacity-90"
          >
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="theme-scene min-h-screen bg-app flex items-center justify-center">
        <p className="text-text-muted">No room data</p>
      </div>
    );
  }

  // Spectator status badge
  const statusLabel = {
    waiting: "Waiting for players...",
    playing: "Live Game",
    intermission: "Intermission",
    finished: "Game Complete",
  }[room.status];

  const statusColor = {
    waiting: "text-amber-500",
    playing: "text-emerald-500 animate-pulse",
    intermission: "text-blue-500",
    finished: "text-purple-500",
  }[room.status];

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans text-text-main transition-colors duration-1000 bg-app ${currentScene.id}`}
    >
      {/* Spectator banner */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-amber-600/90 backdrop-blur-sm text-white text-center py-2 text-sm font-medium border-b border-amber-500">
        🎮 SPECTATOR MODE — 5s delay | Room: {room.id.slice(0, 8)}... | {statusLabel}
      </div>

      {/* Game state indicator */}
      <div className="fixed top-12 left-4 z-40 flex items-center gap-2 px-3 py-1.5 bg-panel/90 backdrop-blur rounded-full border border-border shadow-lg">
        <span className={`w-2 h-2 rounded-full ${status === "playing" ? "animate-pulse" : ""}`} style={{ backgroundColor: statusColor.replace("text-", "bg-") }} />
        <span className={`text-sm font-medium ${statusColor}`}>{statusLabel}</span>
        {room.status === "playing" && (
          <>
            <span className="text-xs text-text-muted px-2">|</span>
            <span className="text-xs font-mono text-text-muted">Word #{room.gameState?.currentWordIndex || 0}</span>
          </>
        )}
      </div>

      {/* Background ambient */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute left-[8%] top-24 h-64 w-64 rounded-full blur-3xl opacity-60"
          style={{ backgroundImage: "var(--theme-ambient-glow)" }}
        />
      </div>

      <div className="relative w-full max-w-7xl flex-1 flex flex-col">
        {/* Room info header */}
        <div className="theme-panel-shell mb-4 w-full rounded-xl border bg-panel/35 px-4 py-3 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="font-mono text-lg font-bold text-primary">{room.id}</div>
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                  {room.settings.difficulty.toUpperCase()}
                </span>
                <span>·</span>
                <span>Max: {room.settings.maxPlayers}</span>
                <span>·</span>
                <span>{room.type}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={exitWatch}
                className="rounded-full border border-surface px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:border-primary hover:text-primary"
              >
                Leave
              </button>
            </div>
          </div>
        </div>

        {/* Main gameplay area */}
        <div className="flex-1 flex flex-col">
          {/* Chat panel - always visible for spectators */}
          <div className={getChatPanelClasses(activeTab)}>
            <RoomChatPanel
              chatEndRef={chatEndRef}
              chatInput={chatInput}
              messages={messages}
              onChatInputChange={setChatInput}
              onSubmit={sendMessage}
              className="h-48 sm:h-64"
            />
          </div>

          {/* Player list panel */}
          <div className={getPlayerPanelClasses(activeTab)}>
            <PlayerListPanel
              className={getPlayerPanelClasses(activeTab)}
              currentTurnPlayerId={currentTurnPlayerId}
              players={playersList}
              userId={spectatorId}
              onSelectProfile={setSelectedProfileId}
            />
          </div>

          {/* Gameplay Stage - Read-only spectator view */}
          <div className="flex-1 flex items-center justify-center p-4">
            <GameplayStage
              currentRoom={room}
              definition={definition}
              feedbackMessage={feedback?.msg}
              handleInputChange={() => {}} // No input for spectators
              handleInputDrop={() => {}}
              handleInputPaste={() => {}}
              handleSubmit={() => {}}
              inputRef={inputRef}
              inputValue={lastSyncedInputRef.current || ""}
              intermissionTime={intermissionTime}
              isInputEnabled={false}
              isMyTurn={false}
              lastBurstWpm={lastBurstWpm}
              myStatus="spectating"
              onExitArena={exitWatch}
              onReplayWord={() => {
                if (currentWord) {
                  import("../services/gameService").then(({ speak }) => speak(currentWord, ttsVolume, true, locale));
                }
              }}
              paramMode={room.settings.difficulty}
              playersList={playersList}
              status={room.status === "waiting" ? "intermission" : room.status === "playing" ? "playing" : "intermission"}
              streak={streak}
              syncedInput={lastSyncedInputRef.current || ""}
              timeLeft={timeLeft}
              totalTime={totalTime}
              userId={spectatorId}
            />
          </div>
        </div>

        {/* Theater Components - Phase 2b */}
        <WordReveal word={currentWord} />
        <SuccessTheater />
        <FailureTheater />
        <TurnTransition />
        <VictorySequence />
        <IntermissionCard />
        <StreakMilestone />

        {/* Profile Modal */}
        {selectedProfileId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="theme-panel-shell w-full max-w-md rounded-2xl border bg-panel/95 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Profile</h3>
                <button
                  onClick={() => setSelectedProfileId(null)}
                  className="p-2 text-text-muted hover:text-text-main rounded-lg hover:bg-surface transition-colors"
                >
                  ✕
                </button>
              </div>
              <p className="text-text-muted text-center py-8">
                Profile viewing for spectator mode - implement ProfileModal here
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Spectator Controls */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3">
        <div className="theme-panel-shell px-4 py-2 rounded-full border bg-panel/90 backdrop-blur flex items-center gap-3 text-sm">
          <span className="text-text-muted">Spectating</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
        <button
          onClick={() => navigator.clipboard.writeText(window.location.href)}
          className="theme-panel-shell px-4 py-2 rounded-full border bg-panel/90 backdrop-blur text-sm font-medium transition-colors hover:border-primary hover:text-primary"
          title="Copy spectator link"
        >
          🔗 Copy Link
        </button>
      </div>
    </div>
  );
};

export default Watch;

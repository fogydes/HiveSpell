import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { useMultiplayer } from "../context/MultiplayerContext";
import { leaveRoom } from "../services/multiplayerService";
import {
  wordBank,
  speak,
  checkAnswer,
  fetchDefinition,
  stopAudio,
  MODE_ORDER,
  getWordDifficulty,
} from "../services/gameService";
import {
  applyCorrectAnswerReward,
  awardProfileWin,
} from "../services/profileService";
import {
  calculateTurnDuration,
  findNextActiveTurnPlayer,
  getActiveTurnPlayers,
  hasOtherConnectedRoomPlayer,
  getPostTurnState,
  getRoundTurnOrder,
} from "../services/playRoomUtils";
import {
  buildIntermissionRoomUpdate,
  buildNextTurnAfterEliminationUpdate,
} from "../services/playUpdateUtils";
import {
  appendRecentWord,
  pickRandomWord,
  pickWordAvoidingRecent,
} from "../services/playWordUtils";
import { db } from "../firebase";
import {
  ref as dbRef,
  update as dbUpdate,
  runTransaction,
  off as dbOff,
  onDisconnect,
} from "firebase/database";
import { Room, Player } from "../types/multiplayer";
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

  const handleTurnExpired = useCallback(() => {
    if (
      currentRoom?.gameState?.currentWord &&
      (myStatus === "alive" || myStatus === "connected")
    ) {
      console.log("[Timer] Time expired. Self-eliminating.");
      void handleFail("Time's up!", "", currentRoom.gameState.currentWord);
    }
  }, [currentRoom?.gameState?.currentWord, myStatus]);

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

  // --- DISCONNECTED PLAYER TURN HANDLER (Driver Only) ---
  // If the current turn player is disconnected, auto-eliminate them and pass turn
  const disconnectedTurnHandlerRef = useRef(false);
  useEffect(() => {
    // Only game driver handles this
    if (!isGameDriver) return;
    if (!currentRoom || currentRoom.status !== "playing") return;

    const currentTurnPlayerId = currentRoom.gameState?.currentTurnPlayerId;
    if (!currentTurnPlayerId) return;

    // Find the current turn player
    const currentTurnPlayer = playersList.find(
      (p) => p.id === currentTurnPlayerId,
    );

    // If current turn player is disconnected, auto-skip them
    if (currentTurnPlayer?.status === "disconnected") {
      // Prevent double-processing
      if (disconnectedTurnHandlerRef.current) return;
      disconnectedTurnHandlerRef.current = true;

      console.log(
        "[Driver] Current turn player is DISCONNECTED:",
        currentTurnPlayerId,
      );

      // Mark them as eliminated and find next player
      const roomId = currentRoom.id;
      const turnOrder = currentRoom.gameState?.turnOrder || [];

      // Get still-alive players (not disconnected, not eliminated)
      const alivePlayers = getActiveTurnPlayers(playersList);

      console.log(
        "[Driver] Alive players after disconnected skip:",
        alivePlayers.map((p) => p.name),
      );

      // Check win condition (only one player left)
      if (alivePlayers.length <= 1 && playersList.length > 1) {
        console.log("[Driver] Only one player left, triggering intermission");
        const updates = buildIntermissionRoomUpdate({
          eliminatedPlayerId: currentTurnPlayerId,
          winner:
            alivePlayers.length === 1
              ? { id: alivePlayers[0].id, name: alivePlayers[0].name }
              : undefined,
        });

        dbUpdate(dbRef(db, `rooms/${roomId}`), updates)
          .then(() => {
            console.log(
              "[Driver] Intermission triggered due to disconnected player",
            );
            disconnectedTurnHandlerRef.current = false;
          })
          .catch((err) => {
            console.error("[Driver] Failed to trigger intermission:", err);
            disconnectedTurnHandlerRef.current = false;
          });
      } else {
        // Find next alive player
        const nextPlayerId = findNextActiveTurnPlayer(
          turnOrder,
          currentTurnPlayerId,
          alivePlayers,
        );

        // FALLBACK: If no valid player, trigger intermission
        if (!nextPlayerId) {
          console.log(
            "[Driver] No valid player after disconnect skip, triggering intermission",
          );
          const fallbackUpdates = buildIntermissionRoomUpdate({
            eliminatedPlayerId: currentTurnPlayerId,
          });

          dbUpdate(dbRef(db, `rooms/${roomId}`), fallbackUpdates)
            .then(() => {
              console.log(
                "[Driver] Intermission triggered (disconnect fallback)",
              );
              disconnectedTurnHandlerRef.current = false;
            })
            .catch((err) => {
              console.error(
                "[Driver] Failed to trigger disconnect fallback intermission:",
                err,
              );
              disconnectedTurnHandlerRef.current = false;
            });
          return; // Exit early
        }

        console.log(
          "[Driver] Skipping disconnected player, next turn:",
          nextPlayerId,
        );

        // Update: mark disconnected as eliminated, set new word and next turn
        const difficulty =
          currentRoom.settings?.difficulty || paramMode || "baby";
        const words = wordBank[difficulty];
        const newWord = pickRandomWord(words);
        const currentStreak = currentRoom.gameState?.streak || 0;
        const updates = buildNextTurnAfterEliminationUpdate({
          currentStreak,
          eliminatedPlayerId: currentTurnPlayerId,
          newWord,
          nextPlayerId,
        });

        dbUpdate(dbRef(db, `rooms/${roomId}`), updates)
          .then(() => {
            console.log(
              "[Driver] Skipped disconnected player, new word:",
              newWord,
            );
            disconnectedTurnHandlerRef.current = false;
          })
          .catch((err) => {
            console.error("[Driver] Failed to skip disconnected player:", err);
            disconnectedTurnHandlerRef.current = false;
          });
      }
    }
  }, [isGameDriver, currentRoom, playersList]);

  // --- TIMER EXPIRATION HANDLER (Driver Only) ---
  // If timer expires and current turn player hasn't acted, auto-fail them
  // This handles cases where player disconnects but status hasn't updated yet
  const timerExpirationRef = useRef(false);
  useEffect(() => {
    if (!isGameDriver) return;
    if (!currentRoom || currentRoom.status !== "playing") return;

    const startTime = currentRoom.gameState?.startTime;
    const timerDuration = (currentRoom.gameState as any)?.timerDuration;
    const currentTurnPlayerId = currentRoom.gameState?.currentTurnPlayerId;

    if (!startTime || !timerDuration || !currentTurnPlayerId) return;

    // Calculate if timer has expired
    const elapsed = (Date.now() - startTime) / 1000;
    const remaining = timerDuration - elapsed;

    // Only trigger if timer is expired (with 0.5s grace period)
    if (remaining > -0.5) return;

    // Prevent double-processing
    if (timerExpirationRef.current) return;
    timerExpirationRef.current = true;

    console.log(
      "[Driver] TIMER EXPIRED for player:",
      currentTurnPlayerId,
      "Remaining:",
      remaining,
    );

    // Find current turn player
    const currentTurnPlayer = playersList.find(
      (p) => p.id === currentTurnPlayerId,
    );

    // If player is disconnected OR they haven't responded, fail them
    const roomId = currentRoom.id;
    const turnOrder = currentRoom.gameState?.turnOrder || [];

    // Get still-alive players (not disconnected, not eliminated, and not the failing player)
    const alivePlayers = getActiveTurnPlayers(playersList).filter(
      (p) => p.id !== currentTurnPlayerId,
    );

    console.log(
      "[Driver] Timer expired - alive players after elimination:",
      alivePlayers.map((p) => p.name),
    );

    // Check win condition (only one or zero players left)
    const shouldTriggerIntermission =
      alivePlayers.length <= 1 || playersList.length === 1;

    if (shouldTriggerIntermission) {
      console.log("[Driver] Timer expiration -> triggering intermission");
      const updates = buildIntermissionRoomUpdate({
        eliminatedPlayerId: currentTurnPlayerId,
        winner:
          alivePlayers.length === 1
            ? { id: alivePlayers[0].id, name: alivePlayers[0].name }
            : undefined,
      });

      dbUpdate(dbRef(db, `rooms/${roomId}`), updates)
        .then(() => {
          console.log(
            "[Driver] Intermission triggered due to timer expiration",
          );
          timerExpirationRef.current = false;
        })
        .catch((err) => {
          console.error("[Driver] Failed to trigger intermission:", err);
          timerExpirationRef.current = false;
        });
    } else {
      // Find next alive player
      const nextPlayerId = findNextActiveTurnPlayer(
        turnOrder,
        currentTurnPlayerId,
        alivePlayers,
      );

      // FALLBACK: If still no valid player, trigger intermission instead of broken state
      if (!nextPlayerId) {
        console.log(
          "[Driver] No valid next player found, triggering intermission fallback",
        );
        const fallbackUpdates = buildIntermissionRoomUpdate({
          eliminatedPlayerId: currentTurnPlayerId,
          resetStreak: true,
        });

        dbUpdate(dbRef(db, `rooms/${roomId}`), fallbackUpdates)
          .then(() => {
            console.log(
              "[Driver] Intermission triggered (fallback - no players left)",
            );
            timerExpirationRef.current = false;
          })
          .catch((err) => {
            console.error(
              "[Driver] Failed to trigger intermission fallback:",
              err,
            );
            timerExpirationRef.current = false;
          });
        return; // Exit early
      }

      console.log(
        "[Driver] Timer expired, passing to next player:",
        nextPlayerId,
      );

      // Set new word and pass turn
      const difficulty =
        currentRoom.settings?.difficulty || paramMode || "baby";
      const words = wordBank[difficulty];
      const newWord = pickRandomWord(words);
      const currentStreak = currentRoom.gameState?.streak || 0;
      const updates = buildNextTurnAfterEliminationUpdate({
        currentStreak,
        eliminatedPlayerId: currentTurnPlayerId,
        newWord,
        nextPlayerId,
      });

      dbUpdate(dbRef(db, `rooms/${roomId}`), updates)
        .then(() => {
          console.log(
            "[Driver] Timer expired -> passed turn to:",
            nextPlayerId,
          );
          timerExpirationRef.current = false;
        })
        .catch((err) => {
          console.error("[Driver] Failed to pass turn after timeout:", err);
          timerExpirationRef.current = false;
        });
    }
  }, [
    isGameDriver,
    currentRoom?.status,
    currentRoom?.gameState?.startTime,
    currentRoom?.gameState?.currentTurnPlayerId,
    playersList,
  ]);

  // Streak reset is now handled in Firebase (passTurn sets streak: 0 on intermission)

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
      const allWords = wordBank[difficulty];

      // Get recently used words from gameState (max 20 to avoid stale data)
      const recentWords: string[] = currentRoom.gameState?.recentWords || [];

      const newWord = pickWordAvoidingRecent(allWords, recentWords);

      const currentStreak = currentRoom.gameState?.streak || 0;
      const finalTime = calculateTurnDuration(newWord, currentStreak);
      const startTime = Date.now();

      const turnOrder = getRoundTurnOrder(playersList);

      // Check if there's already a turn set (passTurn sets this before triggering new word)
      const existingTurnPlayer = currentRoom.gameState?.currentTurnPlayerId;

      console.log(
        "[Driver] Turn order:",
        turnOrder,
        "Existing turn from passTurn:",
        existingTurnPlayer,
      );

      // Build update - DON'T overwrite currentTurnPlayerId if it's already set
      // passTurn sets the turn, driver just sets the word

      const updatedRecentWords = appendRecentWord(recentWords, newWord);

      const updateData: any = {
        currentWord: newWord,
        startTime: startTime,
        timerDuration: finalTime,
        turnOrder: turnOrder,
        currentInput: "",
        recentWords: updatedRecentWords,
      };

      // Only set first turn player if NO turn is currently set (start of new round)
      if (!existingTurnPlayer) {
        updateData.currentTurnPlayerId = turnOrder[0] || null;
        console.log(
          "[Driver] No existing turn, setting first player:",
          turnOrder[0],
        );
      }

      dbUpdate(dbRef(db, `rooms/${currentRoom.id}/gameState`), updateData)
        .then(() => {
          console.log(
            "[Driver] Word set:",
            newWord,
            "Turn preserved:",
            existingTurnPlayer,
          );
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
          // Use path-based updates to preserve other gameState fields
          "gameState/currentWord": null, // this will trigger logic A above
          "gameState/currentWordIndex": 0,
          "gameState/startTime": 0,
          "gameState/currentTurnPlayerId": null,
          "gameState/winnerId": null,
          "gameState/winnerName": null,
          "gameState/frozenTimeLeft": null,
          "gameState/currentInput": "",
          "gameState/streak": 0, // Reset streak only when new round actually starts
        };

        // REVIVE ALL NON-DISCONNECTED PLAYERS (don't revive players who left)
        playersList
          .filter((p) => p.status !== "disconnected")
          .forEach((p) => {
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

    // Solo mode: trigger intermission on failure (10 sec break)
    const isSoloMode = playersList.length === 1;
    if (isSoloMode && wasEliminated) {
      console.log("[PassTurn] Solo mode - triggering intermission");
      updates["status"] = "intermission";
      updates["intermissionEndsAt"] = Date.now() + 10000; // 10 second break
      updates["gameState/currentWord"] = null;
      updates["gameState/startTime"] = null;
      updates["gameState/timerDuration"] = null;
      // updates["gameState/streak"] = 0; // Removed premature reset
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
      // Store frozen timer for all players to see
      const start = currentRoom.gameState?.startTime || Date.now();
      const duration = (currentRoom.gameState as any)?.timerDuration || 10;
      const elapsed = (Date.now() - start) / 1000;
      const frozenTime = Math.max(0, duration - elapsed);
      updates["gameState/frozenTimeLeft"] = frozenTime;

      console.log(
        "[Death] Freezing timer at:",
        frozenTime.toFixed(1),
        "Streak Reset.",
      );
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
    const eliminatedPlayerId = wasEliminated ? user?.uid : undefined;
    const { activePlayersCount, aliveAfterTurn, shouldTriggerIntermission } =
      getPostTurnState(playersList, eliminatedPlayerId);

    console.log(
      "[PassTurn] Alive after this:",
      aliveAfterTurn.map((p) => p.id),
    );

    console.log(
      "[PassTurn] Win check: aliveAfterThis.length =",
      aliveAfterTurn.length,
      "playersList.length =",
      playersList.length,
    );

    console.log(
      "[PassTurn] Active players (non-spectators) count:",
      activePlayersCount,
    );

    // Log all player statuses for debugging
    console.log(
      "[PassTurn] All player statuses:",
      playersList.map((p) => ({ id: p.id, name: p.name, status: p.status })),
    );

    // Win Condition:
    // 1. Only one player left AND there were multiple ACTIVE players (someone won)
    // 2. OR no players left alive at all (everyone got eliminated - edge case)
    console.log(
      `[PassTurn] WIN CONDITION CHECK: alive=${aliveAfterTurn.length}, active=${activePlayersCount} => ${shouldTriggerIntermission}`,
    );

    if (shouldTriggerIntermission) {
      console.log("[PassTurn] Triggering intermission!");
      updates["status"] = "intermission";
      updates["intermissionEndsAt"] = Date.now() + 10000;
      updates["gameState/currentWord"] = null;
      updates["gameState/currentTurnPlayerId"] = null;
      updates["gameState/currentTurnPlayerId"] = null;
      // updates["gameState/streak"] = 0; // Removed premature reset for new round

      // Award win to survivor
      if (aliveAfterTurn.length === 1) {
        const winner = aliveAfterTurn[0];
        console.log("[PassTurn] Winner:", winner.name);
        updates["gameState/winnerId"] = winner.id;
        updates["gameState/winnerName"] = winner.name;
      }
    } else {
      const nextPlayerId =
        findNextActiveTurnPlayer(turnOrder, currentTurn, aliveAfterTurn) ||
        currentTurn;

      console.log("[PassTurn] Next turn:", nextPlayerId, "Was:", currentTurn);
      updates["gameState/currentTurnPlayerId"] = nextPlayerId;

      // ALWAYS reset word and timer for the next player's turn
      // Each player gets their own fresh word
      console.log("[PassTurn] Resetting word for next player");
      updates["gameState/currentWord"] = null; // Driver will pick new word
      updates["gameState/startTime"] = null;
      updates["gameState/timerDuration"] = null;
      updates["gameState/currentInput"] = ""; // Clear input for next player
    }

    console.log(
      "[PassTurn] Updates to apply:",
      JSON.stringify(updates, null, 2),
    );

    try {
      await dbUpdate(dbRef(db, `rooms/${roomId}`), updates);
      console.log("[PassTurn] Firebase update successful!");
    } catch (err) {
      console.error("[PassTurn] Firebase update FAILED:", err);
    }
    passingTurnRef.current = false;

    const shouldAwardPersistentCorrects =
      !wasEliminated &&
      user?.uid &&
      hasOtherConnectedRoomPlayer(playersList, user.uid);

    // PERFORM LIFETIME CORRECTS + NECTAR UPDATE (competitive rooms only)
    if (shouldAwardPersistentCorrects && user?.uid) {
      // Calculate nectar reward based on difficulty
      const nectarRewards: Record<string, number> = {
        baby: 6,
        cakewalk: 8,
        learner: 10,
        intermediate: 12,
        heated: 14,
        genius: 16,
        polymath: 18,
      };

      let difficulty =
        currentRoom.settings?.difficulty?.toLowerCase() || "baby";

      // For Omniscient mode, determine nectar based on the word's original difficulty
      if (difficulty === "omniscient") {
        const wordOriginalDifficulty = getWordDifficulty(currentWord);
        difficulty = wordOriginalDifficulty;
        console.log(
          `[Stats] Omniscient mode: word "${currentWord}" belongs to "${wordOriginalDifficulty}"`,
        );
      }

      const nectarToAdd = nectarRewards[difficulty] || 6;

      console.log(
        `[Stats] Adding ${nectarToAdd} nectar for difficulty: ${difficulty}`,
      );

      applyCorrectAnswerReward(
        user.uid,
        user.displayName || userData?.username || "Player",
        nectarToAdd,
      )
        .then(() => refreshUser())
        .catch((err: any) =>
          console.error("Persistent reward update failed:", err),
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

      const isCompetitiveRoom = hasOtherConnectedRoomPlayer(
        playersList,
        user?.uid,
      );

      // UPDATE ROOM PLAYER STATS (competitive rooms only)
      if (isCompetitiveRoom && user?.uid && currentRoom?.id) {
        try {
          const playerRef = dbRef(
            db,
            `rooms/${currentRoom.id}/players/${user.uid}`,
          );
          await runTransaction(
            playerRef,
            (player: any) => {
              if (player) {
                player.corrects = (player.corrects || 0) + 1;
                player.score = (player.score || 0) + 10; // Optional score update
              }
              return player;
            },
          );
        } catch (err) {
          console.error("Failed to update room player stats:", err);
        }
      }
      await passTurn(false); // Advances turn to next player
    } else {
      console.warn("Incorrect Answer");
      await handleFail("Incorrect!", inputValue, currentWord);
    }
  };

  async function handleFail(
    msg: string,
    typed?: string,
    correct?: string,
  ) {
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

import { useEffect, useRef, useState } from "react";
import type { Room } from "../types/multiplayer";
import {
  getRemainingIntermissionTime,
  getRemainingTurnTime,
  shouldTriggerTurnTimeout,
} from "../services/playTimerUtils";
import { useGameplayEvents } from "./useGameplayEvents";

interface UsePlayRoundTimersArgs {
  currentRoom?: Room | null;
  isMyTurn: boolean;
  myStatus: string;
  status: "playing" | "intermission" | "speaking";
  onTurnExpired: () => void;
}

export const usePlayRoundTimers = ({
  currentRoom,
  isMyTurn,
  myStatus,
  status,
  onTurnExpired,
}: UsePlayRoundTimersArgs) => {
  const [timeLeft, setTimeLeft] = useState(10);
  const [totalTime, setTotalTime] = useState(10);
  const [intermissionTime, setIntermissionTime] = useState(10);
  const animationFrameRef = useRef<number>(0);
  const { emit } = useGameplayEvents();
  const prevStatusRef = useRef(status);
  const prevIntermissionTimeRef = useRef(intermissionTime);

  useEffect(() => {
    if (!isMyTurn) return;

    const startTime = currentRoom?.gameState?.startTime;
    const timerDuration = currentRoom?.gameState?.timerDuration;
    if (!startTime || !timerDuration) return;

    const timer = setInterval(() => {
      const remainingTime = getRemainingTurnTime(startTime, timerDuration);
      if (
        shouldTriggerTurnTimeout({
          isMyTurn,
          status,
          myStatus,
          remainingTime,
        })
      ) {
        clearInterval(timer);
        onTurnExpired();
      }
    }, 100);

    return () => clearInterval(timer);
  }, [
    currentRoom?.gameState?.startTime,
    currentRoom?.gameState?.timerDuration,
    isMyTurn,
    myStatus,
    onTurnExpired,
    status,
  ]);

  useEffect(() => {
    if (
      currentRoom?.status !== "intermission" ||
      !currentRoom.intermissionEndsAt
    ) {
      return;
    }

    const interval = setInterval(() => {
      const remainingTime = getRemainingIntermissionTime(
        currentRoom.intermissionEndsAt,
      );
      if (remainingTime !== null) {
        setIntermissionTime(remainingTime);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentRoom?.intermissionEndsAt, currentRoom?.status]);

  useEffect(() => {
    const frozenTime = currentRoom?.gameState?.frozenTimeLeft;
    if (
      frozenTime !== undefined &&
      frozenTime !== null &&
      currentRoom?.status === "intermission"
    ) {
      setTimeLeft(frozenTime);
      return;
    }

    if (myStatus === "eliminated") return;

    const startTime = currentRoom?.gameState?.startTime;
    const timerDuration = currentRoom?.gameState?.timerDuration;
    if (!startTime || !timerDuration) return;

    const update = () => {
      const remainingTime = getRemainingTurnTime(startTime, timerDuration) ?? 0;
      setTimeLeft(remainingTime);
      setTotalTime(timerDuration);
      if (remainingTime > 0) {
        animationFrameRef.current = requestAnimationFrame(update);
      }
    };

    update();
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [
    currentRoom?.gameState?.frozenTimeLeft,
    currentRoom?.gameState?.startTime,
    currentRoom?.gameState?.timerDuration,
    currentRoom?.status,
    myStatus,
  ]);

  // Emit events on status/intermission changes
  useEffect(() => {
    if (prevStatusRef.current !== status) {
      if (status === "intermission" && prevStatusRef.current === "playing" && currentRoom) {
        // Round just ended
        emit({
          type: "ROUND_END",
          round: currentRoom.gameState?.roundNumber || 1,
          eliminated: [], // Would need access to eliminated players
          timestamp: Date.now(),
        });
      }

      if (status === "intermission" && currentRoom?.intermissionEndsAt) {
        emit({
          type: "INTERMISSION_START",
          duration: currentRoom.intermissionEndsAt - Date.now(),
          streak: 0, // Could be passed in if needed
          round: currentRoom.gameState?.roundNumber || 1,
          timestamp: Date.now(),
        });
      } else if (status === "playing" && prevStatusRef.current === "intermission") {
        emit({
          type: "ROUND_START",
          round: currentRoom?.gameState?.roundNumber || 1,
          word: currentRoom?.gameState?.currentWord || "",
          players: currentRoom?.players ? Object.values(currentRoom.players).map(p => p.id) : [],
          timestamp: Date.now(),
        });
      } else if (status === "speaking" && prevStatusRef.current === "playing") {
        emit({
          type: "WORD_SPOKEN",
          word: currentRoom?.gameState?.currentWord || "",
          mode: currentRoom?.settings?.difficulty || "baby",
          timestamp: Date.now(),
        });
      }
      prevStatusRef.current = status;
    }
  }, [status, currentRoom, emit]);

  // Emit intermission time events for countdown
  useEffect(() => {
    if (status === "intermission" && intermissionTime !== prevIntermissionTimeRef.current) {
      if (intermissionTime <= 3 && intermissionTime > 0) {
        // Could emit countdown events if needed
      }
      prevIntermissionTimeRef.current = intermissionTime;
    }
  }, [status, intermissionTime]);

  return {
    intermissionTime,
    timeLeft,
    totalTime,
  };
};

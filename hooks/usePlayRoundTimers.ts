import { useEffect, useRef, useState } from "react";
import type { Room } from "../types/multiplayer";
import {
  getRemainingIntermissionTime,
  getRemainingTurnTime,
  shouldTriggerTurnTimeout,
} from "../services/playTimerUtils";

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

  return {
    intermissionTime,
    timeLeft,
    totalTime,
  };
};

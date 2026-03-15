export const getRemainingTurnTime = (
  startTime?: number | null,
  timerDuration?: number | null,
  now: number = Date.now(),
) => {
  if (!startTime || !timerDuration) {
    return null;
  }

  const elapsed = (now - startTime) / 1000;
  return Math.max(0, timerDuration - elapsed);
};

export const getRemainingIntermissionTime = (
  intermissionEndsAt?: number | null,
  now: number = Date.now(),
) => {
  if (!intermissionEndsAt) {
    return null;
  }

  const remainingSeconds = Math.ceil((intermissionEndsAt - now) / 1000);
  return Math.max(0, remainingSeconds);
};

export const shouldTriggerTurnTimeout = ({
  isMyTurn,
  status,
  myStatus,
  remainingTime,
}: {
  isMyTurn: boolean;
  status: "playing" | "intermission" | "speaking";
  myStatus: string;
  remainingTime: number | null;
}) => {
  if (!isMyTurn || status !== "playing" || remainingTime === null) {
    return false;
  }

  const canBeEliminated = myStatus === "alive" || myStatus === "connected";
  return canBeEliminated && remainingTime <= 0;
};

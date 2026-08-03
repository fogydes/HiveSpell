import { useEffect } from "react";
import { runTransaction, ref as dbRef } from "firebase/database";
import { db } from "../firebase";
import { awardProfileWin } from "../services/profileService";
import { logError, logSupabaseRpcError, logFirebaseError } from "../services/logger";
import { useGameplayEvents } from "./useGameplayEvents";
import { useBattlePass } from "./useBattlePass";

const WIN_AWARD_STORAGE_KEY = "hive_awarded_wins";

const getAwardedWins = (): string[] => {
  if (typeof window === "undefined") return [];

  try {
    const raw = sessionStorage.getItem(WIN_AWARD_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const hasAwardedWin = (awardKey: string): boolean => {
  return getAwardedWins().includes(awardKey);
};

const rememberAwardedWin = (awardKey: string) => {
  if (typeof window === "undefined") return;

  const nextAwards = [...getAwardedWins(), awardKey].slice(-20);
  sessionStorage.setItem(WIN_AWARD_STORAGE_KEY, JSON.stringify(nextAwards));
};

interface UseWinnerAwardArgs {
  intermissionEndsAt?: number | null;
  refreshUser: () => Promise<void>;
  roomId?: string | null;
  userDisplayName?: string | null;
  userId?: string | null;
  winnerId?: string | null;
}

export const useWinnerAward = ({
  intermissionEndsAt,
  refreshUser,
  roomId,
  userDisplayName,
  userId,
  winnerId,
}: UseWinnerAwardArgs) => {
  const { emit } = useGameplayEvents();
  const { addXp } = useBattlePass();

  useEffect(() => {
    if (!userId || !roomId || !winnerId || !intermissionEndsAt) {
      return;
    }

    if (winnerId !== userId) {
      return;
    }

    const awardKey = `${roomId}:${intermissionEndsAt}:${winnerId}`;
    if (hasAwardedWin(awardKey)) {
      return;
    }

    rememberAwardedWin(awardKey);

    awardProfileWin(userId, userDisplayName || "Player")
      .then(() => refreshUser())
      .catch((err: Error) => logSupabaseRpcError("awardProfileWin", err));

    runTransaction(
      dbRef(db, `rooms/${roomId}/players/${userId}/wins`),
      (current: number | null) => (current || 0) + 1,
    ).catch((err: Error) =>
      logFirebaseError("incrementRoomWins", err),
    );

    // Award XP for winning a round
    addXp(500); // Big XP bonus for winning

    // Emit victory event
    emit({
      type: "VICTORY",
      winnerId: userId,
      winnerName: userDisplayName || "Player",
      finalStats: {
        wpm: 0,
        streak: 0,
        correctWords: 0,
        durationMs: 0,
        place: 1,
      },
      timestamp: Date.now(),
    });
  }, [intermissionEndsAt, refreshUser, roomId, userDisplayName, userId, winnerId, emit, addXp]);
};

import { useEffect } from "react";
import { runTransaction, ref as dbRef } from "firebase/database";
import { db } from "../firebase";
import { awardProfileWin } from "../services/profileService";

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
      .catch((err: any) => console.error("Win award transaction failed:", err));

    runTransaction(
      dbRef(db, `rooms/${roomId}/players/${userId}/wins`),
      (current: any) => (current || 0) + 1,
    ).catch((err: any) =>
      console.error("Room win award transaction failed:", err),
    );
  }, [intermissionEndsAt, refreshUser, roomId, userDisplayName, userId, winnerId]);
};

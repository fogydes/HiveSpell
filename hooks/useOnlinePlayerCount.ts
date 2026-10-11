import { useEffect, useState } from "react";
import {
  ref,
  query,
  orderByChild,
  equalTo,
  limitToFirst,
  onValue,
} from "firebase/database";
import { db } from "../firebase";

/** Rooms older than this are treated as stale and excluded from the count. */
const ROOM_MAX_AGE_MS = 60 * 60 * 1000;
/** Mirrors the matchmaker's read cap; also bounds the payload we scan. */
const MAX_ROOMS = 50;

interface CountablePlayer {
  status?: string;
}
interface CountableRoom {
  status?: string;
  createdAt?: number;
  players?: Record<string, CountablePlayer>;
}

/**
 * Live count of players currently in public arenas — social proof for Home.
 *
 * Reads the SAME rules-permitted query the matchmaker uses
 * (`orderByChild("type").equalTo("public")`): a global `/rooms` read is denied
 * by the RTDB security rules and requires `auth != null`, so this only
 * subscribes when `enabled` (the viewer is signed in). It counts active
 * (non-disconnected) players across non-stale, unfinished public rooms and
 * updates live as rooms change.
 *
 * Returns `count: null` while unknown / on error (offline, rules denial, or the
 * unreachable dummy DB under E2E) so callers can simply hide the ticker rather
 * than render a wrong or fabricated number.
 */
export function useOnlinePlayerCount(enabled: boolean): { count: number | null } {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      setCount(null);
      return;
    }

    const publicRoomsQuery = query(
      ref(db, "rooms"),
      orderByChild("type"),
      equalTo("public"),
      limitToFirst(MAX_ROOMS),
    );

    const unsubscribe = onValue(
      publicRoomsQuery,
      (snapshot) => {
        if (!snapshot.exists()) {
          setCount(0);
          return;
        }
        const now = Date.now();
        const rooms = snapshot.val() as Record<string, CountableRoom>;
        let total = 0;
        for (const room of Object.values(rooms)) {
          if (room.status === "finished") continue;
          if (room.createdAt && now - room.createdAt > ROOM_MAX_AGE_MS) continue;
          const players = room.players ? Object.values(room.players) : [];
          total += players.filter((p) => p.status !== "disconnected").length;
        }
        setCount(total);
      },
      () => {
        // Rules denial / offline / unreachable DB (e.g. E2E) — stay "unknown".
        setCount(null);
      },
    );

    return () => unsubscribe();
  }, [enabled]);

  return { count };
}

export default useOnlinePlayerCount;

import { useCallback, useRef, useEffect, useState } from "react";

/**
 * Typed Gameplay Event Bus
 * Emitted from gameplay hooks (usePlayTurn, usePlayRoundTimers, useWinnerAward)
 * Consumed by SceneProvider, GameplayDirector, and theater components
 */

export type GameplayEvent =
  | { type: "WORD_SPOKEN"; word: string; mode: string; definition?: string; timestamp: number }
  | { type: "ANSWER_CORRECT"; word: string; wpm: number; streak: number; timeTakenMs: number; timestamp: number }
  | { type: "ANSWER_INCORRECT"; word: string; typed: string; timeTakenMs: number; timestamp: number }
  | { type: "TURN_HANDOFF"; from: string; to: string; timeLeft: number; round: number; timestamp: number }
  | { type: "PLAYER_ELIMINATED"; playerId: string; playerName: string; place: number; totalPlayers: number; timestamp: number }
  | { type: "VICTORY"; winnerId: string; winnerName: string; finalStats: { wpm: number; streak: number; correctWords: number; durationMs: number; place: number }; timestamp: number }
  | { type: "INTERMISSION_START"; duration: number; streak: number; round: number; timestamp: number }
  | { type: "ROUND_START"; round: number; word: string; players: string[]; timestamp: number }
  | { type: "ROUND_END"; round: number; eliminated: string[]; timestamp: number }
  | { type: "STREAK_MILESTONE"; streak: number; milestone: 5 | 10 | 15 | 20 | 25 | 30 | 40 | 50; timestamp: number }
  | { type: "WORD_REVEAL"; word: string; definition: string; timestamp: number };

type EventListener = (event: GameplayEvent) => void;

class GameplayEventBus {
  private listeners: Set<EventListener> = new Set();
  private eventHistory: GameplayEvent[] = [];
  private maxHistory = 100;

  subscribe(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(event: GameplayEvent) {
    // Add to history
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistory) {
      this.eventHistory.shift();
    }

    // Notify all listeners
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error("[GameplayEventBus] Listener error:", error);
      }
    });
  }

  getHistory(): GameplayEvent[] {
    return [...this.eventHistory];
  }

  clearHistory() {
    this.eventHistory = [];
  }

  getLastEventOfType<T extends GameplayEvent["type"]>(type: T): GameplayEvent | undefined {
    return this.eventHistory.findLast((e) => e.type === type);
  }
}

// Singleton instance
const gameplayEventBus = new GameplayEventBus();

/**
 * Get the global gameplay event bus instance
 */
export function getGameplayEventBus(): GameplayEventBus {
  return gameplayEventBus;
}

/**
 * Hook to access the gameplay event bus
 * Use this in hooks to emit events, and in components to subscribe
 */
export function useGameplayEmitter() {
  const bus = getGameplayEventBus();

  const emitWordSpoken = useCallback(
    (word: string, mode: string, definition?: string) => {
      bus.emit({
        type: "WORD_SPOKEN",
        word,
        mode,
        definition,
        timestamp: Date.now(),
      });
    },
    [bus]
  );

  const emitAnswerCorrect = useCallback(
    (word: string, wpm: number, streak: number, timeTakenMs: number) => {
      bus.emit({
        type: "ANSWER_CORRECT",
        word,
        wpm,
        streak,
        timeTakenMs,
        timestamp: Date.now(),
      });

      // Check for streak milestones
      if (streak > 0) {
        const milestones = [5, 10, 15, 20, 25, 30, 40, 50] as const;
        const hitMilestone = milestones.find((m) => streak === m);
        if (hitMilestone) {
          bus.emit({
            type: "STREAK_MILESTONE",
            streak,
            milestone: hitMilestone,
            timestamp: Date.now(),
          });
        }
      }
    },
    [bus]
  );

  const emitAnswerIncorrect = useCallback(
    (word: string, typed: string, timeTakenMs: number) => {
      bus.emit({
        type: "ANSWER_INCORRECT",
        word,
        typed,
        timeTakenMs,
        timestamp: Date.now(),
      });
    },
    [bus]
  );

  const emitTurnHandoff = useCallback(
    (from: string, to: string, timeLeft: number, round: number) => {
      bus.emit({
        type: "TURN_HANDOFF",
        from,
        to,
        timeLeft,
        round,
        timestamp: Date.now(),
      });
    },
    [bus]
  );

  const emitPlayerEliminated = useCallback(
    (playerId: string, playerName: string, place: number, totalPlayers: number) => {
      bus.emit({
        type: "PLAYER_ELIMINATED",
        playerId,
        playerName,
        place,
        totalPlayers,
        timestamp: Date.now(),
      });
    },
    [bus]
  );

  const emitVictory = useCallback(
    (winnerId: string, winnerName: string, finalStats: { wpm: number; streak: number; correctWords: number; durationMs: number; place: number }) => {
      bus.emit({
        type: "VICTORY",
        winnerId,
        winnerName,
        finalStats,
        timestamp: Date.now(),
      });
    },
    [bus]
  );

  const emitIntermissionStart = useCallback(
    (duration: number, streak: number, round: number) => {
      bus.emit({
        type: "INTERMISSION_START",
        duration,
        streak,
        round,
        timestamp: Date.now(),
      });
    },
    [bus]
  );

  const emitRoundStart = useCallback(
    (round: number, word: string, players: string[]) => {
      bus.emit({
        type: "ROUND_START",
        round,
        word,
        players,
        timestamp: Date.now(),
      });
    },
    [bus]
  );

  const emitRoundEnd = useCallback(
    (round: number, eliminated: string[]) => {
      bus.emit({
        type: "ROUND_END",
        round,
        eliminated,
        timestamp: Date.now(),
      });
    },
    [bus]
  );

  const emitWordReveal = useCallback(
    (word: string, definition: string) => {
      bus.emit({
        type: "WORD_REVEAL",
        word,
        definition,
        timestamp: Date.now(),
      });
    },
    [bus]
  );

  return {
    emitWordSpoken,
    emitAnswerCorrect,
    emitAnswerIncorrect,
    emitTurnHandoff,
    emitPlayerEliminated,
    emitVictory,
    emitIntermissionStart,
    emitRoundStart,
    emitRoundEnd,
    emitWordReveal,
  };
}

/**
 * Hook for components to subscribe to gameplay events
 * Returns latest event of each type for reactive UI
 */
export function useGameplayEvents() {
  const bus = getGameplayEventBus();
  const [events, setEvents] = useState<Record<GameplayEvent["type"], GameplayEvent | null>>({
    WORD_SPOKEN: null,
    ANSWER_CORRECT: null,
    ANSWER_INCORRECT: null,
    TURN_HANDOFF: null,
    PLAYER_ELIMINATED: null,
    VICTORY: null,
    INTERMISSION_START: null,
    ROUND_START: null,
    ROUND_END: null,
    STREAK_MILESTONE: null,
    WORD_REVEAL: null,
  });

  useEffect(() => {
    const unsubscribe = bus.subscribe((event) => {
      setEvents((prev) => ({
        ...prev,
        [event.type]: event,
      }));
    });

    return unsubscribe;
  }, [bus]);

  return {
    /** Latest event of each type (or null if never emitted) */
    latest: events,
    /** Full event history */
    history: bus.getHistory(),
    /** Get latest event of specific type */
    getLatest: <T extends GameplayEvent["type"]>(type: T) => events[type] as GameplayEvent | null,
    /** Clear event state */
    clear: () => bus.clearHistory(),
    /** Emit an event directly (for backward compatibility) */
    emit: (event: GameplayEvent) => bus.emit(event),
  };
}

/**
 * Hook for components that need to react to specific event types
 * Provides a callback that fires when the event type occurs
 */
export function useOnGameplayEvent<T extends GameplayEvent["type"]>(
  type: T,
  callback: (event: Extract<GameplayEvent, { type: T }>) => void,
  deps: React.DependencyList = []
) {
  const bus = getGameplayEventBus();

  useEffect(() => {
    const unsubscribe = bus.subscribe((event) => {
      if (event.type === type) {
        callback(event as Extract<GameplayEvent, { type: T }>);
      }
    });
    return unsubscribe;
  }, [bus, type, callback, ...deps]);
}

/**
 * Hook to check if a specific event type was recently emitted
 * Useful for triggering one-time animations
 */
export function useRecentGameplayEvent<T extends GameplayEvent["type"]>(
  type: T,
  windowMs: number = 2000
) {
  const { history } = useGameplayEvents();
  const { latest } = useGameplayEvents();
  const eventType = type;

  // Check latest event
  const latestEvent = latest[eventType] as Extract<GameplayEvent, { type: T }> | null;
  if (latestEvent && Date.now() - latestEvent.timestamp < windowMs) {
    return latestEvent;
  }

  // Check history for recent events
  const recentEvent = history
    .filter((e) => e.type === eventType)
    .find((e) => Date.now() - e.timestamp < windowMs);

  return (recentEvent as Extract<GameplayEvent, { type: T }>) ?? null;
}

// Re-export types
export type { EventListener };
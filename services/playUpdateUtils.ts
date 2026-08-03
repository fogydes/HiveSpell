import type { Player } from "../types/multiplayer";
import {
  calculateTurnDuration,
  findNextActiveTurnPlayer,
  getPostTurnState,
  getRoundTurnOrder,
} from "./playRoomUtils";

interface WinnerSummary {
  id: string;
  name: string;
}

export const INTERMISSION_DURATION_MS = 10000;
export const TURN_AUDIO_LEAD_MS = 1200;

/**
 * These functions are now DEPRECATED.
 *
 * With the Validated Driver pattern (Phase 0.5), room state mutations
 * are performed atomically via Supabase SECURITY DEFINER RPCs:
 * - start_game()
 * - pick_word()
 * - advance_turn()
 * - eliminate_player()
 * - restart_round()
 *
 * These Firebase RTDB update builders are kept for reference only.
 * The hooks now call Supabase RPCs directly instead of building
 * partial updates for Firebase RTDB.
 *
 * @deprecated Use Supabase RPCs instead
 */

// DEPRECATED: Was used for Firebase RTDB updates
// export const buildIntermissionRoomUpdate = ...
// export const buildNextTurnAfterEliminationUpdate = ...
// export const buildWordAssignmentUpdate = ...
// export const buildRoundRestartUpdate = ...
// export const buildPassTurnRoomUpdate = ...
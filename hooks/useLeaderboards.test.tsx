// @vitest-environment jsdom
//
// Unit tests for the useLeaderboards hook. The hook talks to Supabase only
// through `supabase.rpc(...)`, so the whole client is replaced with a bare
// `{ rpc }` mock and each test drives behaviour by choosing what that rpc
// resolves per RPC name.
//
// A subtlety worth stating: `refreshAll` runs its fetchers via `Promise.all`,
// but `refreshGlobal` synchronously flips a shared `loadingRef` guard before
// its first await, so `refreshFriends`/`refreshDaily`/`refreshMode` short-
// circuit on the *initial* mount load. Only `get_global_leaderboard` and
// `get_player_rank` actually fire on mount — the assertions below target those.
import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

vi.mock("../services/supabase", () => ({
  supabase: { rpc: vi.fn() },
}));

import { supabase } from "../services/supabase";
import { useLeaderboards } from "./useLeaderboards";
import type {
  GetGlobalLeaderboardResponse,
  GetPlayerRankResponse,
} from "../utils/leaderboards";

const rpc = supabase.rpc as unknown as Mock;

const globalRow: GetGlobalLeaderboardResponse = {
  user_id: "u1",
  username: "Ada",
  avatar_url: null,
  tier: "Gold",
  composite_score: 5000,
  global_rank: 1,
  is_current_user: true,
  games_won: 10,
  total_correct_words: 100,
  lifetime_nectar: 500,
  max_streak: 5,
  games_played: 20,
};

const playerRankRow: GetPlayerRankResponse = {
  leaderboard_type: "global",
  rank: 1,
  total_players: 42,
  score: 5000,
  metadata: {},
};

/** Route rpc calls by name; anything unlisted resolves empty-but-successful. */
function routeRpc(overrides: Record<string, { data: unknown; error: unknown }>) {
  rpc.mockImplementation((name: string) =>
    Promise.resolve(overrides[name] ?? { data: [], error: null }),
  );
}

beforeEach(() => {
  rpc.mockReset();
  routeRpc({});
});

describe("useLeaderboards", () => {
  it("loads the global leaderboard and player ranks on mount", async () => {
    routeRpc({
      get_global_leaderboard: { data: [globalRow], error: null },
      get_player_rank: { data: [playerRankRow], error: null },
    });

    const { result } = renderHook(() => useLeaderboards("u1"));

    // Starts in the loading state before the effect resolves.
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.globalLeaderboard?.entries).toHaveLength(1);
    expect(result.current.globalLeaderboard?.entries[0]).toMatchObject({
      userId: "u1",
      username: "Ada",
      compositeScore: 5000,
      globalRank: 1,
      isCurrentUser: true,
    });
    expect(result.current.playerRanks).toEqual([
      { leaderboardType: "global", rank: 1, totalPlayers: 42, score: 5000, metadata: {} },
    ]);
    expect(rpc).toHaveBeenCalledWith(
      "get_global_leaderboard",
      expect.objectContaining({ p_viewer_id: "u1", p_limit: 25, p_offset: 0 }),
    );
  });

  it("surfaces an error when the global leaderboard RPC fails", async () => {
    routeRpc({
      get_global_leaderboard: { data: null, error: new Error("rpc boom") },
    });

    const { result } = renderHook(() => useLeaderboards("u1"));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("rpc boom");
    expect(result.current.globalLeaderboard).toBeNull();
  });

  it("skips the player-rank RPC when there is no signed-in user", async () => {
    routeRpc({ get_global_leaderboard: { data: [globalRow], error: null } });

    const { result } = renderHook(() => useLeaderboards(null));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.playerRanks).toEqual([]);
    const calledRpcNames = rpc.mock.calls.map((call) => call[0]);
    expect(calledRpcNames).not.toContain("get_player_rank");
  });
});

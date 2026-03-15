import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockRpc,
  mockMaybeSingle,
  mockUpsert,
  mockEq,
  mockSelect,
  mockFrom,
} = vi.hoisted(() => {
  const mockRpc = vi.fn();
  const mockMaybeSingle = vi.fn();
  const mockUpsert = vi.fn();
  const mockEq = vi.fn(() => ({
    maybeSingle: mockMaybeSingle,
  }));
  const mockSelect = vi.fn(() => ({
    eq: mockEq,
  }));
  const mockFrom = vi.fn(() => ({
    select: mockSelect,
    upsert: mockUpsert,
  }));

  return {
    mockRpc,
    mockMaybeSingle,
    mockUpsert,
    mockEq,
    mockSelect,
    mockFrom,
  };
});

vi.mock("./supabase", () => ({
  supabase: {
    rpc: mockRpc,
    from: mockFrom,
  },
}));

import { applyCorrectAnswerReward, awardProfileWin } from "./profileService";

describe("profileService", () => {
  beforeEach(() => {
    mockRpc.mockReset();
    mockMaybeSingle.mockReset();
    mockUpsert.mockReset();
    mockEq.mockClear();
    mockSelect.mockClear();
    mockFrom.mockClear();
  });

  it("uses the win progression RPC when available", async () => {
    mockRpc.mockResolvedValue({ error: null });

    await awardProfileWin("user-1", "Fallback");

    expect(mockRpc).toHaveBeenCalledWith("award_profile_win", {
      p_user_id: "user-1",
      p_username: "Fallback",
    });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("falls back to a profile upsert when the win RPC is missing", async () => {
    mockRpc.mockResolvedValue({ error: { code: "PGRST202" } });
    mockMaybeSingle.mockResolvedValue({
      data: {
        id: "user-1",
        username: "SavedName",
        corrects: 1200,
        wins: 99,
        current_nectar: 15,
        lifetime_nectar: 40,
        inventory: ["theme_honey"],
        equipped_theme: "hive",
      },
      error: null,
    });
    mockUpsert.mockResolvedValue({ error: null });

    await awardProfileWin("user-1", "Fallback");

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "user-1",
        username: "SavedName",
        wins: 100,
        title: "Busy Bee",
      }),
      { onConflict: "id" },
    );
  });

  it("clamps fallback nectar rewards to zero to match the RPC path", async () => {
    mockRpc.mockResolvedValue({ error: { code: "42883" } });
    mockMaybeSingle.mockResolvedValue({
      data: {
        id: "user-2",
        username: "Existing",
        corrects: 999,
        wins: 100,
        current_nectar: 5,
        lifetime_nectar: 7,
        inventory: [],
        equipped_theme: "hive",
      },
      error: null,
    });
    mockUpsert.mockResolvedValue({ error: null });

    await applyCorrectAnswerReward("user-2", "Fallback", -20);

    expect(mockRpc).toHaveBeenCalledWith("apply_correct_answer_reward", {
      p_user_id: "user-2",
      p_username: "Fallback",
      p_nectar_to_add: 0,
    });
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "user-2",
        corrects: 1000,
        wins: 100,
        current_nectar: 5,
        lifetime_nectar: 7,
        title: "Busy Bee",
      }),
      { onConflict: "id" },
    );
  });
});

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

  it("does not fall back to client-side upsert when the win RPC is missing", async () => {
    mockRpc.mockResolvedValue({ error: { code: "PGRST202" } });

    await awardProfileWin("user-1", "Fallback");

    // Security: no client-side fallback — just logs and returns
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("clamps nectar to zero and does not fall back when RPC is missing", async () => {
    mockRpc.mockResolvedValue({ error: { code: "42883" } });

    await applyCorrectAnswerReward("user-2", "Fallback", -20);

    // Verifies the RPC was called with clamped value
    expect(mockRpc).toHaveBeenCalledWith("apply_correct_answer_reward", {
      p_user_id: "user-2",
      p_username: "Fallback",
      p_nectar_to_add: 0,
    });
    // Security: no client-side fallback
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockUpsert).not.toHaveBeenCalled();
  });
});

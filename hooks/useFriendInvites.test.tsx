// @vitest-environment jsdom
//
// Unit tests for the useFriendInvites hook. Two collaborators are mocked: the
// auth context (whose `user.uid` gates every fetch and the realtime effect) and
// the Supabase client (query-builder chain plus realtime channel lifecycle).
// The load-all-then-subscribe effect is the interesting surface — the mount
// path opens three channels and the cleanup must remove all three.
import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { makeQueryBuilder, makeChannelStub } from "../test-utils/supabaseMock";

vi.mock("@/context/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("@/services/supabase", () => ({
  supabase: { from: vi.fn(), channel: vi.fn(), removeChannel: vi.fn() },
}));

import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/services/supabase";
import { useFriendInvites } from "./useFriendInvites";

const useAuthMock = useAuth as unknown as Mock;
const from = supabase.from as unknown as Mock;
const channel = supabase.channel as unknown as Mock;
const removeChannel = supabase.removeChannel as unknown as Mock;

beforeEach(() => {
  useAuthMock.mockReset();
  from.mockReset();
  channel.mockReset();
  removeChannel.mockReset();

  useAuthMock.mockReturnValue({ user: { uid: "u1" } });
  from.mockImplementation(() => makeQueryBuilder({ data: [], error: null }));
  channel.mockImplementation(() => makeChannelStub());
  removeChannel.mockResolvedValue(undefined);
});

describe("useFriendInvites", () => {
  it("loads friend data, opens three realtime channels, and tears them down on unmount", async () => {
    const { result, unmount } = renderHook(() => useFriendInvites());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.friends).toEqual([]);
    expect(result.current.pendingInvites).toEqual([]);
    expect(channel).toHaveBeenCalledTimes(3);

    unmount();
    expect(removeChannel).toHaveBeenCalledTimes(3);
  });

  it("does not query or subscribe until a user is signed in", () => {
    useAuthMock.mockReturnValue({ user: null });

    const { result } = renderHook(() => useFriendInvites());

    expect(from).not.toHaveBeenCalled();
    expect(channel).not.toHaveBeenCalled();
    expect(result.current.friends).toEqual([]);
  });
});

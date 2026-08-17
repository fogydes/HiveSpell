// @vitest-environment jsdom
//
// Unit tests for the useChallenges hook. The hook reads through the Supabase
// query-builder chain (`supabase.from(...).select().eq()...`) and claims via
// `supabase.rpc`, so we replace the client with a bare `{ from, rpc }` mock and
// drive behaviour with the shared chainable builder stub.
import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { makeQueryBuilder } from "../test-utils/supabaseMock";

vi.mock("../services/supabase", () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}));

import { supabase } from "../services/supabase";
import { useChallenges } from "./useChallenges";

const from = supabase.from as unknown as Mock;

beforeEach(() => {
  from.mockReset();
  // Default: every table query resolves empty-but-successful.
  from.mockImplementation(() => makeQueryBuilder({ data: [], error: null }));
});

describe("useChallenges", () => {
  it("loads to an empty, error-free state when the tables are empty", async () => {
    const { result } = renderHook(() => useChallenges("u1"));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.challenges).toEqual([]);
    expect(result.current.summary).toBeNull();
    expect(from).toHaveBeenCalledWith("challenge_definitions");
  });

  it("short-circuits without querying when there is no signed-in user", async () => {
    const { result } = renderHook(() => useChallenges(null));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.challenges).toEqual([]);
    expect(result.current.summary).toBeNull();
    expect(from).not.toHaveBeenCalled();
  });

  it("surfaces the error message when a challenge query fails", async () => {
    from.mockImplementation(() =>
      makeQueryBuilder({ data: null, error: new Error("challenge boom") }),
    );

    const { result } = renderHook(() => useChallenges("u1"));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("challenge boom");
    expect(result.current.challenges).toEqual([]);
  });
});

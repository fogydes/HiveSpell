import { describe, expect, it } from "vitest";
import {
  INTERMISSION_DURATION_MS,
  TURN_AUDIO_LEAD_MS,
} from "./playUpdateUtils";

describe("playUpdateUtils (deprecated - RPC pattern now used)", () => {
  it("has correct constants", () => {
    expect(INTERMISSION_DURATION_MS).toBe(10000);
    expect(TURN_AUDIO_LEAD_MS).toBe(1200);
  });
});

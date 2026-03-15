import { describe, expect, it } from "vitest";
import {
  calculateTurnDuration,
  findNextActiveTurnPlayer,
  hasOtherConnectedRoomPlayer,
  getPostTurnState,
  getRoundTurnOrder,
} from "./playRoomUtils";
import type { Player } from "../types/multiplayer";

const makePlayer = (
  id: string,
  status: Player["status"],
  joinedAt = 0,
): Player => ({
  id,
  name: id,
  isHost: false,
  score: 0,
  corrects: 0,
  wins: 0,
  status,
  joinedAt,
});

describe("playRoomUtils", () => {
  it("calculates a bounded turn duration with streak ramping", () => {
    expect(calculateTurnDuration("bee", 0)).toBe(5);
    expect(calculateTurnDuration("encyclopedia", 20)).toBe(13.4);
    expect(calculateTurnDuration("a", 100)).toBe(2.5);
  });

  it("finds the next eligible player in turn order", () => {
    const eligiblePlayers = [
      makePlayer("p2", "alive"),
      makePlayer("p3", "connected"),
    ];

    expect(
      findNextActiveTurnPlayer(["p1", "p2", "p3"], "p1", eligiblePlayers),
    ).toBe("p2");
    expect(
      findNextActiveTurnPlayer(["p1", "p2", "p3"], "p2", eligiblePlayers),
    ).toBe("p3");
  });

  it("falls back to the first eligible player when current turn is missing", () => {
    const eligiblePlayers = [makePlayer("p2", "alive")];

    expect(findNextActiveTurnPlayer([], null, eligiblePlayers)).toBe("p2");
    expect(
      findNextActiveTurnPlayer(["p1", "p2"], "missing", eligiblePlayers),
    ).toBe("p2");
  });

  it("builds round turn order by join time", () => {
    const players = [
      makePlayer("p3", "alive", 30),
      makePlayer("p1", "connected", 10),
      makePlayer("p2", "eliminated", 20),
    ];

    expect(getRoundTurnOrder(players)).toEqual(["p1", "p3"]);
  });

  it("reports intermission when one player survives or everyone is out", () => {
    const players = [
      makePlayer("p1", "alive"),
      makePlayer("p2", "connected"),
      makePlayer("p3", "spectating"),
    ];

    expect(getPostTurnState(players, "p2")).toMatchObject({
      activePlayersCount: 2,
      shouldTriggerIntermission: true,
      someoneWon: true,
      everyoneEliminated: false,
    });

    expect(
      getPostTurnState([makePlayer("p1", "alive")], "p1"),
    ).toMatchObject({
      shouldTriggerIntermission: true,
      everyoneEliminated: true,
    });
  });

  it("only treats rooms with another non-disconnected player as multiplayer", () => {
    expect(hasOtherConnectedRoomPlayer([makePlayer("p1", "alive")], "p1")).toBe(
      false,
    );

    expect(
      hasOtherConnectedRoomPlayer(
        [makePlayer("p1", "alive"), makePlayer("p2", "disconnected")],
        "p1",
      ),
    ).toBe(false);

    expect(
      hasOtherConnectedRoomPlayer(
        [makePlayer("p1", "alive"), makePlayer("p2", "connected")],
        "p1",
      ),
    ).toBe(true);
  });
});

import { getWordDifficulty } from "./gameService";

const NECTAR_REWARDS: Record<string, number> = {
  baby: 6,
  cakewalk: 8,
  learner: 10,
  intermediate: 12,
  heated: 14,
  genius: 16,
  polymath: 18,
};

export const getCorrectAnswerNectarReward = (
  roomDifficulty: string | undefined,
  currentWord: string,
) => {
  let difficulty = roomDifficulty?.toLowerCase() || "baby";

  if (difficulty === "omniscient") {
    difficulty = getWordDifficulty(currentWord);
  }

  return {
    difficulty,
    nectarToAdd: NECTAR_REWARDS[difficulty] || NECTAR_REWARDS.baby,
  };
};

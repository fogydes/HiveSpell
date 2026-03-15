export const pickRandomWord = (
  words: string[],
  random: () => number = Math.random,
) => {
  if (words.length === 0) {
    throw new Error("Cannot pick a word from an empty list");
  }

  const index = Math.floor(random() * words.length);
  return words[index];
};

export const pickWordAvoidingRecent = (
  words: string[],
  recentWords: string[],
  random: () => number = Math.random,
) => {
  const availableWords = words.filter(
    (word) => !recentWords.includes(word.toLowerCase()),
  );

  return pickRandomWord(
    availableWords.length > 0 ? availableWords : words,
    random,
  );
};

export const appendRecentWord = (
  recentWords: string[],
  word: string,
  limit = 20,
) => [...recentWords, word.toLowerCase()].slice(-limit);

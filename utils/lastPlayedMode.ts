const LAST_MODE_KEY = "hive_last_mode";

/** Record the last difficulty/mode the player started, for quick-play resume. */
export const saveLastPlayedMode = (mode: string): void => {
  localStorage.setItem(LAST_MODE_KEY, mode);
};

/** Read the last played mode, or null if none has been recorded yet. */
export const getLastPlayedMode = (): string | null => {
  return localStorage.getItem(LAST_MODE_KEY);
};

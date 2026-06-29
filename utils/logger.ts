/**
 * Development-only logger.
 * In production builds these calls become no-ops, preventing
 * internal state from leaking into the browser console.
 */

const isDev = import.meta.env.DEV;

export const log = (...args: unknown[]) => {
  if (isDev) console.log(...args);
};

export const warn = (...args: unknown[]) => {
  if (isDev) console.warn(...args);
};

/** Always logs — use for genuine runtime errors that need visibility. */
export const error = (...args: unknown[]) => {
  console.error(...args);
};

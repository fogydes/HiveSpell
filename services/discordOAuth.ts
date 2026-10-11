/**
 * Discord OAuth2 (redirect) helpers.
 *
 * Discord is not a native/OIDC Firebase provider, so both flows are plain OAuth2
 * redirects: we bounce the browser to Discord and the returned `code` is
 * exchanged server-side by the Supabase `discord-auth` function.
 *
 * Two flows share this module, distinguished only by their redirect URI:
 *   - "login" -> /auth            : the function mints a Firebase custom token.
 *   - "link"  -> /link/discord    : the caller is already signed in, and the
 *                                  function records discord_id on their profile.
 * A dedicated link route is required because /auth redirects signed-in users
 * straight to /lobby, which would swallow the callback.
 *
 * Every redirect URI used here must also be registered in the Discord developer
 * portal (OAuth2 -> Redirects).
 */

export type DiscordOAuthMode = 'login' | 'link';

export const DISCORD_CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID ?? '';

/** Whether the Discord buttons should be offered at all. */
export const discordLoginEnabled = (): boolean =>
  import.meta.env.VITE_ENABLE_DISCORD_LOGIN === 'true' && !!DISCORD_CLIENT_ID;

const DISCORD_OAUTH_STATE_KEY = 'discord_oauth_state';

/** Sign-in redirect target. */
export const loginRedirectUri = (): string => `${window.location.origin}/auth`;

/** Account-linking redirect target. */
export const linkRedirectUri = (): string =>
  `${window.location.origin}/link/discord`;

export const redirectUriFor = (mode: DiscordOAuthMode): string =>
  mode === 'link' ? linkRedirectUri() : loginRedirectUri();

/**
 * Read and clear the CSRF state stored before the redirect. Single-use by
 * design: the callback compares it once and a refresh must not replay it.
 */
export const takeStoredOAuthState = (): string | null => {
  const state = sessionStorage.getItem(DISCORD_OAUTH_STATE_KEY);
  sessionStorage.removeItem(DISCORD_OAUTH_STATE_KEY);
  return state;
};

/**
 * Leave the app for Discord's consent screen. Never returns — the browser
 * navigates away and comes back to the mode's redirect URI with `?code&state`.
 */
export const startDiscordOAuth = (mode: DiscordOAuthMode): void => {
  const state = crypto.randomUUID();
  sessionStorage.setItem(DISCORD_OAUTH_STATE_KEY, state);
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: redirectUriFor(mode),
    response_type: 'code',
    scope: 'identify email',
    state,
  });
  window.location.assign(
    `https://discord.com/oauth2/authorize?${params.toString()}`,
  );
};

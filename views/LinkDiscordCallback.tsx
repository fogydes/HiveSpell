import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { SceneCanvasLayer } from '../components/scene';
import { linkRedirectUri, takeStoredOAuthState } from '../services/discordOAuth';

/**
 * Discord account-linking callback.
 *
 * Deliberately a separate route from `/auth`: that view bounces signed-in users
 * straight to `/lobby`, which would swallow this callback — and linking is only
 * ever reached while already signed in.
 *
 * The exchange itself runs server-side in the `discord-auth` Edge Function with
 * `mode: "link"`, authenticated by the caller's Firebase ID token. No custom
 * token comes back: the user stays signed in as themselves and the function
 * merely records `profiles.discord_id`.
 */

/** Pull the `error` field out of a non-2xx Edge Function response, if present. */
const readFunctionError = async (err: unknown): Promise<string | null> => {
  const context = (err as { context?: unknown } | null)?.context;
  if (!(context instanceof Response)) return null;
  try {
    const body = (await context.clone().json()) as { error?: string };
    return body?.error ?? null;
  } catch {
    return null;
  }
};

const LinkDiscordCallback: React.FC = () => {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const { showToast } = useToast();

  // Claimed synchronously so React 19 StrictMode's double-invoke can't replay
  // the single-use authorization code.
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const returnedState = params.get('state');
    const oauthError = params.get('error');

    const storedState = takeStoredOAuthState();
    // Strip the query so a refresh can't re-run the single-use exchange.
    window.history.replaceState({}, '', '/link/discord');

    const fail = (title: string, message: string) => {
      showToast({ title, message, variant: 'error' });
      navigate('/lobby', { replace: true });
    };

    if (!code && !oauthError) {
      // Direct visit with no callback payload — nothing to do here.
      navigate('/lobby', { replace: true });
      return;
    }
    if (oauthError) {
      fail('Linking cancelled', 'Discord linking was cancelled.');
      return;
    }
    if (!storedState || storedState !== returnedState) {
      fail(
        'Linking failed',
        'Security check failed (state mismatch). Please try again.',
      );
      return;
    }
    if (!auth.currentUser) {
      showToast({
        title: 'Sign in first',
        message: 'Log in before linking your Discord account.',
        variant: 'error',
      });
      navigate('/auth', { replace: true });
      return;
    }

    (async () => {
      try {
        const idToken = await auth.currentUser!.getIdToken();
        const { data, error: fnError } = await supabase.functions.invoke(
          'discord-auth',
          {
            body: {
              code,
              redirectUri: linkRedirectUri(),
              mode: 'link',
              idToken,
            },
          },
        );

        if (fnError) {
          const detail = await readFunctionError(fnError);
          if (detail === 'discord_already_linked') {
            fail(
              'Already linked',
              'That Discord account is already linked to another HiveSpell account.',
            );
            return;
          }
          throw new Error(detail ?? fnError.message);
        }
        if (!data?.linked) throw new Error('Linking failed');

        await refreshUser();
        showToast({
          title: 'Discord linked',
          message: 'You can now sign in with Discord.',
          variant: 'success',
        });
        navigate('/lobby', { replace: true });
      } catch (err) {
        console.error('Discord link error', err);
        fail('Linking failed', 'Could not link your Discord account.');
      }
    })();
    // Run once on mount: the callback payload is read from the URL, and the ref
    // above guards against a second invocation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="theme-scene relative flex min-h-screen items-center justify-center overflow-hidden bg-app p-4">
      <SceneCanvasLayer />
      <div className="theme-panel-shell relative z-10 w-full max-w-[430px] rounded-[2rem] border bg-panel/55 p-8 text-center backdrop-blur-xl">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.28em] text-text-muted">
          Connected accounts
        </p>
        <h2 data-display="true" className="text-2xl font-black text-text-main">
          Linking your <span className="text-primary">Discord</span> account…
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-text-muted">
          Hang tight — this only takes a moment.
        </p>
      </div>
    </div>
  );
};

export default LinkDiscordCallback;

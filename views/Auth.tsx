import React, { useEffect, useRef, useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  signInWithCustomToken,
  GoogleAuthProvider,
  type User,
} from 'firebase/auth';
import { ref, set, get } from 'firebase/database';
import { auth, db } from '../firebase';
import { supabase } from '../services/supabase';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SceneCanvasLayer } from '../components/scene';
import { DiscordIcon, GoogleIcon } from '../components/auth/ProviderIcons';
import {
  DISCORD_CLIENT_ID,
  discordLoginEnabled,
  loginRedirectUri,
  startDiscordOAuth,
  takeStoredOAuthState,
} from '../services/discordOAuth';

// --- Social sign-in --------------------------------------------------------

const sanitizeUsername = (raw: string): string => {
  const base = raw.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15);
  return base.length >= 3 ? base : `${base}bee`.slice(0, 15);
};

/** Reserve a unique username handle, mirroring the email-registration flow. */
const generateUniqueUsername = async (seed: string): Promise<string> => {
  const base = sanitizeUsername(seed);
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate =
      attempt === 0
        ? base
        : `${base.slice(0, 11)}${Math.floor(1000 + Math.random() * 9000)}`;
    const snap = await get(ref(db, `usernames/${candidate}`));
    if (!snap.exists()) return candidate;
  }
  return `${base.slice(0, 9)}${Date.now().toString().slice(-6)}`;
};

/** Optional profile hints from a social provider (custom-token users have empty Firebase fields). */
interface SocialProfile {
  displayName?: string | null;
  email?: string | null;
}

/**
 * First-time provisioning for a social-login user: create the RTDB `users/{uid}`
 * doc + `usernames/{handle}` reverse map, exactly as email registration does, so
 * AuthContext's onValue takes the normal migration path (and doesn't re-insert a
 * Supabase profile on every load). No-op for a returning user. `profile` supplies
 * the display name / email for custom-token users (e.g. Discord), whose Firebase
 * User carries no displayName/email of its own.
 */
const provisionSocialUser = async (
  u: User,
  profile?: SocialProfile,
): Promise<void> => {
  const existing = await get(ref(db, `users/${u.uid}`));
  if (existing.exists()) return;
  const email = profile?.email ?? u.email ?? '';
  const seed =
    profile?.displayName || u.displayName || (email ? email.split('@')[0] : '') || 'bee';
  const username = await generateUniqueUsername(seed);
  await set(ref(db, `users/${u.uid}`), { username, email });
  await set(ref(db, `usernames/${username}`), u.uid);
};

const Auth: React.FC = () => {
  const [emailOrUser, setEmailOrUser] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'discord' | null>(null);
  const navigate = useNavigate();

  const { user } = useAuth();

  // --- Discord OAuth2 redirect callback -----------------------------------
  // Discord redirects back to /auth?code=...&state=...; exchange the code via
  // the Supabase `discord-auth` function, then finish with a Firebase custom
  // token. A ref claims the callback synchronously so React 19 StrictMode's
  // double-invoke can't replay the single-use code.
  const discordCallbackHandled = useRef(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const returnedState = params.get('state');
    const oauthError = params.get('error');
    if (!code && !oauthError) return;
    if (discordCallbackHandled.current) return;
    discordCallbackHandled.current = true;

    const storedState = takeStoredOAuthState();
    // Strip the query so a refresh can't re-run the single-use exchange.
    window.history.replaceState({}, '', '/auth');

    if (oauthError) {
      setError('Discord sign-in was cancelled.');
      return;
    }
    if (!storedState || storedState !== returnedState) {
      setError('Discord sign-in failed (state mismatch). Please try again.');
      return;
    }

    setSocialLoading('discord');
    (async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke('discord-auth', {
          body: { code, redirectUri: loginRedirectUri() },
        });
        if (fnError || !data?.firebaseToken) {
          throw new Error(fnError?.message || 'Token exchange failed');
        }
        const credential = await signInWithCustomToken(auth, data.firebaseToken);
        await provisionSocialUser(credential.user, data.profile as SocialProfile | undefined);
        navigate('/lobby');
      } catch (err) {
        console.error('Discord callback error', err);
        setError('Discord sign-in failed. Please try again.');
      } finally {
        setSocialLoading(null);
      }
    })();
  }, [navigate]);

  // Redirect if already logged in
  if (user) {
    return <Navigate to="/lobby" replace />;
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        let emailToUse = emailOrUser;

        // Username Login Logic
        if (!emailOrUser.includes('@')) {
          // Clean input: remove spaces and lowercase to match storage format
          const cleanUser = emailOrUser.trim().replace(/\s/g, '').toLowerCase();
          
          // Use direct path reference to get the UID mapped to this username
          const snapshot = await get(ref(db, `usernames/${cleanUser}`));
          
          if (snapshot.exists()) {
            const uid = snapshot.val();
            // Now fetch the email associated with this UID
            const userSnapshot = await get(ref(db, `users/${uid}`));
            if (userSnapshot.exists() && userSnapshot.val().email) {
               emailToUse = userSnapshot.val().email;
            } else {
               throw new Error("User data invalid.");
            }
          } else {
            throw new Error("Username not found.");
          }
        }

        await signInWithEmailAndPassword(auth, emailToUse, password);
      } else {
        // Registration Logic
        // Username Availability Check
        const cleanUsername = username.trim().replace(/\s/g, '').toLowerCase();
        const usernameRef = ref(db, `usernames/${cleanUsername}`);
        const userSnap = await get(usernameRef);
        
        if (userSnap.exists()) {
          throw new Error("Username already taken.");
        }

        // 2. Create Auth User
        const userCredential = await createUserWithEmailAndPassword(auth, emailOrUser, password);
        const user = userCredential.user;

        // 3. Update Profile
        await updateProfile(user, { displayName: username.trim() });

        // 4. Create DB Entries
        await set(ref(db, `users/${user.uid}`), {
          username: username.trim(),
          email: emailOrUser,
        });

        // Link Username to UID
        // CRITICAL CHANGE: We now map the name to the UID, not the email.
        await set(ref(db, `usernames/${cleanUsername}`), user.uid);
      }
      navigate('/lobby');
    } catch (error: any) {
      console.error(error);
      let msg = error.message;
      if (msg.includes('auth/invalid-email')) msg = 'Invalid email address.';
      if (msg.includes('auth/user-not-found')) msg = 'User not found.';
      if (msg.includes('auth/wrong-password')) msg = 'Incorrect password.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSignIn = async (
    provider: GoogleAuthProvider,
    name: 'google',
  ) => {
    setError('');
    setSocialLoading(name);
    try {
      const result = await signInWithPopup(auth, provider);
      await provisionSocialUser(result.user);
      navigate('/lobby');
    } catch (err: any) {
      const code: string = err?.code ?? '';
      // User dismissed / superseded the popup — nothing worth surfacing.
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        return;
      }
      let msg = 'Social sign-in failed. Please try again.';
      if (code === 'auth/operation-not-allowed' || code === 'auth/configuration-not-found') {
        msg = "This sign-in method isn't enabled yet.";
      } else if (code === 'auth/account-exists-with-different-credential') {
        msg = 'An account already exists with this email. Use your original sign-in method.';
      } else if (code === 'auth/popup-blocked') {
        msg = 'Popup blocked — please allow popups and try again.';
      } else if (code === 'auth/network-request-failed') {
        msg = 'Network error. Please check your connection.';
      }
      console.error('Social sign-in error', err);
      setError(msg);
    } finally {
      setSocialLoading(null);
    }
  };

  const handleGoogle = () => handleSocialSignIn(new GoogleAuthProvider(), 'google');

  const handleDiscord = () => {
    if (!DISCORD_CLIENT_ID) {
      setError('Discord sign-in is not configured.');
      return;
    }
    setError('');
    setSocialLoading('discord');
    startDiscordOAuth('login');
  };

  const discordEnabled = discordLoginEnabled();
  const socialBusy = loading || socialLoading !== null;

  return (
    <div className="theme-scene relative min-h-screen flex items-center justify-center overflow-hidden bg-app p-4">
      <SceneCanvasLayer />
      <div className="theme-panel-shell relative z-10 w-full max-w-[430px] overflow-hidden rounded-[2rem] border bg-panel/55 p-8 backdrop-blur-xl">
        <div
          className="absolute top-0 left-1/2 h-1 w-full -translate-x-1/2 opacity-70"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, var(--primary) 50%, transparent 100%)",
          }}
        ></div>

        <div className="mb-8 text-center">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.28em] text-text-muted">
            Enter The Hive
          </p>
          <h2 data-display="true" className="text-3xl font-black text-text-main">
            <span className="text-primary">{isLogin ? 'Log in' : 'Sign up'}</span>
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-text-muted">
            Your profile, inventory, and arena progress follow you across the hive.
          </p>
        </div>

        {error && <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 py-2 text-center text-sm text-red-400">{error}</div>}

        <form onSubmit={handleAuth} className="space-y-4">
          
          {!isLogin && (
            <div>
              <label className="mb-2 ml-1 block text-xs font-bold text-text-muted">Username</label>
              <input 
                className="w-full rounded-xl border border-surface bg-surface/40 p-4 text-text-main transition-all placeholder:text-text-muted/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                type="text" 
                placeholder="Pick a username" 
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                required 
                minLength={3}
                maxLength={15}
              />
            </div>
          )}

          <div>
            <label className="mb-2 ml-1 block text-xs font-bold text-text-muted">
              {isLogin ? 'Email or Username' : 'Email'}
            </label>
            <input 
              className="w-full rounded-xl border border-surface bg-surface/40 p-4 text-text-main transition-all placeholder:text-text-muted/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              type={isLogin ? "text" : "email"}
              placeholder={isLogin ? "Enter email or username" : "Enter your email"}
              value={emailOrUser} 
              onChange={e => setEmailOrUser(e.target.value)} 
              required 
            />
          </div>
          
          <div>
             <label className="mb-2 ml-1 block text-xs font-bold text-text-muted">Password</label>
             <input 
              className="w-full rounded-xl border border-surface bg-surface/40 p-4 text-text-main transition-all placeholder:text-text-muted/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              type="password" 
              placeholder="Enter your password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
            />
          </div>

          <button
            disabled={socialBusy}
            className="mt-4 w-full rounded-xl bg-primary py-4 font-black tracking-[0.16em] text-app transition-all hover:scale-[var(--hover-scale)] disabled:cursor-not-allowed disabled:opacity-50"
            style={{ boxShadow: "var(--theme-shadow-glow)" }}
          >
            {loading ? 'Processing...' : (isLogin ? 'LOGIN' : 'SIGN UP')}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-surface" />
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-text-muted">or</span>
          <span className="h-px flex-1 bg-surface" />
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={handleGoogle}
            disabled={socialBusy}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-surface bg-surface/40 py-3.5 font-bold text-text-main transition-all hover:border-primary hover:bg-surface/60 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {socialLoading === 'google' ? (
              'Connecting…'
            ) : (
              <>
                <GoogleIcon />
                Continue with Google
              </>
            )}
          </button>

          {discordEnabled && (
            <button
              type="button"
              onClick={handleDiscord}
              disabled={socialBusy}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-surface bg-surface/40 py-3.5 font-bold text-text-main transition-all hover:border-primary hover:bg-surface/60 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {socialLoading === 'discord' ? (
                'Connecting…'
              ) : (
                <>
                  <DiscordIcon />
                  Continue with Discord
                </>
              )}
            </button>
          )}
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-text-muted">
            {isLogin ? 'Need an account?' : 'Already have an account?'}
            <button 
              className="ml-2 font-bold text-primary hover:underline" 
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
            >
              {isLogin ? 'Sign Up' : 'Log In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
export default Auth;

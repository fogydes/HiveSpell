// supabase/functions/discord-auth/index.ts
//
// Discord OAuth2 -> Firebase custom-token bridge, plus Discord account linking.
//
// Discord is a plain OAuth2 provider (no OIDC discovery document, no id_token),
// so it can't be wired into Firebase as a native/OIDC provider. This function
// performs the confidential-client half of the flow that must never run in the
// browser. Both modes start from an authorization `code`:
//
//   mode: "login" (the default — omitting `mode` keeps the original behaviour)
//     1. Exchange the `code` for a Discord access token.
//     2. Fetch the Discord user (GET /users/@me).
//     3. Resolve profiles.discord_id -> an existing HiveSpell uid. If this
//        Discord identity has been linked to an account, sign in as THAT uid;
//        otherwise fall back to the standalone `discord:<discord user id>`.
//     4. Mint a Firebase *custom token* — an RS256 JWT signed with a Google
//        service-account key — for the resolved uid.
//     The browser then calls signInWithCustomToken() with the returned token.
//
//   mode: "link" (caller is already signed in and sends its Firebase ID token)
//     1-2. Same code exchange + profile fetch.
//     3.   Verify the caller's Firebase ID token against Google's public keys to
//          learn its uid — the request authenticates itself with that token,
//          since there is no Supabase JWT here (verify_jwt is off).
//     4.   Record discord_id on that profile using the service-role key. No
//          custom token is minted: the caller stays signed in as themselves.
//
// Deploy with verify_jwt = false: a login caller is signing IN, so it has no
// Firebase JWT yet. The Discord client secret, the service-account key and the
// Supabase service-role key live only in Supabase function secrets — never in
// the client bundle.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import {
  create,
  decode,
  getNumericDate,
  verify,
} from 'https://deno.land/x/djwt@v3.0.2/mod.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const DISCORD_CLIENT_ID = Deno.env.get('DISCORD_CLIENT_ID') ?? '';
const DISCORD_CLIENT_SECRET = Deno.env.get('DISCORD_CLIENT_SECRET') ?? '';
// The full service-account JSON (Firebase Console -> Project settings -> Service
// accounts -> Generate new private key), pasted verbatim as a single secret.
const FIREBASE_SERVICE_ACCOUNT = Deno.env.get('FIREBASE_SERVICE_ACCOUNT') ?? '';
// Used to read/write profiles.discord_id past RLS. Supabase injects these two in
// production, but they must also be set explicitly as secrets for local serve.
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

// Firebase custom tokens are verified against this fixed audience.
const IDENTITY_TOOLKIT_AUD =
  'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit';

// Public keys Firebase signs ID tokens with, in JWK form. The sibling x509
// endpoint returns certificates, which WebCrypto cannot parse.
const SECURETOKEN_JWKS_URL =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id?: string;
}

/** Convert a PEM PKCS#8 private key into a WebCrypto RS256 signing key. */
async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const normalized = pem.replace(/\\n/g, '\n');
  const der = normalized
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s+/g, '');
  const bytes = Uint8Array.from(atob(der), (c) => c.charCodeAt(0));
  return await crypto.subtle.importKey(
    'pkcs8',
    bytes,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

/** Build a Firebase custom token (RS256 JWT) for the given uid. */
async function mintFirebaseCustomToken(
  sa: ServiceAccount,
  uid: string,
  claims: Record<string, unknown>,
): Promise<string> {
  const key = await importPrivateKey(sa.private_key);
  return await create(
    { alg: 'RS256', typ: 'JWT' },
    {
      iss: sa.client_email,
      sub: sa.client_email,
      aud: IDENTITY_TOOLKIT_AUD,
      iat: getNumericDate(0),
      exp: getNumericDate(60 * 60),
      uid,
      claims,
    },
    key,
  );
}

// --- Firebase ID token verification (link mode) ----------------------------

/** kid -> verification key. Cached for the isolate's lifetime; refetched on miss. */
let jwksCache: Map<string, CryptoKey> | null = null;

async function loadVerificationKey(kid: string): Promise<CryptoKey> {
  const cached = jwksCache?.get(kid);
  if (cached) return cached;

  const res = await fetch(SECURETOKEN_JWKS_URL);
  if (!res.ok) throw new Error('Could not fetch Google signing keys');
  const { keys } = (await res.json()) as {
    keys: Array<JsonWebKey & { kid?: string }>;
  };

  const fresh = new Map<string, CryptoKey>();
  for (const jwk of keys) {
    if (!jwk.kid) continue;
    fresh.set(
      jwk.kid,
      await crypto.subtle.importKey(
        'jwk',
        jwk,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['verify'],
      ),
    );
  }
  jwksCache = fresh;

  const key = fresh.get(kid);
  if (!key) throw new Error('Unknown ID token signing key');
  return key;
}

/**
 * Verify a Firebase ID token and return its uid. djwt checks the signature and
 * the exp/nbf window; issuer and audience are asserted here because they are
 * what bind the token to *our* Firebase project rather than any other.
 */
async function verifyFirebaseIdToken(
  idToken: string,
  projectId: string,
): Promise<string> {
  const [header] = decode(idToken) as [
    { alg?: string; kid?: string },
    unknown,
    unknown,
  ];
  if (header.alg !== 'RS256' || !header.kid) {
    throw new Error('Unexpected ID token header');
  }
  const key = await loadVerificationKey(header.kid);
  const payload = (await verify(idToken, key)) as {
    aud?: string;
    iss?: string;
    sub?: string;
  };
  if (payload.aud !== projectId) throw new Error('ID token audience mismatch');
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new Error('ID token issuer mismatch');
  }
  if (!payload.sub) throw new Error('ID token has no subject');
  return payload.sub;
}

/** Service-role Supabase client — bypasses RLS, so it never leaves this file. */
const adminClient = () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase admin credentials are not configured');
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    if (
      !DISCORD_CLIENT_ID ||
      !DISCORD_CLIENT_SECRET ||
      !FIREBASE_SERVICE_ACCOUNT
    ) {
      return json({ error: 'Server is not configured' }, 500);
    }

    let sa: ServiceAccount;
    try {
      sa = JSON.parse(FIREBASE_SERVICE_ACCOUNT);
      if (!sa.client_email || !sa.private_key) throw new Error('missing fields');
    } catch {
      return json({ error: 'Invalid FIREBASE_SERVICE_ACCOUNT secret' }, 500);
    }

    let code: string;
    let redirectUri: string;
    let mode: 'login' | 'link' = 'login';
    let idToken: string | undefined;
    try {
      const body = await req.json();
      code = body.code;
      redirectUri = body.redirectUri;
      if (body.mode === 'link') mode = 'link';
      idToken = body.idToken;
      if (!code || !redirectUri) throw new Error('missing');
    } catch {
      return json({ error: 'Expected JSON body { code, redirectUri }' }, 400);
    }

    // Authenticate the linking caller *before* spending the single-use code, so a
    // rejected request can simply be retried.
    let callerUid: string | null = null;
    if (mode === 'link') {
      if (!sa.project_id) {
        return json(
          { error: 'FIREBASE_SERVICE_ACCOUNT is missing project_id' },
          500,
        );
      }
      if (!idToken) {
        return json({ error: 'Linking requires idToken' }, 401);
      }
      try {
        callerUid = await verifyFirebaseIdToken(idToken, sa.project_id);
      } catch (err) {
        console.error('ID token verification failed', err);
        return json({ error: 'Invalid Firebase ID token' }, 401);
      }
    }

    // 1. Exchange the authorization code for a Discord access token. Discord
    //    validates redirect_uri against the code + the app's registered list.
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
      }),
    });
    if (!tokenRes.ok) {
      const detail = await tokenRes.text();
      return json({ error: 'Discord token exchange failed', detail }, 401);
    }
    const token = await tokenRes.json();

    // 2. Fetch the Discord user profile.
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    if (!userRes.ok) {
      const detail = await userRes.text();
      return json({ error: 'Discord profile fetch failed', detail }, 401);
    }
    const discord = await userRes.json();

    // Discord's newer "global_name" is the display name; fall back to username.
    const displayName: string =
      discord.global_name || discord.username || 'bee';
    const email: string | null = discord.email ?? null;
    const discordId: string = discord.id;

    // --- link: attach this Discord identity to the caller's own profile -----
    if (mode === 'link' && callerUid) {
      const admin = adminClient();

      // A Discord identity may back at most one profile, so a conflict has to be
      // reported rather than silently stealing the link.
      const { data: holder, error: lookupError } = await admin
        .from('profiles')
        .select('id')
        .eq('discord_id', discordId)
        .maybeSingle();
      if (lookupError) {
        console.error('discord_id lookup failed', lookupError);
        return json({ error: 'Could not check existing links' }, 500);
      }
      if (holder && holder.id !== callerUid) {
        return json({ error: 'discord_already_linked' }, 409);
      }

      const { error: updateError } = await admin
        .from('profiles')
        .update({ discord_id: discordId })
        .eq('id', callerUid);
      if (updateError) {
        console.error('discord_id write failed', updateError);
        return json({ error: 'Could not save the link' }, 500);
      }

      return json({ linked: true, profile: { discordId, displayName, email } });
    }

    // --- login: resolve a linked account, else the standalone Discord uid ---
    // The fallback uid namespaces Discord ids so they can't collide with
    // Firebase/Google uids (colon is a legal RTDB key char).
    let uid = `discord:${discordId}`;
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const { data: linked, error: linkLookupError } = await adminClient()
        .from('profiles')
        .select('id')
        .eq('discord_id', discordId)
        .maybeSingle();
      if (linkLookupError) {
        // Non-fatal: fall back to the standalone uid rather than block sign-in.
        console.error('link resolution failed', linkLookupError);
      } else if (linked?.id) {
        uid = linked.id;
      }
    }

    // 3. Mint the Firebase custom token for the resolved uid.
    const firebaseToken = await mintFirebaseCustomToken(sa, uid, {
      provider: 'discord',
      discord_id: discordId,
    });

    return json({ firebaseToken, profile: { uid, displayName, email } });
  } catch (err) {
    console.error('discord-auth error', err);
    return json({ error: 'Internal error' }, 500);
  }
});

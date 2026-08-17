-- Create friend invites and presence system
-- This migration adds the missing friend_invites table, presence columns to profiles,
-- and all RPC functions needed by the useFriendInvites hook.

-- 1. Add presence columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS presence_status TEXT DEFAULT 'offline'
  CHECK (presence_status IN ('offline', 'online', 'in_lobby', 'in_game', 'spectating')),
ADD COLUMN IF NOT EXISTS current_room_id TEXT,
ADD COLUMN IF NOT EXISTS current_activity TEXT,
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT timezone('utc', now());

-- 2. Create friend_invites table
CREATE TABLE IF NOT EXISTS public.friend_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invite_code TEXT NOT NULL UNIQUE,
  inviter_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invitee_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT (timezone('utc', now()) + interval '7 days') NOT NULL,
  accepted_at TIMESTAMPTZ
);

-- Indexes for friend_invites
CREATE INDEX IF NOT EXISTS idx_friend_invites_inviter ON public.friend_invites(inviter_id);
CREATE INDEX IF NOT EXISTS idx_friend_invites_invitee ON public.friend_invites(invitee_id);
CREATE INDEX IF NOT EXISTS idx_friend_invites_code ON public.friend_invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_friend_invites_status ON public.friend_invites(status);
CREATE INDEX IF NOT EXISTS idx_friend_invites_expires ON public.friend_invites(expires_at);

-- Enable RLS on friend_invites
ALTER TABLE public.friend_invites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for friend_invites
DROP POLICY IF EXISTS "Users can view own invites" ON public.friend_invites;
CREATE POLICY "Users can view own invites"
  ON public.friend_invites FOR SELECT
  USING (
    inviter_id = (select auth.jwt()->>'sub')
    OR invitee_id = (select auth.jwt()->>'sub')
    OR (select auth.jwt()->>'sub') IS NULL
  );

DROP POLICY IF EXISTS "Users can create invites as themselves" ON public.friend_invites;
CREATE POLICY "Users can create invites as themselves"
  ON public.friend_invites FOR INSERT
  WITH CHECK (
    inviter_id = (select auth.jwt()->>'sub')
    OR (select auth.jwt()->>'sub') IS NULL
  );

DROP POLICY IF EXISTS "Invitees can accept/decline" ON public.friend_invites;
CREATE POLICY "Invitees can accept/decline"
  ON public.friend_invites FOR UPDATE
  USING (
    invitee_id = (select auth.jwt()->>'sub')
    OR inviter_id = (select auth.jwt()->>'sub')
    OR (select auth.jwt()->>'sub') IS NULL
  );

-- 3. Helper function to generate invite codes
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 8-character alphanumeric code
    v_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    SELECT EXISTS(SELECT 1 FROM public.friend_invites WHERE invite_code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_code;
END;
$$;

-- 4. RPC: Get pending invites for a user (incoming)
CREATE OR REPLACE FUNCTION public.get_pending_invites(
  p_user_id TEXT DEFAULT NULL
)
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT;
BEGIN
  -- Use provided user_id or extract from JWT
  v_user_id := COALESCE(p_user_id, auth.jwt()->>'sub');
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT jsonb_build_object(
    'id', fi.id,
    'invite_code', fi.invite_code,
    'inviter_id', fi.inviter_id,
    'inviter_username', p.username,
    'inviter_avatar_url', p.avatar_url,
    'created_at', fi.created_at,
    'expires_at', fi.expires_at
  )
  FROM public.friend_invites fi
  JOIN public.profiles p ON p.id = fi.inviter_id
  WHERE fi.invitee_id = v_user_id
    AND fi.status = 'pending'
    AND fi.expires_at > timezone('utc', now())
  ORDER BY fi.created_at DESC;
END;
$$;

-- 5. RPC: Get sent invites for a user (outgoing)
CREATE OR REPLACE FUNCTION public.get_sent_invites(
  p_user_id TEXT DEFAULT NULL
)
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.jwt()->>'sub');
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT jsonb_build_object(
    'id', fi.id,
    'invite_code', fi.invite_code,
    'invitee_id', fi.invitee_id,
    'invitee_username', p.username,
    'status', fi.status,
    'created_at', fi.created_at,
    'expires_at', fi.expires_at
  )
  FROM public.friend_invites fi
  LEFT JOIN public.profiles p ON p.id = fi.invitee_id
  WHERE fi.inviter_id = v_user_id
  ORDER BY fi.created_at DESC;
END;
$$;

-- 6. RPC: Get friends with presence for a user
CREATE OR REPLACE FUNCTION public.get_friends_with_presence(
  p_user_id TEXT DEFAULT NULL
)
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.jwt()->>'sub');
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT jsonb_build_object(
    'id', p.id,
    'username', p.username,
    'avatar_url', p.avatar_url,
    'tier', COALESCE(p.tier, 'Bronze'),
    'presence_status', COALESCE(p.presence_status, 'offline'),
    'current_room_id', p.current_room_id,
    'current_activity', p.current_activity,
    'last_seen', COALESCE(p.last_seen, p.updated_at, p.created_at),
    'is_online', COALESCE(p.presence_status, 'offline') != 'offline'
  )
  FROM public.profiles p
  WHERE p.id IN (
    SELECT CASE
      WHEN f.requester_id = v_user_id THEN f.addressee_id
      ELSE f.requester_id
    END
    FROM public.friendships f
    WHERE (f.requester_id = v_user_id OR f.addressee_id = v_user_id)
      AND f.status = 'accepted'
  )
  ORDER BY
    CASE COALESCE(p.presence_status, 'offline')
      WHEN 'in_game' THEN 1
      WHEN 'spectating' THEN 2
      WHEN 'in_lobby' THEN 3
      WHEN 'online' THEN 4
      ELSE 5
    END,
    p.username;
END;
$$;

-- 7. RPC: Get online friends for a user
CREATE OR REPLACE FUNCTION public.get_online_friends(
  p_user_id TEXT DEFAULT NULL
)
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.jwt()->>'sub');
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT jsonb_build_object(
    'id', p.id,
    'username', p.username,
    'avatar_url', p.avatar_url,
    'presence_status', p.presence_status,
    'current_room_id', p.current_room_id,
    'current_activity', p.current_activity,
    'last_seen', COALESCE(p.last_seen, p.updated_at, p.created_at)
  )
  FROM public.profiles p
  WHERE p.id IN (
    SELECT CASE
      WHEN f.requester_id = v_user_id THEN f.addressee_id
      ELSE f.requester_id
    END
    FROM public.friendships f
    WHERE (f.requester_id = v_user_id OR f.addressee_id = v_user_id)
      AND f.status = 'accepted'
  )
  AND p.presence_status != 'offline'
  ORDER BY
    CASE p.presence_status
      WHEN 'in_game' THEN 1
      WHEN 'spectating' THEN 2
      WHEN 'in_lobby' THEN 3
      WHEN 'online' THEN 4
      ELSE 5
    END,
    p.username;
END;
$$;

-- 8. RPC: Create a shareable friend invite
CREATE OR REPLACE FUNCTION public.create_friend_invite(
  p_user_id TEXT DEFAULT NULL
)
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT;
  v_invite_code TEXT;
  v_inviter_username TEXT;
  v_inviter_avatar_url TEXT;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.jwt()->>'sub');
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Get inviter's profile
  SELECT username, avatar_url INTO v_inviter_username, v_inviter_avatar_url
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_inviter_username IS NULL THEN
    RETURN QUERY SELECT jsonb_build_object('error', 'User profile not found');
    RETURN;
  END IF;

  -- Generate invite code
  v_invite_code := public.generate_invite_code();

  -- Insert invite (no invitee = shareable link)
  INSERT INTO public.friend_invites (invite_code, inviter_id, invitee_id, status)
  VALUES (v_invite_code, v_user_id, NULL, 'pending');

  RETURN QUERY
  SELECT jsonb_build_object(
    'invite_code', v_invite_code,
    'invite_url', 'https://hivespell.com/invite/' || v_invite_code,
    'expires_at', (timezone('utc', now()) + interval '7 days')
  );
END;
$$;

-- 9. RPC: Create a direct friend invite to a specific user
CREATE OR REPLACE FUNCTION public.create_direct_friend_invite(
  p_invitee_id TEXT,
  p_user_id TEXT DEFAULT NULL
)
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT;
  v_invite_code TEXT;
  v_existing_friendship BOOLEAN;
  v_existing_invite BOOLEAN;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.jwt()->>'sub');
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT jsonb_build_object('error', 'Unauthorized');
    RETURN;
  END IF;

  IF v_user_id = p_invitee_id THEN
    RETURN QUERY SELECT jsonb_build_object('error', 'Cannot invite yourself');
    RETURN;
  END IF;

  -- Check if already friends
  SELECT EXISTS(
    SELECT 1 FROM public.friendships
    WHERE ((requester_id = v_user_id AND addressee_id = p_invitee_id)
       OR (requester_id = p_invitee_id AND addressee_id = v_user_id))
      AND status = 'accepted'
  ) INTO v_existing_friendship;

  IF v_existing_friendship THEN
    RETURN QUERY SELECT jsonb_build_object('error', 'Already friends');
    RETURN;
  END IF;

  -- Check for existing pending invite (either direction)
  SELECT EXISTS(
    SELECT 1 FROM public.friend_invites
    WHERE ((inviter_id = v_user_id AND invitee_id = p_invitee_id)
       OR (inviter_id = p_invitee_id AND invitee_id = v_user_id))
      AND status = 'pending'
      AND expires_at > timezone('utc', now())
  ) INTO v_existing_invite;

  IF v_existing_invite THEN
    RETURN QUERY SELECT jsonb_build_object('error', 'Invite already pending');
    RETURN;
  END IF;

  -- Generate invite code
  v_invite_code := public.generate_invite_code();

  -- Insert direct invite
  INSERT INTO public.friend_invites (invite_code, inviter_id, invitee_id, status)
  VALUES (v_invite_code, v_user_id, p_invitee_id, 'pending');

  RETURN QUERY
  SELECT jsonb_build_object(
    'invite_code', v_invite_code,
    'invite_url', 'https://hivespell.com/invite/' || v_invite_code,
    'expires_at', (timezone('utc', now()) + interval '7 days')
  );
END;
$$;

-- 10. RPC: Accept a friend invite
CREATE OR REPLACE FUNCTION public.accept_friend_invite(
  p_invite_code TEXT,
  p_user_id TEXT DEFAULT NULL
)
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT;
  v_invite friend_invites%ROWTYPE;
  v_inviter_username TEXT;
  v_friendship_id UUID;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.jwt()->>'sub');
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT jsonb_build_object('error', 'Unauthorized');
    RETURN;
  END IF;

  -- Get the invite
  SELECT * INTO v_invite
  FROM public.friend_invites
  WHERE invite_code = p_invite_code
    AND invitee_id = v_user_id
    AND status = 'pending'
    AND expires_at > timezone('utc', now())
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT jsonb_build_object('error', 'Invalid or expired invite');
    RETURN;
  END IF;

  -- Check if already friends (shouldn't happen but safety check)
  IF EXISTS(
    SELECT 1 FROM public.friendships
    WHERE ((requester_id = v_invite.inviter_id AND addressee_id = v_user_id)
       OR (requester_id = v_user_id AND addressee_id = v_invite.inviter_id))
      AND status = 'accepted'
  ) THEN
    -- Already friends - just update invite status
    UPDATE public.friend_invites SET status = 'accepted', accepted_at = timezone('utc', now()) WHERE id = v_invite.id;
    RETURN QUERY SELECT jsonb_build_object('error', 'Already friends');
    RETURN;
  END IF;

  -- Create friendship
  INSERT INTO public.friendships (requester_id, addressee_id, status)
  VALUES (v_invite.inviter_id, v_user_id, 'accepted')
  RETURNING id INTO v_friendship_id;

  -- Update invite status
  UPDATE public.friend_invites SET status = 'accepted', accepted_at = timezone('utc', now()) WHERE id = v_invite.id;

  -- Get inviter username for response
  SELECT username INTO v_inviter_username FROM public.profiles WHERE id = v_invite.inviter_id;

  RETURN QUERY
  SELECT jsonb_build_object(
    'friend_id', v_invite.inviter_id,
    'friend_username', v_inviter_username,
    'friendship_id', v_friendship_id
  );
END;
$$;

-- 11. RPC: Decline a friend invite
CREATE OR REPLACE FUNCTION public.decline_friend_invite(
  p_invite_code TEXT,
  p_user_id TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.jwt()->>'sub');
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.friend_invites
  SET status = 'declined'
  WHERE invite_code = p_invite_code
    AND invitee_id = v_user_id
    AND status = 'pending';
END;
$$;

-- 12. RPC: Update user presence
CREATE OR REPLACE FUNCTION public.update_presence(
  p_status TEXT,
  p_room_id TEXT DEFAULT NULL,
  p_activity TEXT DEFAULT NULL,
  p_user_id TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.jwt()->>'sub');
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Validate status
  IF p_status NOT IN ('offline', 'online', 'in_lobby', 'in_game', 'spectating') THEN
    RAISE EXCEPTION 'Invalid presence status: %', p_status;
  END IF;

  UPDATE public.profiles
  SET
    presence_status = p_status,
    current_room_id = p_room_id,
    current_activity = p_activity,
    last_seen = timezone('utc', now()),
    updated_at = timezone('utc', now())
  WHERE id = v_user_id;
END;
$$;

-- 13. Grant permissions
REVOKE EXECUTE ON FUNCTION public.get_pending_invites(TEXT) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_sent_invites(TEXT) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_friends_with_presence(TEXT) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_online_friends(TEXT) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.create_friend_invite(TEXT) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.create_direct_friend_invite(TEXT, TEXT) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.accept_friend_invite(TEXT, TEXT) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.decline_friend_invite(TEXT, TEXT) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.update_presence(TEXT, TEXT, TEXT, TEXT) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.get_pending_invites(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sent_invites(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_friends_with_presence(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_online_friends(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_friend_invite(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_direct_friend_invite(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_friend_invite(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decline_friend_invite(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_presence(TEXT, TEXT, TEXT, TEXT) TO authenticated;
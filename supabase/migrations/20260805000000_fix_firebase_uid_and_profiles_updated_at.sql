-- Fix Firebase UID type mismatch in player_challenges table
-- and add updated_at column to profiles table

-- 1. Add updated_at column to profiles (for presence RPCs that reference it)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc', now());

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS handle_updated_at ON public.profiles;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 2. Fix player_challenges table to use TEXT for user_id (Firebase UIDs)
-- First, drop the foreign key constraint and recreate with correct type
ALTER TABLE public.player_challenges
DROP CONSTRAINT IF EXISTS player_challenges_user_id_fkey;

ALTER TABLE public.player_challenges
ALTER COLUMN user_id TYPE TEXT;

-- Add comment explaining Firebase UIDs
COMMENT ON COLUMN public.player_challenges.user_id IS 'Firebase Auth UID (TEXT, not UUID)';

-- 3. Update RLS policies on player_challenges to use auth.jwt()->>'sub'
DROP POLICY IF EXISTS "player_challenges_select_own" ON public.player_challenges;
CREATE POLICY "player_challenges_select_own" ON public.player_challenges
    FOR SELECT TO authenticated
    USING (user_id = (select auth.jwt()->>'sub'));

DROP POLICY IF EXISTS "player_challenges_upsert_own" ON public.player_challenges;
CREATE POLICY "player_challenges_upsert_own" ON public.player_challenges
    FOR INSERT TO authenticated
    WITH CHECK (user_id = (select auth.jwt()->>'sub'));

DROP POLICY IF EXISTS "player_challenges_update_own" ON public.player_challenges;
CREATE POLICY "player_challenges_update_own" ON public.player_challenges
    FOR UPDATE TO authenticated
    USING (user_id = (select auth.jwt()->>'sub'))
    WITH CHECK (user_id = (select auth.jwt()->>'sub'));

-- 4. Update RPC functions to accept TEXT for p_user_id instead of UUID
-- 4a. get_player_challenges
CREATE OR REPLACE FUNCTION public.get_player_challenges(p_user_id TEXT, p_season_id TEXT)
RETURNS TABLE (
    challenge_id TEXT,
    type TEXT,
    title TEXT,
    description TEXT,
    category TEXT,
    target_value INTEGER,
    target_metric TEXT,
    current_progress INTEGER,
    is_completed BOOLEAN,
    is_claimed BOOLEAN,
    reward_xp INTEGER,
    reward_nectar INTEGER,
    reward_cosmetic_id TEXT,
    tier TEXT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    RETURN QUERY
    SELECT
        cd.id AS challenge_id,
        cd.type,
        cd.title,
        cd.description,
        cd.category,
        cd.target_value,
        cd.target_metric,
        COALESCE(pc.current_progress, 0) AS current_progress,
        COALESCE(pc.is_completed, FALSE) AS is_completed,
        COALESCE(pc.is_claimed, FALSE) AS is_claimed,
        cd.reward_xp,
        cd.reward_nectar,
        cd.reward_cosmetic_id,
        cd.tier
    FROM public.challenge_definitions cd
    LEFT JOIN public.player_challenges pc
        ON pc.challenge_id = cd.id
        AND pc.user_id = p_user_id
        AND pc.season_id = p_season_id
    WHERE cd.is_active = TRUE
    ORDER BY
        CASE cd.type WHEN 'daily' THEN 0 ELSE 1 END,
        cd.tier DESC,
        cd.target_value ASC;
END;
$$;

-- 4b. update_challenge_progress
CREATE OR REPLACE FUNCTION public.update_challenge_progress(
    p_user_id TEXT,
    p_season_id TEXT,
    p_metric TEXT,
    p_increment INTEGER DEFAULT 1,
    p_unique_words TEXT[] DEFAULT NULL,
    p_game_won BOOLEAN DEFAULT FALSE,
    p_perfect_round BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    challenge_id TEXT,
    current_progress INTEGER,
    is_completed BOOLEAN,
    newly_completed BOOLEAN
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    rec RECORD;
    new_progress INTEGER;
    was_completed BOOLEAN;
    now_completed BOOLEAN;
    challenge_rec RECORD;
    unique_count INTEGER;
BEGIN
    -- Get active challenges for this user/season that track this metric
    FOR rec IN
        SELECT pc.challenge_id, pc.current_progress, pc.is_completed,
               cd.target_value, cd.target_metric
        FROM public.player_challenges pc
        JOIN public.challenge_definitions cd ON cd.id = pc.challenge_id
        WHERE pc.user_id = p_user_id
          AND pc.season_id = p_season_id
          AND cd.target_metric = p_metric
          AND cd.is_active = TRUE
          AND pc.is_completed = FALSE
    LOOP
        was_completed := rec.is_completed;

        IF p_metric = 'unique_words' AND p_unique_words IS NOT NULL THEN
            -- Count unique words for this challenge
            SELECT COUNT(DISTINCT word) INTO unique_count
            FROM unnest(p_unique_words) AS word
            WHERE word IS NOT NULL;
            new_progress := unique_count;
        ELSE
            new_progress := rec.current_progress + p_increment;
        END IF;

        now_completed := new_progress >= rec.target_value AND NOT was_completed;

        UPDATE public.player_challenges
        SET current_progress = LEAST(new_progress, rec.target_value),
            is_completed = now_completed,
            completed_at = CASE WHEN now_completed THEN NOW() ELSE completed_at END,
            updated_at = NOW()
        WHERE user_id = p_user_id
          AND challenge_id = rec.challenge_id
          AND season_id = p_season_id;

        RETURN QUERY SELECT
            rec.challenge_id,
            LEAST(new_progress, rec.target_value) AS current_progress,
            now_completed AS is_completed,
            now_completed AS newly_completed;
    END LOOP;

    -- Special handling for games_played (increment on game start)
    IF p_metric = 'games_played' THEN
        FOR rec IN
            SELECT pc.challenge_id, pc.current_progress, pc.is_completed,
                   cd.target_value, cd.target_metric
            FROM public.player_challenges pc
            JOIN public.challenge_definitions cd ON cd.id = pc.challenge_id
            WHERE pc.user_id = p_user_id
              AND pc.season_id = p_season_id
              AND cd.target_metric = 'games_played'
              AND cd.is_active = TRUE
              AND pc.is_completed = FALSE
        LOOP
            was_completed := rec.is_completed;
            new_progress := rec.current_progress + p_increment;
            now_completed := new_progress >= rec.target_value AND NOT was_completed;

            UPDATE public.player_challenges
            SET current_progress = LEAST(new_progress, rec.target_value),
                is_completed = now_completed,
                completed_at = CASE WHEN now_completed THEN NOW() ELSE completed_at END,
                updated_at = NOW()
            WHERE user_id = p_user_id
              AND challenge_id = rec.challenge_id
              AND season_id = p_season_id;

            RETURN QUERY SELECT
                rec.challenge_id,
                LEAST(new_progress, rec.target_value) AS current_progress,
                now_completed AS is_completed,
                now_completed AS newly_completed;
        END LOOP;
    END IF;

    -- Special handling for perfect_rounds
    IF p_perfect_round THEN
        FOR rec IN
            SELECT pc.challenge_id, pc.current_progress, pc.is_completed,
                   cd.target_value, cd.target_metric
            FROM public.player_challenges pc
            JOIN public.challenge_definitions cd ON cd.id = pc.challenge_id
            WHERE pc.user_id = p_user_id
              AND pc.season_id = p_season_id
              AND cd.target_metric = 'perfect_rounds'
              AND cd.is_active = TRUE
              AND pc.is_completed = FALSE
        LOOP
            was_completed := rec.is_completed;
            new_progress := rec.current_progress + 1;
            now_completed := new_progress >= rec.target_value AND NOT was_completed;

            UPDATE public.player_challenges
            SET current_progress = LEAST(new_progress, rec.target_value),
                is_completed = now_completed,
                completed_at = CASE WHEN now_completed THEN NOW() ELSE completed_at END,
                updated_at = NOW()
            WHERE user_id = p_user_id
              AND challenge_id = rec.challenge_id
              AND season_id = p_season_id;

            RETURN QUERY SELECT
                rec.challenge_id,
                LEAST(new_progress, rec.target_value) AS current_progress,
                now_completed AS is_completed,
                now_completed AS newly_completed;
        END LOOP;
    END IF;
END;
$$;

-- 4c. claim_challenge_reward
CREATE OR REPLACE FUNCTION public.claim_challenge_reward(
    p_user_id TEXT,
    p_season_id TEXT,
    p_challenge_id TEXT
)
RETURNS TABLE (
    success BOOLEAN,
    reward_xp INTEGER,
    reward_nectar INTEGER,
    message TEXT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    challenge_rec RECORD;
    player_rec RECORD;
BEGIN
    -- Get challenge definition
    SELECT * INTO challenge_rec
    FROM public.challenge_definitions
    WHERE id = p_challenge_id AND is_active = TRUE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 0, 0, 'Challenge not found';
        RETURN;
    END IF;

    -- Get player progress
    SELECT * INTO player_rec
    FROM public.player_challenges
    WHERE user_id = p_user_id
      AND challenge_id = p_challenge_id
      AND season_id = p_season_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 0, 0, 'Challenge progress not found';
        RETURN;
    END IF;

    IF NOT player_rec.is_completed THEN
        RETURN QUERY SELECT FALSE, 0, 0, 'Challenge not completed';
        RETURN;
    END IF;

    IF player_rec.is_claimed THEN
        RETURN QUERY SELECT FALSE, 0, 0, 'Reward already claimed';
        RETURN;
    END IF;

    -- Mark as claimed
    UPDATE public.player_challenges
    SET is_claimed = TRUE,
        claimed_at = NOW(),
        updated_at = NOW()
    WHERE user_id = p_user_id
      AND challenge_id = p_challenge_id
      AND season_id = p_season_id;

    -- Award XP (to battle pass)
    PERFORM public.add_battle_pass_xp(p_user_id, p_season_id, challenge_rec.reward_xp);

    -- Award nectar (to profile)
    UPDATE public.profiles
    SET current_nectar = COALESCE(current_nectar, 0) + challenge_rec.reward_nectar,
        lifetime_nectar = COALESCE(lifetime_nectar, 0) + challenge_rec.reward_nectar
    WHERE id = p_user_id;

    RETURN QUERY SELECT TRUE, challenge_rec.reward_xp, challenge_rec.reward_nectar, 'Reward claimed successfully';
END;
$$;

-- 4d. ensure_player_challenges
CREATE OR REPLACE FUNCTION public.ensure_player_challenges(p_user_id TEXT, p_season_id TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    cd RECORD;
BEGIN
    -- Insert challenge progress rows for all active challenges
    FOR cd IN
        SELECT id FROM public.challenge_definitions WHERE is_active = TRUE
    LOOP
        INSERT INTO public.player_challenges (user_id, challenge_id, season_id, current_progress, is_completed, is_claimed)
        VALUES (p_user_id, cd.id, p_season_id, 0, FALSE, FALSE)
        ON CONFLICT (user_id, challenge_id, season_id) DO NOTHING;
    END LOOP;
END;
$$;

-- 4e. get_challenge_summary
CREATE OR REPLACE FUNCTION public.get_challenge_summary(p_user_id TEXT, p_season_id TEXT)
RETURNS TABLE (
    daily_total INTEGER,
    daily_completed INTEGER,
    daily_claimed INTEGER,
    weekly_total INTEGER,
    weekly_completed INTEGER,
    weekly_claimed INTEGER,
    daily_reset_at TIMESTAMPTZ,
    weekly_reset_at TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    daily_reset TIMESTAMPTZ;
    weekly_reset TIMESTAMPTZ;
BEGIN
    -- Calculate next daily reset (midnight UTC)
    daily_reset := DATE_TRUNC('day', NOW()) + INTERVAL '1 day';

    -- Calculate next weekly reset (Monday 00:00 UTC)
    weekly_reset := DATE_TRUNC('week', NOW()) + INTERVAL '7 days';

    RETURN QUERY
    SELECT
        COUNT(*) FILTER (WHERE cd.type = 'daily') AS daily_total,
        COUNT(*) FILTER (WHERE cd.type = 'daily' AND pc.is_completed) AS daily_completed,
        COUNT(*) FILTER (WHERE cd.type = 'daily' AND pc.is_claimed) AS daily_claimed,
        COUNT(*) FILTER (WHERE cd.type = 'weekly') AS weekly_total,
        COUNT(*) FILTER (WHERE cd.type = 'weekly' AND pc.is_completed) AS weekly_completed,
        COUNT(*) FILTER (WHERE cd.type = 'weekly' AND pc.is_claimed) AS weekly_claimed,
        daily_reset AS daily_reset_at,
        weekly_reset AS weekly_reset_at
    FROM public.challenge_definitions cd
    LEFT JOIN public.player_challenges pc
        ON pc.challenge_id = cd.id
        AND pc.user_id = p_user_id
        AND pc.season_id = p_season_id
    WHERE cd.is_active = TRUE;
END;
$$;

-- 5. Grant execute permissions to authenticated role
REVOKE EXECUTE ON FUNCTION public.get_player_challenges(TEXT, TEXT) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.update_challenge_progress(TEXT, TEXT, TEXT, INTEGER, TEXT[], BOOLEAN, BOOLEAN) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.claim_challenge_reward(TEXT, TEXT, TEXT) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.ensure_player_challenges(TEXT, TEXT) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_challenge_summary(TEXT, TEXT) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.get_player_challenges(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_challenge_progress(TEXT, TEXT, TEXT, INTEGER, TEXT[], BOOLEAN, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_challenge_reward(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_player_challenges(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_challenge_summary(TEXT, TEXT) TO authenticated;

-- 6. Fix friend_invites_presence RPCs to use COALESCE(p.updated_at, p.created_at) instead of p.updated_at
-- 6a. get_friends_with_presence - fix the last_seen fallback
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

-- 6b. get_online_friends - fix the last_seen fallback
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
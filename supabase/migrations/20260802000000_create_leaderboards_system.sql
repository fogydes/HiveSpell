-- Phase 4d: Multi-dimension Leaderboards System
-- Global (season), Friends, Daily, Mode-specific leaderboards
-- Materialized views refreshed hourly via pg_cron

-- Drop existing if needed
DROP MATERIALIZED VIEW IF EXISTS mv_global_leaderboard CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_friends_leaderboard CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_daily_leaderboard CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_mode_leaderboard CASCADE;

DROP FUNCTION IF EXISTS public.refresh_leaderboards(void);
DROP FUNCTION IF EXISTS public.get_global_leaderboard(uuid, text, int, int);
DROP FUNCTION IF EXISTS public.get_friends_leaderboard(uuid, text, int, int);
DROP FUNCTION IF EXISTS public.get_daily_leaderboard(uuid, text, int, int);
DROP FUNCTION IF EXISTS public.get_mode_leaderboard(uuid, text, text, int, int);
DROP FUNCTION IF EXISTS public.get_player_rank(uuid, text, text);

-- ============================================================
-- MATERIALIZED VIEW: Global Season Leaderboard
-- ============================================================
CREATE MATERIALIZED VIEW mv_global_leaderboard AS
SELECT
    p.id AS user_id,
    p.username,
    p.avatar_url,
    p.tier,
    p.lifetime_nectar,
    p.games_played,
    p.games_won,
    p.total_correct_words,
    p.max_streak,
    p.current_streak,
    -- Composite score formula: wins*10 + corrects*1 + lifetimeNectar/100 + streak*5 + gamesPlayed/10*2
    (p.games_won * 10 + p.total_correct_words * 1 + p.lifetime_nectar / 100 + p.max_streak * 5 + p.games_played / 10 * 2) AS composite_score,
    RANK() OVER (ORDER BY (p.games_won * 10 + p.total_correct_words * 1 + p.lifetime_nectar / 100 + p.max_streak * 5 + p.games_played / 10 * 2) DESC) AS global_rank
FROM profiles p
WHERE p.lifetime_nectar > 0 OR p.games_played > 0
ORDER BY composite_score DESC;

CREATE UNIQUE INDEX mv_global_leaderboard_user_id_idx ON mv_global_leaderboard (user_id);

-- ============================================================
-- MATERIALIZED VIEW: Friends Leaderboard
-- ============================================================
CREATE MATERIALIZED VIEW mv_friends_leaderboard AS
SELECT
    p.id AS user_id,
    p.username,
    p.avatar_url,
    p.tier,
    p.lifetime_nectar,
    p.games_played,
    p.games_won,
    p.total_correct_words,
    p.max_streak,
    p.current_streak,
    (p.games_won * 10 + p.total_correct_words * 1 + p.lifetime_nectar / 100 + p.max_streak * 5 + p.games_played / 10 * 2) AS composite_score,
    RANK() OVER (PARTITION BY ft.friend_group ORDER BY (p.games_won * 10 + p.total_correct_words * 1 + p.lifetime_nectar / 100 + p.max_streak * 5 + p.games_played / 10 * 2) DESC) AS friend_rank,
    ft.friend_group
FROM profiles p
INNER JOIN (
    -- Friend groups: each user + their friends form a group
    SELECT f.user_id, f.user_id AS friend_group FROM friends f WHERE f.status = 'accepted'
    UNION
    SELECT f.friend_id, f.user_id AS friend_group FROM friends f WHERE f.status = 'accepted'
) ft ON p.id = ft.user_id
WHERE p.lifetime_nectar > 0 OR p.games_played > 0
ORDER BY ft.friend_group, composite_score DESC;

CREATE INDEX mv_friends_leaderboard_user_id_idx ON mv_friends_leaderboard (user_id);
CREATE INDEX mv_friends_leaderboard_friend_group_idx ON mv_friends_leaderboard (friend_group);

-- ============================================================
-- MATERIALIZED VIEW: Daily Leaderboard (resets at 00:00 UTC)
-- ============================================================
CREATE MATERIALIZED VIEW mv_daily_leaderboard AS
SELECT
    p.id AS user_id,
    p.username,
    p.avatar_url,
    p.tier,
    -- Daily stats from daily_stats table (aggregated per day)
    COALESCE(ds.games_won, 0) AS daily_wins,
    COALESCE(ds.correct_words, 0) AS daily_correct,
    COALESCE(ds.xp_earned, 0) AS daily_xp,
    RANK() OVER (ORDER BY COALESCE(ds.xp_earned, 0) DESC, COALESCE(ds.correct_words, 0) DESC) AS daily_rank,
    CURRENT_DATE AS leaderboard_date
FROM profiles p
LEFT JOIN daily_stats ds ON p.id = ds.user_id AND ds.stat_date = CURRENT_DATE
WHERE p.lifetime_nectar > 0 OR p.games_played > 0
ORDER BY daily_xp DESC, daily_correct DESC;

CREATE UNIQUE INDEX mv_daily_leaderboard_user_id_idx ON mv_daily_leaderboard (user_id);

-- ============================================================
-- MATERIALIZED VIEW: Mode-specific Leaderboard
-- ============================================================
CREATE MATERIALIZED VIEW mv_mode_leaderboard AS
SELECT
    p.id AS user_id,
    p.username,
    p.avatar_url,
    p.tier,
    ms.mode,
    ms.games_played,
    ms.games_won,
    ms.total_correct_words,
    ms.best_wpm,
    ms.max_streak,
    (ms.games_won * 10 + ms.total_correct_words * 1 + ms.games_played / 10 * 2) AS mode_score,
    RANK() OVER (PARTITION BY ms.mode ORDER BY (ms.games_won * 10 + ms.total_correct_words * 1 + ms.games_played / 10 * 2) DESC) AS mode_rank
FROM profiles p
INNER JOIN mode_stats ms ON p.id = ms.user_id
WHERE p.lifetime_nectar > 0 OR p.games_played > 0
ORDER BY ms.mode, mode_score DESC;

CREATE INDEX mv_mode_leaderboard_user_id_idx ON mv_mode_leaderboard (user_id);
CREATE INDEX mv_mode_leaderboard_mode_idx ON mv_mode_leaderboard (mode);

-- ============================================================
-- TABLE: Daily Stats (for daily leaderboard)
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_stats (
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    stat_date date NOT NULL DEFAULT CURRENT_DATE,
    games_played int DEFAULT 0,
    games_won int DEFAULT 0,
    correct_words int DEFAULT 0,
    xp_earned int DEFAULT 0,
    nectar_earned int DEFAULT 0,
    best_wpm int DEFAULT 0,
    max_streak int DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    PRIMARY KEY (user_id, stat_date)
);

ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own daily stats" ON daily_stats;
CREATE POLICY "Users can view own daily stats" ON daily_stats
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can upsert own daily stats" ON daily_stats;
CREATE POLICY "Users can upsert own daily stats" ON daily_stats
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own daily stats" ON daily_stats;
CREATE POLICY "Users can update own daily stats" ON daily_stats
    FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- TABLE: Mode Stats (for mode-specific leaderboard)
-- ============================================================
CREATE TABLE IF NOT EXISTS mode_stats (
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    mode text NOT NULL, -- 'baby', 'easy', 'medium', 'hard', 'genius', 'competitive'
    games_played int DEFAULT 0,
    games_won int DEFAULT 0,
    total_correct_words int DEFAULT 0,
    best_wpm int DEFAULT 0,
    max_streak int DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    PRIMARY KEY (user_id, mode)
);

ALTER TABLE mode_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own mode stats" ON mode_stats;
CREATE POLICY "Users can view own mode stats" ON mode_stats
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can upsert own mode stats" ON mode_stats;
CREATE POLICY "Users can upsert own mode stats" ON mode_stats
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own mode stats" ON mode_stats
    FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- RPC: Refresh All Leaderboards (called via pg_cron hourly)
-- ============================================================
CREATE OR REPLACE FUNCTION public.refresh_leaderboards()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Refresh global leaderboard
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_global_leaderboard;

    -- Refresh friends leaderboard
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_friends_leaderboard;

    -- Refresh daily leaderboard
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_leaderboard;

    -- Refresh mode leaderboard
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_mode_leaderboard;

    RAISE NOTICE 'All leaderboards refreshed at %', now();
END;
$$;

-- ============================================================
-- RPC: Get Global Leaderboard (paginated)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_global_leaderboard(
    p_viewer_id uuid,
    p_season_id text DEFAULT NULL,
    p_limit int DEFAULT 50,
    p_offset int DEFAULT 0
)
RETURNS TABLE (
    user_id uuid,
    username text,
    avatar_url text,
    tier text,
    composite_score numeric,
    global_rank int,
    is_current_user boolean,
    games_won int,
    total_correct_words int,
    lifetime_nectar numeric,
    max_streak int,
    games_played int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        gl.user_id,
        gl.username,
        gl.avatar_url,
        gl.tier,
        gl.composite_score,
        gl.global_rank,
        (gl.user_id = p_viewer_id) AS is_current_user,
        gl.games_won,
        gl.total_correct_words,
        gl.lifetime_nectar,
        gl.max_streak,
        gl.games_played
    FROM mv_global_leaderboard gl
    ORDER BY gl.global_rank
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- ============================================================
-- RPC: Get Friends Leaderboard (paginated)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_friends_leaderboard(
    p_viewer_id uuid,
    p_season_id text DEFAULT NULL,
    p_limit int DEFAULT 50,
    p_offset int DEFAULT 0
)
RETURNS TABLE (
    user_id uuid,
    username text,
    avatar_url text,
    tier text,
    composite_score numeric,
    friend_rank int,
    is_current_user boolean,
    friend_group uuid,
    games_won int,
    total_correct_words int,
    lifetime_nectar numeric,
    max_streak int,
    games_played int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        fl.user_id,
        fl.username,
        fl.avatar_url,
        fl.tier,
        fl.composite_score,
        fl.friend_rank,
        (fl.user_id = p_viewer_id) AS is_current_user,
        fl.friend_group,
        fl.games_won,
        fl.total_correct_words,
        fl.lifetime_nectar,
        fl.max_streak,
        fl.games_played
    FROM mv_friends_leaderboard fl
    WHERE fl.friend_group = p_viewer_id -- Only show the viewer's friend group
    ORDER BY fl.friend_rank
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- ============================================================
-- RPC: Get Daily Leaderboard (paginated)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_daily_leaderboard(
    p_viewer_id uuid,
    p_season_id text DEFAULT NULL,
    p_limit int DEFAULT 50,
    p_offset int DEFAULT 0
)
RETURNS TABLE (
    user_id uuid,
    username text,
    avatar_url text,
    tier text,
    daily_wins int,
    daily_correct int,
    daily_xp int,
    daily_rank int,
    is_current_user boolean,
    leaderboard_date date
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dl.user_id,
        dl.username,
        dl.avatar_url,
        dl.tier,
        dl.daily_wins,
        dl.daily_correct,
        dl.daily_xp,
        dl.daily_rank,
        (dl.user_id = p_viewer_id) AS is_current_user,
        dl.leaderboard_date
    FROM mv_daily_leaderboard dl
    ORDER BY dl.daily_rank
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- ============================================================
-- RPC: Get Mode-specific Leaderboard (paginated)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_mode_leaderboard(
    p_viewer_id uuid,
    p_mode text,
    p_season_id text DEFAULT NULL,
    p_limit int DEFAULT 50,
    p_offset int DEFAULT 0
)
RETURNS TABLE (
    user_id uuid,
    username text,
    avatar_url text,
    tier text,
    games_played int,
    games_won int,
    total_correct_words int,
    best_wpm int,
    max_streak int,
    mode_score numeric,
    mode_rank int,
    is_current_user boolean,
    mode text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ml.user_id,
        ml.username,
        ml.avatar_url,
        ml.tier,
        ml.games_played,
        ml.games_won,
        ml.total_correct_words,
        ml.best_wpm,
        ml.max_streak,
        ml.mode_score,
        ml.mode_rank,
        (ml.user_id = p_viewer_id) AS is_current_user,
        ml.mode
    FROM mv_mode_leaderboard ml
    WHERE ml.mode = p_mode
    ORDER BY ml.mode_rank
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- ============================================================
-- RPC: Get Player's Rank Across All Leaderboards
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_player_rank(
    p_user_id uuid,
    p_mode text DEFAULT NULL,
    p_season_id text DEFAULT NULL
)
RETURNS TABLE (
    leaderboard_type text,
    rank int,
    total_players int,
    score numeric,
    metadata jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_global_rank int;
    v_global_total int;
    v_global_score numeric;
    v_friend_rank int;
    v_friend_total int;
    v_friend_score numeric;
    v_daily_rank int;
    v_daily_total int;
    v_daily_score numeric;
    v_mode_rank int;
    v_mode_total int;
    v_mode_score numeric;
BEGIN
    -- Global rank
    SELECT global_rank, composite_score
    INTO v_global_rank, v_global_score
    FROM mv_global_leaderboard
    WHERE user_id = p_user_id;

    SELECT COUNT(*) INTO v_global_total FROM mv_global_leaderboard;

    IF v_global_rank IS NOT NULL THEN
        RETURN QUERY SELECT 'global'::text, v_global_rank, v_global_total, v_global_score, '{}'::jsonb;
    END IF;

    -- Friends rank
    SELECT friend_rank, composite_score
    INTO v_friend_rank, v_friend_score
    FROM mv_friends_leaderboard
    WHERE user_id = p_user_id AND friend_group = p_user_id;

    SELECT COUNT(*) INTO v_friend_total FROM mv_friends_leaderboard WHERE friend_group = p_user_id;

    IF v_friend_rank IS NOT NULL THEN
        RETURN QUERY SELECT 'friends'::text, v_friend_rank, v_friend_total, v_friend_score, '{}'::jsonb;
    END IF;

    -- Daily rank
    SELECT daily_rank, daily_xp::numeric
    INTO v_daily_rank, v_daily_score
    FROM mv_daily_leaderboard
    WHERE user_id = p_user_id;

    SELECT COUNT(*) INTO v_daily_total FROM mv_daily_leaderboard;

    IF v_daily_rank IS NOT NULL THEN
        RETURN QUERY SELECT 'daily'::text, v_daily_rank, v_daily_total, v_daily_score, jsonb_build_object('date', CURRENT_DATE);
    END IF;

    -- Mode rank (if mode specified)
    IF p_mode IS NOT NULL THEN
        SELECT mode_rank, mode_score
        INTO v_mode_rank, v_mode_score
        FROM mv_mode_leaderboard
        WHERE user_id = p_user_id AND mode = p_mode;

        SELECT COUNT(*) INTO v_mode_total FROM mv_mode_leaderboard WHERE mode = p_mode;

        IF v_mode_rank IS NOT NULL THEN
            RETURN QUERY SELECT 'mode'::text, v_mode_rank, v_mode_total, v_mode_score, jsonb_build_object('mode', p_mode);
        END IF;
    END IF;
END;
$$;

-- ============================================================
-- GRANT EXECUTE PERMISSIONS
-- ============================================================
GRANT EXECUTE ON FUNCTION public.refresh_leaderboards() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_global_leaderboard(uuid, text, int, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_friends_leaderboard(uuid, text, int, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_daily_leaderboard(uuid, text, int, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_mode_leaderboard(uuid, text, text, int, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_player_rank(uuid, text, text) TO anon, authenticated;

-- ============================================================
-- ENABLE REALTIME FOR LEADERBOARD TABLES (optional, for live updates)
-- ==================================----------------------------
-- Note: Materialized views don't support realtime.
-- For realtime, we'd need to use regular views or triggers on source tables.
-- For now, leaderboards are refreshed hourly via pg_cron.

-- ============================================================
-- FUNCTION: Increment Daily Stats (called from gameplay)
-- ============================================================
CREATE OR REPLACE FUNCTION public.increment_daily_stats(
    p_user_id uuid,
    p_games_played int DEFAULT 0,
    p_games_won int DEFAULT 0,
    p_correct_words int DEFAULT 0,
    p_xp_earned int DEFAULT 0,
    p_nectar_earned int DEFAULT 0,
    p_wpm int DEFAULT 0,
    p_streak int DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO daily_stats (user_id, stat_date, games_played, games_won, correct_words, xp_earned, nectar_earned, best_wpm, max_streak)
    VALUES (p_user_id, CURRENT_DATE, p_games_played, p_games_won, p_correct_words, p_xp_earned, p_nectar_earned, p_wpm, p_streak)
    ON CONFLICT (user_id, stat_date) DO UPDATE SET
        games_played = daily_stats.games_played + EXCLUDED.games_played,
        games_won = daily_stats.games_won + EXCLUDED.games_won,
        correct_words = daily_stats.correct_words + EXCLUDED.correct_words,
        xp_earned = daily_stats.xp_earned + EXCLUDED.xp_earned,
        nectar_earned = daily_stats.nectar_earned + EXCLUDED.nectar_earned,
        best_wpm = GREATEST(daily_stats.best_wpm, EXCLUDED.wpm),
        max_streak = GREATEST(daily_stats.max_streak, EXCLUDED.streak),
        updated_at = now();
END;
$$;

-- ============================================================
-- FUNCTION: Increment Mode Stats (called from gameplay)
-- ============================================================
CREATE OR REPLACE FUNCTION public.increment_mode_stats(
    p_user_id uuid,
    p_mode text,
    p_games_played int DEFAULT 0,
    p_games_won int DEFAULT 0,
    p_correct_words int DEFAULT 0,
    p_wpm int DEFAULT 0,
    p_streak int DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO mode_stats (user_id, mode, games_played, games_won, total_correct_words, best_wpm, max_streak)
    VALUES (p_user_id, p_mode, p_games_played, p_games_won, p_correct_words, p_wpm, p_streak)
    ON CONFLICT (user_id, mode) DO UPDATE SET
        games_played = mode_stats.games_played + EXCLUDED.games_played,
        games_won = mode_stats.games_won + EXCLUDED.games_won,
        total_correct_words = mode_stats.total_correct_words + EXCLUDED.total_correct_words,
        best_wpm = GREATEST(mode_stats.best_wpm, EXCLUDED.wpm),
        max_streak = GREATEST(mode_stats.max_streak, EXCLUDED.streak),
        updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_daily_stats(uuid, int, int, int, int, int, int, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_mode_stats(uuid, text, int, int, int, int, int) TO anon, authenticated;
-- Fix Supabase Security Advisor Warnings
-- 1. function_search_path_mutable: Add SET search_path = public to SECURITY DEFINER functions
-- 2. materialized_view_in_api: Convert materialized views to regular views (readable via API)
-- 3. anon_security_definer_function_executable: Change to SECURITY INVOKER or revoke EXECUTE from anon/authenticated
-- 4. authenticated_security_definer_function_executable: Same as above

-- ============================================================================
-- 1. Fix function_search_path_mutable - Add search_path to SECURITY DEFINER functions
-- ============================================================================

-- add_battle_pass_xp
ALTER FUNCTION public.add_battle_pass_xp(uuid, uuid, integer)
SET search_path = public;

-- apply_correct_answer_reward
ALTER FUNCTION public.apply_correct_answer_reward(text, integer)
SET search_path = public;

-- award_profile_win
ALTER FUNCTION public.award_profile_win(text)
SET search_path = public;

-- claim_battle_pass_reward
ALTER FUNCTION public.claim_battle_pass_reward(uuid, uuid, text, integer)
SET search_path = public;

-- claim_challenge_reward
ALTER FUNCTION public.claim_challenge_reward(uuid, uuid, uuid)
SET search_path = public;

-- ensure_player_challenges
ALTER FUNCTION public.ensure_player_challenges(uuid, uuid)
SET search_path = public;

-- get_battle_pass_state
ALTER FUNCTION public.get_battle_pass_state(uuid, uuid)
SET search_path = public;

-- get_challenge_summary
ALTER FUNCTION public.get_challenge_summary(uuid, uuid)
SET search_path = public;

-- get_daily_leaderboard
ALTER FUNCTION public.get_daily_leaderboard(uuid, integer, integer)
SET search_path = public;

-- get_friends_leaderboard
ALTER FUNCTION public.get_friends_leaderboard(uuid, integer, integer)
SET search_path = public;

-- get_global_leaderboard
ALTER FUNCTION public.get_global_leaderboard(uuid, integer, integer)
SET search_path = public;

-- get_mode_leaderboard
ALTER FUNCTION public.get_mode_leaderboard(uuid, text, integer, integer)
SET search_path = public;

-- get_player_challenges
ALTER FUNCTION public.get_player_challenges(uuid, uuid)
SET search_path = public;

-- get_player_rank
ALTER FUNCTION public.get_player_rank(uuid, text)
SET search_path = public;

-- increment_daily_stats
ALTER FUNCTION public.increment_daily_stats(uuid, integer, integer, integer, integer, integer, integer, integer)
SET search_path = public;

-- increment_mode_stats
ALTER FUNCTION public.increment_mode_stats(uuid, text, integer, integer, integer, integer, integer)
SET search_path = public;

-- purchase_battle_pass_premium
ALTER FUNCTION public.purchase_battle_pass_premium(uuid, uuid)
SET search_path = public;

-- purchase_item
ALTER FUNCTION public.purchase_item(text, integer)
SET search_path = public;

-- refresh_leaderboards
ALTER FUNCTION public.refresh_leaderboards()
SET search_path = public;

-- update_challenge_progress
ALTER FUNCTION public.update_challenge_progress(uuid, uuid, text, integer, text[])
SET search_path = public;

-- ============================================================================
-- 2. Fix materialized_view_in_api - Convert to regular views
-- Drop materialized views and recreate as regular views
-- ============================================================================

DROP MATERIALIZED VIEW IF EXISTS public.mv_global_leaderboard;
DROP MATERIALIZED VIEW IF EXISTS public.mv_friends_leaderboard;
DROP MATERIALIZED VIEW IF EXISTS public.mv_daily_leaderboard;
DROP MATERIALIZED VIEW IF EXISTS public.mv_mode_leaderboard;

-- Create regular views instead (these will be queryable via PostgREST API)
CREATE OR REPLACE VIEW public.v_global_leaderboard AS
SELECT
    id AS user_id,
    username,
    avatar_url,
    tier,
    lifetime_nectar,
    games_played,
    wins AS games_won,
    corrects AS total_correct_words,
    max_streak,
    current_streak,
    (((((wins * 10) + (corrects * 1)) + (lifetime_nectar / 100)) + (max_streak * 5)) + ((games_played / 10) * 2)) AS composite_score,
    rank() OVER (ORDER BY (((((wins * 10) + (corrects * 1)) + (lifetime_nectar / 100)) + (max_streak * 5)) + ((games_played / 10) * 2)) DESC) AS global_rank
FROM public.profiles p
WHERE (lifetime_nectar > 0) OR (games_played > 0)
ORDER BY composite_score DESC;

CREATE OR REPLACE VIEW public.v_friends_leaderboard AS
SELECT
    p.id AS user_id,
    p.username,
    p.avatar_url,
    p.tier,
    p.lifetime_nectar,
    p.games_played,
    p.wins AS games_won,
    p.corrects AS total_correct_words,
    p.max_streak,
    p.current_streak,
    (((((p.wins * 10) + (p.corrects * 1)) + (p.lifetime_nectar / 100)) + (p.max_streak * 5)) + ((p.games_played / 10) * 2)) AS composite_score,
    rank() OVER (PARTITION BY ft.friend_group ORDER BY (((((p.wins * 10) + (p.corrects * 1)) + (p.lifetime_nectar / 100)) + (p.max_streak * 5)) + ((p.games_played / 10) * 2)) DESC) AS friend_rank,
    ft.friend_group
FROM public.profiles p
JOIN (
    SELECT f.requester_id, f.requester_id AS friend_group
    FROM public.friendships f
    WHERE f.status = 'accepted'
    UNION
    SELECT f.addressee_id, f.requester_id AS friend_group
    FROM public.friendships f
    WHERE f.status = 'accepted'
) ft ON p.id = ft.requester_id
WHERE (p.lifetime_nectar > 0) OR (p.games_played > 0)
ORDER BY ft.friend_group, composite_score DESC;

CREATE OR REPLACE VIEW public.v_daily_leaderboard AS
SELECT
    p.id AS user_id,
    p.username,
    p.avatar_url,
    p.tier,
    COALESCE(ds.games_won, 0) AS daily_wins,
    COALESCE(ds.correct_words, 0) AS daily_correct,
    COALESCE(ds.xp_earned, 0) AS daily_xp,
    rank() OVER (ORDER BY COALESCE(ds.xp_earned, 0) DESC, COALESCE(ds.correct_words, 0) DESC) AS daily_rank,
    CURRENT_DATE AS leaderboard_date
FROM public.profiles p
LEFT JOIN public.daily_stats ds ON p.id = ds.user_id AND ds.stat_date = CURRENT_DATE
WHERE (p.lifetime_nectar > 0) OR (p.games_played > 0)
ORDER BY daily_xp DESC, daily_correct DESC;

CREATE OR REPLACE VIEW public.v_mode_leaderboard AS
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
    (((ms.games_won * 10) + (ms.total_correct_words * 1)) + ((ms.games_played / 10) * 2)) AS mode_score,
    rank() OVER (PARTITION BY ms.mode ORDER BY (((ms.games_won * 10) + (ms.total_correct_words * 1)) + ((ms.games_played / 10) * 2)) DESC) AS mode_rank
FROM public.profiles p
JOIN public.mode_stats ms ON p.id = ms.user_id
WHERE (p.lifetime_nectar > 0) OR (p.games_played > 0)
ORDER BY ms.mode, mode_score DESC;

-- Grant SELECT on views to anon and authenticated roles
GRANT SELECT ON public.v_global_leaderboard TO anon, authenticated;
GRANT SELECT ON public.v_friends_leaderboard TO anon, authenticated;
GRANT SELECT ON public.v_daily_leaderboard TO anon, authenticated;
GRANT SELECT ON public.v_mode_leaderboard TO anon, authenticated;

-- ============================================================================
-- 3. Fix anon/authenticated_security_definer_function_executable
-- Convert SECURITY DEFINER functions to SECURITY INVOKER where possible
-- Functions that access auth.jwt() or need elevated privileges stay as DEFINER
-- but we revoke EXECUTE from anon (only authenticated can call them)
-- ============================================================================

-- Functions that MUST remain SECURITY DEFINER (access auth.jwt() or write to tables users don't own):
-- - add_battle_pass_xp (writes to battle_pass_progress)
-- - apply_correct_answer_reward (writes to profiles)
-- - award_profile_win (writes to profiles)
-- - claim_battle_pass_reward (writes to battle_pass_progress)
-- - claim_challenge_reward (writes to player_challenges, profiles)
-- - ensure_player_challenges (writes to player_challenges)
-- - increment_daily_stats (writes to daily_stats)
-- - increment_mode_stats (writes to mode_stats)
-- - purchase_battle_pass_premium (writes to battle_pass_progress)
-- - purchase_item (writes to profiles)
-- - update_challenge_progress (writes to player_challenges)

-- These stay as SECURITY DEFINER but we revoke EXECUTE from anon
REVOKE EXECUTE ON FUNCTION public.add_battle_pass_xp(uuid, uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.apply_correct_answer_reward(text, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.award_profile_win(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.claim_battle_pass_reward(uuid, uuid, text, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.claim_challenge_reward(uuid, uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.ensure_player_challenges(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_daily_stats(uuid, integer, integer, integer, integer, integer, integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_mode_stats(uuid, text, integer, integer, integer, integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.purchase_battle_pass_premium(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.purchase_item(text, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_challenge_progress(uuid, uuid, text, integer, text[]) FROM anon;

-- Functions that can be SECURITY INVOKER (read-only or use row-level security):
-- - get_battle_pass_state (reads battle_pass_progress - RLS handles access)
-- - get_challenge_summary (reads challenge_definitions, player_challenges - RLS handles)
-- - get_daily_leaderboard (reads view v_daily_leaderboard)
-- - get_friends_leaderboard (reads view v_friends_leaderboard)
-- - get_global_leaderboard (reads view v_global_leaderboard)
-- - get_mode_leaderboard (reads view v_mode_leaderboard)
-- - get_player_challenges (reads challenge_definitions, player_challenges - RLS handles)
-- - get_player_rank (reads views)
-- - refresh_leaderboards (admin function - keep as DEFINER but revoke from everyone)

-- Convert read functions to SECURITY INVOKER
ALTER FUNCTION public.get_battle_pass_state(uuid, uuid) SECURITY INVOKER;
ALTER FUNCTION public.get_challenge_summary(uuid, uuid) SECURITY INVOKER;
ALTER FUNCTION public.get_daily_leaderboard(uuid, integer, integer) SECURITY INVOKER;
ALTER FUNCTION public.get_friends_leaderboard(uuid, integer, integer) SECURITY INVOKER;
ALTER FUNCTION public.get_global_leaderboard(uuid, integer, integer) SECURITY INVOKER;
ALTER FUNCTION public.get_mode_leaderboard(uuid, text, integer, integer) SECURITY INVOKER;
ALTER FUNCTION public.get_player_challenges(uuid, uuid) SECURITY INVOKER;
ALTER FUNCTION public.get_player_rank(uuid, text) SECURITY INVOKER;

-- refresh_leaderboards - admin function, revoke from anon and authenticated
REVOKE EXECUTE ON FUNCTION public.refresh_leaderboards() FROM anon, authenticated;

-- ============================================================================
-- 4. Also revoke EXECUTE from anon on remaining SECURITY DEFINER functions
-- that authenticated users should be able to call
-- ============================================================================

-- Authenticated users can call these for their own data
GRANT EXECUTE ON FUNCTION public.add_battle_pass_xp(uuid, uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_correct_answer_reward(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_profile_win(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_battle_pass_reward(uuid, uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_challenge_reward(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_player_challenges(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_daily_stats(uuid, integer, integer, integer, integer, integer, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_mode_stats(uuid, text, integer, integer, integer, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_battle_pass_premium(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_item(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_challenge_progress(uuid, uuid, text, integer, text[]) TO authenticated;

-- Grant select on tables that views depend on (for RLS to work with SECURITY INVOKER functions)
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT SELECT ON public.friendships TO anon, authenticated;
GRANT SELECT ON public.daily_stats TO anon, authenticated;
GRANT SELECT ON public.mode_stats TO anon, authenticated;
GRANT SELECT ON public.battle_pass_progress TO anon, authenticated;
GRANT SELECT ON public.challenge_definitions TO anon, authenticated;
GRANT SELECT ON public.player_challenges TO anon, authenticated;
-- Fix: leaderboard stat columns (games won / correct words) always showed 0.
--
-- Root cause — column drift between the write path and the read path:
--   * The write RPCs maintain the LEGACY stat columns on `profiles`:
--       - award_profile_win()          -> profiles.wins
--       - apply_correct_answer_reward()-> profiles.corrects, .lifetime_nectar
--     (see 20260315222000_add_profile_progression_rpcs.sql)
--   * The leaderboard materialized views read the NEWER columns
--       profiles.games_won / .total_correct_words / .max_streak / .games_played
--     (see 20260802000000_create_leaderboards_system.sql). Nothing in the
--     `profiles` write path ever populates those, so they sit at DEFAULT 0.
--
-- The UI (components/leaderboards/LeaderboardComponents.tsx) renders games_won
-- (★) and total_correct_words (✓), so every row showed 0 for both, and the
-- composite score / rank collapsed to lifetime_nectar/100 alone.
--
-- Fix (read side, per spec item #10 — "Supabase view / RPC field mapping"):
-- redefine the two profile-sourced MVs to source the stats from the columns the
-- write path actually maintains:
--       games_won            <- profiles.wins
--       total_correct_words  <- profiles.corrects
-- No RPC signatures change; get_global_leaderboard / get_friends_leaderboard /
-- get_player_rank keep returning the same output columns, now with real values.
-- The MVs repopulate from live data on CREATE, so no backfill is required.
--
-- Also broadens the activity filter. The old `WHERE lifetime_nectar > 0 OR
-- games_played > 0` silently excluded a win-only player: award_profile_win bumps
-- `wins` but not `lifetime_nectar`, and `games_played` is never written — so
-- such a player matched neither clause and vanished from the board. Adding
-- `wins > 0 OR corrects > 0` keeps anyone with real activity visible.
--
-- Known limitation (out of scope for this item): profiles.max_streak (🔥) and
-- profiles.games_played have NO write source anywhere in the profiles path, so
-- they honestly remain 0 here. Persisting per-profile streaks/games-played is a
-- gameplay-tracking change, not a view/RPC field-mapping fix. The daily/mode
-- leaderboards (mv_daily_leaderboard / mv_mode_leaderboard) read from the
-- separate daily_stats / mode_stats tables and are unaffected by this drift.

-- CASCADE drops only each MV's own indexes (recreated below); the leaderboard
-- RPCs are plpgsql and resolve the MV names at runtime, so they are not dropped.
DROP MATERIALIZED VIEW IF EXISTS mv_global_leaderboard CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_friends_leaderboard CASCADE;

-- ============================================================
-- MATERIALIZED VIEW: Global Season Leaderboard (fixed field mapping)
-- ============================================================
CREATE MATERIALIZED VIEW mv_global_leaderboard AS
SELECT
    p.id AS user_id,
    p.username,
    p.avatar_url,
    p.tier,
    p.lifetime_nectar,
    p.games_played,
    p.wins AS games_won,               -- was p.games_won (never written -> 0)
    p.corrects AS total_correct_words, -- was p.total_correct_words (never written -> 0)
    p.max_streak,
    p.current_streak,
    -- Composite score formula: wins*10 + corrects*1 + lifetimeNectar/100 + streak*5 + gamesPlayed/10*2
    (p.wins * 10 + p.corrects * 1 + p.lifetime_nectar / 100 + p.max_streak * 5 + p.games_played / 10 * 2) AS composite_score,
    RANK() OVER (ORDER BY (p.wins * 10 + p.corrects * 1 + p.lifetime_nectar / 100 + p.max_streak * 5 + p.games_played / 10 * 2) DESC) AS global_rank
FROM profiles p
WHERE p.lifetime_nectar > 0 OR p.games_played > 0 OR p.wins > 0 OR p.corrects > 0
ORDER BY composite_score DESC;

CREATE UNIQUE INDEX mv_global_leaderboard_user_id_idx ON mv_global_leaderboard (user_id);

-- ============================================================
-- MATERIALIZED VIEW: Friends Leaderboard (fixed field mapping)
-- ============================================================
CREATE MATERIALIZED VIEW mv_friends_leaderboard AS
SELECT
    p.id AS user_id,
    p.username,
    p.avatar_url,
    p.tier,
    p.lifetime_nectar,
    p.games_played,
    p.wins AS games_won,               -- was p.games_won (never written -> 0)
    p.corrects AS total_correct_words, -- was p.total_correct_words (never written -> 0)
    p.max_streak,
    p.current_streak,
    (p.wins * 10 + p.corrects * 1 + p.lifetime_nectar / 100 + p.max_streak * 5 + p.games_played / 10 * 2) AS composite_score,
    RANK() OVER (PARTITION BY ft.friend_group ORDER BY (p.wins * 10 + p.corrects * 1 + p.lifetime_nectar / 100 + p.max_streak * 5 + p.games_played / 10 * 2) DESC) AS friend_rank,
    ft.friend_group
FROM profiles p
INNER JOIN (
    -- Friend groups: each user's group = themselves + their accepted friends, in BOTH directions.
    -- Source table is `friendships` (requester_id / addressee_id, both TEXT Firebase UIDs).
    SELECT f.requester_id AS user_id, f.requester_id AS friend_group FROM friendships f WHERE f.status = 'accepted'
    UNION
    SELECT f.addressee_id AS user_id, f.requester_id AS friend_group FROM friendships f WHERE f.status = 'accepted'
    UNION
    SELECT f.addressee_id AS user_id, f.addressee_id AS friend_group FROM friendships f WHERE f.status = 'accepted'
    UNION
    SELECT f.requester_id AS user_id, f.addressee_id AS friend_group FROM friendships f WHERE f.status = 'accepted'
) ft ON p.id = ft.user_id
WHERE p.lifetime_nectar > 0 OR p.games_played > 0 OR p.wins > 0 OR p.corrects > 0
ORDER BY ft.friend_group, composite_score DESC;

-- Unique index required for REFRESH MATERIALIZED VIEW CONCURRENTLY.
-- (user_id, friend_group) is the natural key; its leading column still serves user_id lookups.
CREATE UNIQUE INDEX mv_friends_leaderboard_user_group_idx ON mv_friends_leaderboard (user_id, friend_group);
CREATE INDEX mv_friends_leaderboard_friend_group_idx ON mv_friends_leaderboard (friend_group);

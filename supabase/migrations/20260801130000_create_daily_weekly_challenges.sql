-- Phase 4c: Daily/Weekly Challenges System
-- 3 daily challenges + 1 weekly challenge with Supabase RPCs for claim

-- Challenges definitions table (static config)
CREATE TABLE IF NOT EXISTS public.challenge_definitions (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('daily', 'weekly')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('spelling', 'speed', 'streak', 'variety', 'social', 'neat')),
    target_value INTEGER NOT NULL,
    target_metric TEXT NOT NULL CHECK (target_metric IN ('correct_words', 'wpm_total', 'streak_count', 'unique_words', 'games_played', 'words_spelled', 'perfect_rounds')),
    reward_xp INTEGER NOT NULL DEFAULT 0,
    reward_nectar INTEGER NOT NULL DEFAULT 0,
    reward_cosmetic_id TEXT,
    tier TEXT NOT NULL DEFAULT 'common' CHECK (tier IN ('common', 'rare', 'epic', 'legendary')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Player challenge progress table
CREATE TABLE IF NOT EXISTS public.player_challenges (
    user_id TEXT NOT NULL, -- Firebase Auth UID (TEXT, not UUID); no FK to auth.users
    challenge_id TEXT NOT NULL REFERENCES public.challenge_definitions(id) ON DELETE CASCADE,
    season_id TEXT NOT NULL, -- Links to battle pass season for reset cycle
    current_progress INTEGER NOT NULL DEFAULT 0,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    is_claimed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    claimed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, challenge_id, season_id)
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_player_challenges_user_season ON public.player_challenges(user_id, season_id);
CREATE INDEX IF NOT EXISTS idx_player_challenges_completed ON public.player_challenges(user_id, season_id, is_completed) WHERE is_completed = TRUE;

-- RLS Policies
ALTER TABLE public.challenge_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_challenges ENABLE ROW LEVEL SECURITY;

-- Challenge definitions are readable by all authenticated users
DROP POLICY IF EXISTS "challenge_definitions_read_all" ON public.challenge_definitions;
CREATE POLICY "challenge_definitions_read_all" ON public.challenge_definitions
    FOR SELECT TO authenticated USING (is_active = TRUE);

-- Player challenges: users can only see/modify their own
DROP POLICY IF EXISTS "player_challenges_select_own" ON public.player_challenges;
CREATE POLICY "player_challenges_select_own" ON public.player_challenges
    FOR SELECT TO authenticated USING (user_id = (select auth.jwt()->>'sub'));

DROP POLICY IF EXISTS "player_challenges_upsert_own" ON public.player_challenges;
CREATE POLICY "player_challenges_upsert_own" ON public.player_challenges
    FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.jwt()->>'sub'));

DROP POLICY IF EXISTS "player_challenges_update_own" ON public.player_challenges;
CREATE POLICY "player_challenges_update_own" ON public.player_challenges
    FOR UPDATE TO authenticated USING (user_id = (select auth.jwt()->>'sub')) WITH CHECK (user_id = (select auth.jwt()->>'sub'));

-- Updated at trigger
DROP TRIGGER IF EXISTS handle_updated_at ON public.player_challenges;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.player_challenges
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Seed challenge definitions
INSERT INTO public.challenge_definitions (id, type, title, description, category, target_value, target_metric, reward_xp, reward_nectar, tier) VALUES
-- Dailies
('daily_spell_10', 'daily', 'Busy Bee', 'Spell 10 words correctly', 'spelling', 10, 'correct_words', 100, 25, 'common'),
('daily_speed_demon', 'daily', 'Speed Demon', 'Achieve 300 total WPM across words', 'speed', 300, 'wpm_total', 150, 30, 'common'),
('daily_streak_5', 'daily', 'On Fire', 'Reach a 5-word streak', 'streak', 5, 'streak_count', 100, 20, 'common'),
('daily_variety', 'daily', 'Polyglot', 'Spell 8 unique words', 'variety', 8, 'unique_words', 120, 25, 'common'),
('daily_games_3', 'daily', 'Arena Regular', 'Play 3 games', 'variety', 3, 'games_played', 80, 15, 'common'),
('daily_perfect_round', 'daily', 'Flawless', 'Win a round with 0 mistakes', 'neat', 1, 'perfect_rounds', 200, 50, 'rare'),

-- Weeklies
('weekly_spell_50', 'weekly', 'Wordsmith', 'Spell 50 words correctly this week', 'spelling', 50, 'correct_words', 500, 150, 'rare'),
('weekly_speed_king', 'weekly', 'Speed King', 'Achieve 2000 total WPM this week', 'speed', 2000, 'wpm_total', 600, 200, 'rare'),
('weekly_streak_master', 'weekly', 'Streak Master', 'Reach a 15-word streak this week', 'streak', 15, 'streak_count', 500, 150, 'rare'),
('weekly_variety_king', 'weekly', 'Vocabulary Virtuoso', 'Spell 30 unique words this week', 'variety', 30, 'unique_words', 550, 180, 'rare'),
('weekly_social_butterfly', 'weekly', 'Social Butterfly', 'Play 15 games with others this week', 'social', 15, 'games_played', 400, 120, 'rare'),
('weekly_perfectionist', 'weekly', 'Perfectionist', 'Win 3 perfect rounds this week', 'neat', 3, 'perfect_rounds', 800, 300, 'epic')
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    target_value = EXCLUDED.target_value,
    target_metric = EXCLUDED.target_metric,
    reward_xp = EXCLUDED.reward_xp,
    reward_nectar = EXCLUDED.reward_nectar,
    tier = EXCLUDED.tier,
    is_active = EXCLUDED.is_active;

-- RPC: Get player challenges for current season
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

-- RPC: Update challenge progress (called from gameplay)
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

-- RPC: Claim challenge reward
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

-- RPC: Initialize or refresh player challenges for a season (called on login/season start)
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

-- RPC: Get challenge summary for UI (counts, next reset times)
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
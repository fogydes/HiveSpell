-- Phase 5a: Competitive Integrity & Anti-Cheat
-- Server-side replay verification + Glicko-2 ranked rating system

-- ============================================================
-- TABLE: Room Keystroke Log (for replay verification)
-- ============================================================
-- Note: room_id references Firebase Realtime DB rooms, not a Supabase table
-- The Firebase room ID is a push ID (e.g. "-Nxyz123"), stored as TEXT (not a uuid)
CREATE TABLE IF NOT EXISTS room_keystroke_log (
    id bigserial PRIMARY KEY,
    room_id text NOT NULL, -- Firebase room ID (no FK - rooms are in Firebase RDB)
    player_id text NOT NULL, -- Firebase UID (no FK - auth is in Firebase, not auth.users)
    word text NOT NULL,
    keystrokes jsonb NOT NULL, -- [{char: 'a', t: 123}, {char: 'b', t: 145}, ...]
    submitted_at timestamptz DEFAULT now(),
    wpm int NOT NULL,
    word_length int NOT NULL,
    time_taken_ms int NOT NULL,
    device_fingerprint jsonb, -- Browser fingerprint for anti-cheat correlation
    verified boolean DEFAULT false,
    suspicious boolean DEFAULT false,
    anomaly_score numeric DEFAULT 0, -- 0-1 score from statistical analysis
    anomaly_reasons text[], -- e.g., 'inter_key_intervals_too_uniform', 'burst_wpm_impossible'
    created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_room_keystroke_log_room_player ON room_keystroke_log (room_id, player_id);
CREATE INDEX idx_room_keystroke_log_submitted ON room_keystroke_log (submitted_at DESC);
CREATE INDEX idx_room_keystroke_log_suspicious ON room_keystroke_log (suspicious) WHERE suspicious = true;

ALTER TABLE room_keystroke_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Players can insert own keystrokes" ON room_keystroke_log;
CREATE POLICY "Players can insert own keystrokes" ON room_keystroke_log
    FOR INSERT WITH CHECK ((select auth.jwt() ->> 'sub') = player_id);

DROP POLICY IF EXISTS "Players can view own keystrokes" ON room_keystroke_log;
CREATE POLICY "Players can view own keystrokes" ON room_keystroke_log
    FOR SELECT USING ((select auth.jwt() ->> 'sub') = player_id);

DROP POLICY IF EXISTS "Admins can view all keystrokes" ON room_keystroke_log;
CREATE POLICY "Admins can view all keystrokes" ON room_keystroke_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = (select auth.jwt() ->> 'sub') AND (tier = 'admin' OR tier = 'moderator')
        )
    );

-- ============================================================
-- TABLE: Ranked Rating (Glicko-2 per mode, per season)
-- ============================================================
CREATE TABLE IF NOT EXISTS ranked_ratings (
    id bigserial PRIMARY KEY,
    user_id text NOT NULL, -- Firebase UID (no FK - auth is in Firebase, not auth.users)
    season_id text NOT NULL, -- e.g., '2026-s1', '2026-s2'
    mode text NOT NULL, -- 'baby', 'easy', 'medium', 'hard', 'genius', 'competitive'
    rating numeric NOT NULL DEFAULT 1500, -- Glicko-2 rating (mu)
    rd numeric NOT NULL DEFAULT 350, -- Rating deviation (sigma in Glicko-2)
    volatility numeric NOT NULL DEFAULT 0.06, -- Volatility (tau in Glicko-2)
    games_played int NOT NULL DEFAULT 0,
    wins int NOT NULL DEFAULT 0,
    losses int NOT NULL DEFAULT 0,
    placement_matches_remaining int NOT NULL DEFAULT 10, -- 10 placement matches
    last_played_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE (user_id, season_id, mode)
);

CREATE INDEX idx_ranked_ratings_user_season ON ranked_ratings (user_id, season_id);
CREATE INDEX idx_ranked_ratings_season_mode_rating ON ranked_ratings (season_id, mode, rating DESC);

ALTER TABLE ranked_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own ranked ratings" ON ranked_ratings;
CREATE POLICY "Users can view own ranked ratings" ON ranked_ratings
    FOR SELECT USING ((select auth.jwt() ->> 'sub') = user_id);

DROP POLICY IF EXISTS "Public can view ranked ratings for leaderboards" ON ranked_ratings;
CREATE POLICY "Public can view ranked ratings for leaderboards" ON ranked_ratings
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "System can upsert ranked ratings" ON ranked_ratings;
CREATE POLICY "System can upsert ranked ratings" ON ranked_ratings
    FOR INSERT WITH CHECK ((select auth.jwt() ->> 'sub') = user_id);

DROP POLICY IF EXISTS "System can update ranked ratings" ON ranked_ratings;
CREATE POLICY "System can update ranked ratings" ON ranked_ratings
    FOR UPDATE USING ((select auth.jwt() ->> 'sub') = user_id);

-- ============================================================
-- TABLE: Ranked Match History
-- ============================================================
-- Note: room_id references Firebase Realtime DB rooms, not a Supabase table
CREATE TABLE IF NOT EXISTS ranked_match_history (
    id bigserial PRIMARY KEY,
    room_id text NOT NULL, -- Firebase room ID (no FK - rooms are in Firebase RDB)
    season_id text NOT NULL,
    mode text NOT NULL,
    player_id text NOT NULL, -- Firebase UID (no FK - auth is in Firebase, not auth.users)
    opponent_ids text[] NOT NULL, -- Firebase UIDs
    rating_before numeric NOT NULL,
    rd_before numeric NOT NULL,
    volatility_before numeric NOT NULL,
    rating_after numeric NOT NULL,
    rd_after numeric NOT NULL,
    volatility_after numeric NOT NULL,
    rating_change numeric NOT NULL,
    result text NOT NULL, -- 'win', 'loss', 'draw'
    place int, -- 1 = winner, 2 = runner-up, etc.
    total_players int NOT NULL,
    game_duration_ms int,
    correct_words int,
    max_wpm int,
    max_streak int,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ranked_match_history_user ON ranked_match_history (player_id, created_at DESC);
CREATE INDEX idx_ranked_match_history_season_mode ON ranked_match_history (season_id, mode, created_at DESC);

ALTER TABLE ranked_match_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own match history" ON ranked_match_history;
CREATE POLICY "Users can view own match history" ON ranked_match_history
    FOR SELECT USING ((select auth.jwt() ->> 'sub') = player_id);

DROP POLICY IF EXISTS "Public can view match history for leaderboards" ON ranked_match_history;
CREATE POLICY "Public can view match history for leaderboards" ON ranked_match_history
    FOR SELECT USING (true);

-- ============================================================
-- TABLE: Season Configuration
-- ============================================================
CREATE TABLE IF NOT EXISTS seasons (
    id text PRIMARY KEY, -- e.g., '2026-s1'
    name text NOT NULL, -- 'Season 1: Dawn of the Hive'
    start_date timestamptz NOT NULL,
    end_date timestamptz NOT NULL,
    is_active boolean DEFAULT false,
    modes text[] NOT NULL DEFAULT ARRAY['medium', 'hard', 'genius', 'competitive'],
    placement_matches int NOT NULL DEFAULT 10,
    rating_decay_per_day numeric DEFAULT 0.5, -- RD increase per day of inactivity
    min_rating_for_decay int DEFAULT 1500, -- Only decay above this
    reward_tiers jsonb NOT NULL DEFAULT '[]', -- Reward structure
    created_at timestamptz DEFAULT now()
);

ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active season" ON seasons;
CREATE POLICY "Public can view active season" ON seasons
    FOR SELECT USING (true);

-- Insert default season
INSERT INTO seasons (id, name, start_date, end_date, is_active, modes, placement_matches, reward_tiers)
VALUES (
    '2026-s1',
    'Season 1: Dawn of the Hive',
    now(),
    now() + interval '12 weeks',
    true,
    ARRAY['medium', 'hard', 'genius', 'competitive'],
    10,
    '[
        {"tier": "Queen Bee", "min_rating": 2200, "rewards": {"nectar": 5000, "cosmetic": "golden_crown_cursor"}},
        {"tier": "Hive Master", "min_rating": 2000, "rewards": {"nectar": 3000, "cosmetic": "silver_wings_trail"}},
        {"tier": "Hive Champion", "min_rating": 1800, "rewards": {"nectar": 1500, "cosmetic": "honey_glow_badge"}},
        {"tier": "Busy Bee", "min_rating": 1600, "rewards": {"nectar": 500, "cosmetic": "pollen_particles"}},
        {"tier": "Newbee", "min_rating": 0, "rewards": {"nectar": 100}}
    ]'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- RPC: Log Keystroke Data (called from client during gameplay)
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_keystroke_data(
    p_room_id text,
    p_player_id text,
    p_word text,
    p_keystrokes jsonb,
    p_wpm int,
    p_word_length int,
    p_time_taken_ms int,
    p_device_fingerprint jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Note: Cannot verify player is in room since rooms are in Firebase RDB
    -- Trust the client to send valid room_id (verified via RLS on player_id)

    INSERT INTO room_keystroke_log (room_id, player_id, word, keystrokes, wpm, word_length, time_taken_ms, device_fingerprint)
    VALUES (p_room_id, p_player_id, p_word, p_keystrokes, p_wpm, p_word_length, p_time_taken_ms, p_device_fingerprint);
END;
$$;

-- ============================================================
-- RPC: Verify Keystroke Log (statistical analysis)
-- ============================================================
CREATE OR REPLACE FUNCTION public.verify_keystroke_log(
    p_room_id text,
    p_player_id text,
    p_word text
)
RETURNS TABLE (
    verified boolean,
    anomaly_score numeric,
    anomaly_reasons text[],
    is_suspicious boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_keystrokes jsonb;
    v_intervals numeric[];
    v_mean_interval numeric;
    v_stddev_interval numeric;
    v_cv numeric; -- Coefficient of variation
    v_anomaly_score numeric := 0;
    v_anomaly_reasons text[] := '{}';
    v_is_suspicious boolean := false;
    v_wpm int;
    v_time_taken_ms int;
    v_word_length int;
    v_keystroke_count int;
BEGIN
    -- Get the keystroke log for this word
    SELECT keystrokes, wpm, time_taken_ms, word_length
    INTO v_keystrokes, v_wpm, v_time_taken_ms, v_word_length
    FROM room_keystroke_log
    WHERE room_id = p_room_id
        AND player_id = p_player_id
        AND word = p_word
    ORDER BY submitted_at DESC
    LIMIT 1;

    IF v_keystrokes IS NULL THEN
        RETURN QUERY SELECT false, 1.0, ARRAY['no_keystroke_data'], true;
    END IF;

    -- Extract inter-keystroke intervals (in milliseconds)
    v_keystroke_count := jsonb_array_length(v_keystrokes);
    IF v_keystroke_count < 2 THEN
        RETURN QUERY SELECT false, 0.5, ARRAY['insufficient_keystrokes'], false;
    END IF;

    -- Calculate intervals between consecutive keystrokes
    SELECT jsonb_agg(interval_ms ORDER BY idx) INTO v_intervals
    FROM (
        SELECT
            (ks->>(idx+1))->>'t' as t1,
            ks->idx->>'t' as t0,
            ((ks->>(idx+1))->>'t')::int - (ks->idx->>'t')::int as interval_ms,
            idx
        FROM (
            SELECT kebs as ks, generate_series(0, jsonb_array_length(kebs) - 2) as idx
            FROM (SELECT v_keystrokes as kebs) s
        ) sub
    ) intervals
    WHERE interval_ms > 0 AND interval_ms < 5000; -- Filter out impossible intervals

    IF array_length(v_intervals, 1) IS NULL OR array_length(v_intervals, 1) < 2 THEN
        RETURN QUERY SELECT false, 0.3, ARRAY['no_valid_intervals'], false;
    END IF;

    -- Statistical analysis of intervals
    SELECT avg(interval_ms)::numeric, stddev(interval_ms)::numeric
    INTO v_mean_interval, v_stddev_interval
    FROM unnest(v_intervals) as interval_ms;

    IF v_mean_interval IS NULL OR v_mean_interval = 0 THEN
        RETURN QUERY SELECT false, 1.0, ARRAY['zero_mean_interval'], true;
    END IF;

    -- Coefficient of variation (CV) - human typing has CV ~ 0.3-0.5
    -- Very low CV (< 0.1) suggests automation
    -- Very high CV (> 1.0) suggests erratic input
    v_cv := v_stddev_interval / v_mean_interval;

    IF v_cv < 0.1 THEN
        v_anomaly_score := v_anomaly_score + 0.4;
        v_anomaly_reasons := v_anomaly_reasons || 'inter_key_intervals_too_uniform';
    ELSIF v_cv > 1.0 THEN
        v_anomaly_score := v_anomaly_score + 0.2;
        v_anomaly_reasons := v_anomaly_reasons || 'inter_key_intervals_highly_erratic';
    END IF;

    -- Check for impossibly high WPM
    -- Max realistic human WPM for burst typing varies by word length
    DECLARE
        v_max_human_wpm int;
    BEGIN
        IF v_word_length <= 3 THEN
            v_max_human_wpm := 800;
        ELSIF v_word_length <= 5 THEN
            v_max_human_wpm := 600;
        ELSIF v_word_length <= 8 THEN
            v_max_human_wpm := 450;
        ELSE
            v_max_human_wpm := 350;
        END IF;

        IF v_wpm > v_max_human_wpm THEN
            v_anomaly_score := v_anomaly_score + 0.5;
            v_anomaly_reasons := v_anomaly_reasons || 'burst_wpm_exceeds_human_limit';
        END IF;
    END;

    -- Check for perfect intervals (exactly equal - robotic)
    DECLARE
        v_unique_intervals int;
    BEGIN
        SELECT count(DISTINCT interval_ms) INTO v_unique_intervals
        FROM unnest(v_intervals) as interval_ms;

        IF v_unique_intervals = 1 AND array_length(v_intervals, 1) > 3 THEN
            v_anomaly_score := v_anomaly_score + 0.6;
            v_anomaly_reasons := v_anomaly_reasons || 'perfectly_uniform_intervals';
        END IF;
    END;

    -- Check for sub-human minimum intervals (< 30ms consistently)
    DECLARE
        v_min_interval int;
    BEGIN
        SELECT min(interval_ms) INTO v_min_interval
        FROM unnest(v_intervals) as interval_ms;

        IF v_min_interval < 30 THEN
            v_anomaly_score := v_anomaly_score + 0.3;
            v_anomaly_reasons := v_anomaly_reasons || 'subhuman_keystroke_intervals';
        END IF;
    END;

    -- Time taken vs word length sanity check
    DECLARE
        v_chars_per_ms numeric;
    BEGIN
        v_chars_per_ms := v_word_length::numeric / v_time_taken_ms;

        -- Impossibly fast: > 0.1 chars/ms = 100 chars/sec = impossible for human
        IF v_chars_per_ms > 0.1 THEN
            v_anomaly_score := v_anomaly_score + 0.4;
            v_anomaly_reasons := v_anomaly_reasons || 'impossible_typing_speed';
        END IF;
    END;

    -- Cap anomaly score at 1.0
    v_anomaly_score := LEAST(v_anomaly_score, 1.0);
    v_is_suspicious := v_anomaly_score >= 0.6;

    -- Update the log entry
    UPDATE room_keystroke_log
    SET verified = true,
        suspicious = v_is_suspicious,
        anomaly_score = v_anomaly_score,
        anomaly_reasons = v_anomaly_reasons
    WHERE room_id = p_room_id
        AND player_id = p_player_id
        AND word = p_word;

    RETURN QUERY SELECT NOT v_is_suspicious, v_anomaly_score, v_anomaly_reasons, v_is_suspicious;
END;
$$;

-- ============================================================
-- Glicko-2 Implementation (in PL/pgSQL)
-- ============================================================

-- Helper: Glicko-2 scale conversion (from 1500 scale to standard deviation units)
-- mu = (rating - 1500) / 173.7178
-- phi = rd / 173.7178
-- tau = 0.5 (system constant, typical value)
-- Conversion back: rating = mu * 173.7178 + 1500

CREATE OR REPLACE FUNCTION public.glicko2_mu_from_rating(p_rating numeric)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
    SELECT (p_rating - 1500) / 173.7178;
$$;

CREATE OR REPLACE FUNCTION public.glicko2_phi_from_rd(p_rd numeric)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
    SELECT p_rd / 173.7178;
$$;

CREATE OR REPLACE FUNCTION public.glicko2_rating_from_mu(p_mu numeric)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
    SELECT p_mu * 173.7178 + 1500;
$$;

CREATE OR REPLACE FUNCTION public.glicko2_rd_from_phi(p_phi numeric)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
    SELECT p_phi * 173.7178;
$$;

-- Core Glicko-2 update function for a single player vs multiple opponents
CREATE OR REPLACE FUNCTION public.glicko2_update_rating(
    p_rating numeric,       -- Current rating (1500 scale)
    p_rd numeric,           -- Current RD (350 scale)
    p_volatility numeric,   -- Current volatility (0.06 default)
    p_opponent_ratings numeric[], -- Array of opponent ratings
    p_opponent_rds numeric[],       -- Array of opponent RDs
    p_scores numeric[],     -- Array of scores (1.0 = win, 0.5 = draw, 0.0 = loss)
    p_tau numeric DEFAULT 0.5       -- System volatility constant
)
RETURNS TABLE (
    new_rating numeric,
    new_rd numeric,
    new_volatility numeric
)
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
    CONST_q numeric := 0.0057564627324851142100; -- ln(10) / 400
    CONST_PI numeric := 3.141592653589793;

    v_mu numeric;
    v_phi numeric;
    v_sigma numeric := p_volatility;

    v_opponent_mus numeric[];
    v_opponent_phis numeric[];
    v_g_phis numeric[];
    v_E numeric[];
    v_delta numeric;
    v_v numeric;
    v_a numeric;
    v_IL numeric;

    -- For volatility optimization
    v_f numeric;
    v_A numeric;
    v_B numeric;
    v_fA numeric;
    v_fB numeric;
    v_tau_sq numeric := p_tau * p_tau;
    v_epsilon numeric := 0.000001;
    v_iter_max int := 50;

    i int;
    n int := array_length(p_opponent_ratings, 1);
BEGIN
    -- Convert to Glicko-2 scale
    v_mu := glicko2_mu_from_rating(p_rating);
    v_phi := glicko2_phi_from_rd(p_rd);

    -- Convert opponents
    v_opponent_mus := ARRAY(SELECT glicko2_mu_from_rating(r) FROM unnest(p_opponent_ratings) r);
    v_opponent_phis := ARRAY(SELECT glicko2_phi_from_rd(r) FROM unnest(p_opponent_rds) r);

    -- Calculate g(phi) for each opponent: g(phi) = 1 / sqrt(1 + 3*phi^2/pi^2)
    v_g_phis := ARRAY(
        SELECT 1.0 / sqrt(1.0 + 3.0 * phi * phi / (CONST_PI * CONST_PI))
        FROM unnest(v_opponent_phis) phi
    );

    -- Calculate E(mu, phi_j, mu_j) for each opponent
    v_E := ARRAY(
        SELECT 1.0 / (1.0 + exp(-g * (v_mu - mu_j)))
        FROM unnest(v_g_phis, v_opponent_mus) as t(g, mu_j)
    );

    -- Calculate v = 1 / sum(g_j^2 * E_j * (1 - E_j))
    SELECT 1.0 / sum(g * g * E * (1.0 - E))
    INTO v_v
    FROM unnest(v_g_phis, v_E) as t(g, E);

    -- Calculate delta = v * sum(g_j * (s_j - E_j))
    SELECT v * sum(g * (s - E))
    INTO v_delta
    FROM unnest(v_g_phis, p_scores, v_E) as t(g, s, E);

    -- Volatility estimation (iterative)
    v_a := ln(v_sigma * v_sigma);

    -- Find initial bounds for the root-finding
    IF v_delta * v_delta > v_phi * v_phi + v_v THEN
        v_B := ln(v_delta * v_delta - v_phi * v_phi - v_v);
    ELSE
        v_B := v_a - 1.0;
        LOOP
            v_f := v_B;
            v_f := (exp(v_f) * (v_phi * v_phi + v_v + exp(v_f)) - (v_delta * v_delta - v_phi * v_phi - v_v)) /
                   (2.0 * (v_phi * v_phi + v_v + exp(v_f)) * exp(v_f) - (v_delta * v_delta - v_phi * v_phi - v_v));
            IF abs(v_f - v_B) < v_epsilon THEN
                EXIT;
            END IF;
            v_B := v_f;
        END LOOP;
        v_B := v_f;
    END IF;

    -- Illinois algorithm for root finding
    v_A := v_a;
    v_fA := (exp(v_A) * (v_phi * v_phi + v_v + exp(v_A)) - (v_delta * v_delta - v_phi * v_phi - v_v)) /
            (2.0 * (v_phi * v_phi + v_v + exp(v_A)) * exp(v_A) - (v_delta * v_delta - v_phi * v_phi - v_v));
    v_fA := v_fA - (v_A - v_a) / v_tau_sq;

    v_fB := (exp(v_B) * (v_phi * v_phi + v_v + exp(v_B)) - (v_delta * v_delta - v_phi * v_phi - v_v)) /
            (2.0 * (v_phi * v_phi + v_v + exp(v_B)) * exp(v_B) - (v_delta * v_delta - v_phi * v_phi - v_v));
    v_fB := v_fB - (v_B - v_a) / v_tau_sq;

    i := 0;
    WHILE abs(v_B - v_A) > v_epsilon AND i < v_iter_max LOOP
        v_f := (v_A * v_fB - v_B * v_fA) / (v_fB - v_fA);
        IF v_f * v_fA <= 0 THEN
            v_B := v_f;
            v_fB := (exp(v_B) * (v_phi * v_phi + v_v + exp(v_B)) - (v_delta * v_delta - v_phi * v_phi - v_v)) /
                    (2.0 * (v_phi * v_phi + v_v + exp(v_B)) * exp(v_B) - (v_delta * v_delta - v_phi * v_phi - v_v));
            v_fB := v_fB - (v_B - v_a) / v_tau_sq;
        ELSE
            v_A := v_f;
            v_fA := (exp(v_A) * (v_phi * v_phi + v_v + exp(v_A)) - (v_delta * v_delta - v_phi * v_phi - v_v)) /
                    (2.0 * (v_phi * v_phi + v_v + exp(v_A)) * exp(v_A) - (v_delta * v_delta - v_phi * v_phi - v_v));
            v_fA := v_fA - (v_A - v_a) / v_tau_sq;
        END IF;
        i := i + 1;
    END LOOP;

    v_sigma := exp(v_f / 2.0);

    -- Update phi with new volatility
    v_phi := 1.0 / sqrt(1.0 / (v_phi * v_phi + v_sigma * v_sigma) + 1.0 / v_v);

    -- Update mu
    v_mu := v_mu + v_phi * v_phi * sum_vec(
        ARRAY(
            SELECT g * (s - E)
            FROM unnest(v_g_phis, p_scores, v_E) as t(g, s, E)
        )
    );

    -- Convert back to 1500 scale
    RETURN QUERY SELECT
        glicko2_rating_from_mu(v_mu),
        glicko2_rd_from_phi(v_phi),
        v_sigma;
END;
$$;

-- Helper function for sum of array (PostgreSQL doesn't have built-in)
CREATE OR REPLACE FUNCTION public.sum_vec(p_arr numeric[])
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
    v_sum numeric := 0;
    v_elem numeric;
BEGIN
    FOREACH v_elem IN ARRAY p_arr LOOP
        v_sum := v_sum + v_elem;
    END LOOP;
    RETURN v_sum;
END;
$$;

-- ============================================================
-- RPC: Update Ranked Rating (called after ranked match)
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_ranked_rating(
    p_player_id text,
    p_season_id text,
    p_mode text,
    p_room_id text,               -- Firebase room ID (no FK - rooms are in Firebase RDB)
    p_opponent_ids text[],       -- Array of opponent Firebase UIDs
    p_result text,               -- 'win', 'loss', 'draw'
    p_place int,                 -- Final place (1 = winner)
    p_total_players int,
    p_game_duration_ms int DEFAULT NULL,
    p_correct_words int DEFAULT 0,
    p_max_wpm int DEFAULT 0,
    p_max_streak int DEFAULT 0
)
RETURNS TABLE (
    new_rating numeric,
    new_rd numeric,
    new_volatility numeric,
    rating_change numeric,
    was_placement boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_rating numeric;
    v_current_rd numeric;
    v_current_volatility numeric;
    v_games_played int;
    v_placement_remaining int;
    v_opponent_ratings numeric[];
    v_opponent_rds numeric[];
    v_scores numeric[];
    v_new_rating numeric;
    v_new_rd numeric;
    v_new_volatility numeric;
    v_rating_change numeric;
    v_was_placement boolean := false;
    v_result_score numeric;
    v_is_placement_match boolean;
BEGIN
    -- Get current rating
    SELECT rating, rd, volatility, games_played, placement_matches_remaining
    INTO v_current_rating, v_current_rd, v_current_volatility, v_games_played, v_placement_remaining
    FROM ranked_ratings
    WHERE user_id = p_player_id
        AND season_id = p_season_id
        AND mode = p_mode;

    IF NOT FOUND THEN
        -- Create new rating entry (placement match)
        v_current_rating := 1500;
        v_current_rd := 350;
        v_current_volatility := 0.06;
        v_games_played := 0;
        v_placement_remaining := 10;
        v_was_placement := true;

        INSERT INTO ranked_ratings (user_id, season_id, mode, rating, rd, volatility, games_played, placement_matches_remaining)
        VALUES (p_player_id, p_season_id, p_mode, 1500, 350, 0.06, 0, 10)
        ON CONFLICT DO NOTHING;
    END IF;

    v_is_placement_match := v_placement_remaining > 0;

    -- Get opponent ratings
    SELECT array_agg(r.rating), array_agg(r.rd)
    INTO v_opponent_ratings, v_opponent_rds
    FROM ranked_ratings r
    WHERE r.user_id = ANY(p_opponent_ids)
        AND r.season_id = p_season_id
        AND r.mode = p_mode;

    -- If some opponents don't have ratings yet, use defaults
    IF v_opponent_ratings IS NULL OR array_length(v_opponent_ratings, 1) < array_length(p_opponent_ids, 1) THEN
        v_opponent_ratings := ARRAY(SELECT COALESCE(r.rating, 1500) FROM unnest(p_opponent_ids) oid LEFT JOIN LATERAL (
            SELECT rating FROM ranked_ratings WHERE user_id = oid AND season_id = p_season_id AND mode = p_mode
        ) r ON true);
        v_opponent_rds := ARRAY(SELECT COALESCE(r.rd, 350) FROM unnest(p_opponent_ids) oid LEFT JOIN LATERAL (
            SELECT rd FROM ranked_ratings WHERE user_id = oid AND season_id = p_season_id AND mode = p_mode
        ) r ON true);
    END IF;

    -- Determine scores based on result
    -- For multi-player: winner gets 1.0 vs each opponent, losers get 0.0
    -- For draws: 0.5
    IF p_result = 'win' THEN
        v_scores := ARRAY(SELECT 1.0 FROM unnest(p_opponent_ids));
    ELSIF p_result = 'loss' THEN
        v_scores := ARRAY(SELECT 0.0 FROM unnest(p_opponent_ids));
    ELSE
        v_scores := ARRAY(SELECT 0.5 FROM unnest(p_opponent_ids));
    END IF;

    -- Update rating using Glicko-2
    SELECT new_rating, new_rd, new_volatility
    INTO v_new_rating, v_new_rd, v_new_volatility
    FROM glicko2_update_rating(
        v_current_rating,
        v_current_rd,
        v_current_volatility,
        v_opponent_ratings,
        v_opponent_rds,
        v_scores
    );

    v_rating_change := v_new_rating - v_current_rating;

    -- Update the player's rating
    UPDATE ranked_ratings
    SET rating = v_new_rating,
        rd = v_new_rd,
        volatility = v_new_volatility,
        games_played = games_played + 1,
        wins = wins + CASE WHEN p_result = 'win' THEN 1 ELSE 0 END,
        losses = losses + CASE WHEN p_result = 'loss' THEN 1 ELSE 0 END,
        placement_matches_remaining = GREATEST(0, placement_matches_remaining - 1),
        last_played_at = now(),
        updated_at = now()
    WHERE user_id = p_player_id
        AND season_id = p_season_id
        AND mode = p_mode;

    -- Record match history
    INSERT INTO ranked_match_history (
        room_id,
        season_id, mode, player_id, opponent_ids,
        rating_before, rd_before, volatility_before,
        rating_after, rd_after, volatility_after,
        rating_change, result, place, total_players,
        game_duration_ms, correct_words, max_wpm, max_streak
    )
    VALUES (
        p_room_id,
        p_season_id, p_mode, p_player_id, p_opponent_ids,
        v_current_rating, v_current_rd, v_current_volatility,
        v_new_rating, v_new_rd, v_new_volatility,
        v_rating_change, p_result, p_place, p_total_players,
        p_game_duration_ms, p_correct_words, p_max_wpm, p_max_streak
    );

    RETURN QUERY SELECT v_new_rating, v_new_rd, v_new_volatility, v_rating_change, v_was_placement;
END;
$$;

-- ============================================================
-- RPC: Get Ranked Rating
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_ranked_rating(
    p_user_id text,
    p_season_id text DEFAULT NULL,
    p_mode text DEFAULT NULL
)
RETURNS TABLE (
    user_id text,
    season_id text,
    mode text,
    rating numeric,
    rd numeric,
    volatility numeric,
    games_played int,
    wins int,
    losses int,
    placement_matches_remaining int,
    tier text,
    last_played_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tier text;
BEGIN
    IF p_season_id IS NULL THEN
        SELECT id INTO p_season_id FROM seasons WHERE is_active = true LIMIT 1;
    END IF;

    RETURN QUERY
    SELECT
        rr.user_id,
        rr.season_id,
        rr.mode,
        rr.rating,
        rr.rd,
        rr.volatility,
        rr.games_played,
        rr.wins,
        rr.losses,
        rr.placement_matches_remaining,
        CASE
            WHEN rr.placement_matches_remaining > 0 THEN 'Unranked (Placement)'
            WHEN rr.rating >= 2200 THEN 'Queen Bee'
            WHEN rr.rating >= 2000 THEN 'Hive Master'
            WHEN rr.rating >= 1800 THEN 'Hive Champion'
            WHEN rr.rating >= 1600 THEN 'Busy Bee'
            ELSE 'Newbee'
        END as tier,
        rr.last_played_at
    FROM ranked_ratings rr
    WHERE rr.user_id = p_user_id
        AND (p_season_id IS NULL OR rr.season_id = p_season_id)
        AND (p_mode IS NULL OR rr.mode = p_mode)
    ORDER BY rr.season_id DESC, rr.rating DESC;
END;
$$;

-- ============================================================
-- RPC: Get Ranked Leaderboard
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_ranked_leaderboard(
    p_mode text,
    p_season_id text DEFAULT NULL,
    p_limit int DEFAULT 50,
    p_offset int DEFAULT 0
)
RETURNS TABLE (
    rank int,
    user_id text,
    username text,
    avatar_url text,
    rating numeric,
    rd numeric,
    games_played int,
    wins int,
    losses int,
    tier text,
    win_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF p_season_id IS NULL THEN
        SELECT id INTO p_season_id FROM seasons WHERE is_active = true LIMIT 1;
    END IF;

    RETURN QUERY
    SELECT
        ROW_NUMBER() OVER (ORDER BY rr.rating DESC, rr.rd ASC) as rank,
        rr.user_id,
        p.username,
        p.avatar_url,
        rr.rating,
        rr.rd,
        rr.games_played,
        rr.wins,
        rr.losses,
        CASE
            WHEN rr.placement_matches_remaining > 0 THEN 'Unranked (Placement)'
            WHEN rr.rating >= 2200 THEN 'Queen Bee'
            WHEN rr.rating >= 2000 THEN 'Hive Master'
            WHEN rr.rating >= 1800 THEN 'Hive Champion'
            WHEN rr.rating >= 1600 THEN 'Busy Bee'
            ELSE 'Newbee'
        END as tier,
        CASE WHEN rr.games_played > 0 THEN rr.wins::numeric / rr.games_played ELSE 0 END as win_rate
    FROM ranked_ratings rr
    INNER JOIN profiles p ON rr.user_id = p.id
    WHERE rr.season_id = p_season_id
        AND rr.mode = p_mode
        AND rr.placement_matches_remaining = 0 -- Only show completed placement
        AND rr.games_played > 0
    ORDER BY rr.rating DESC, rr.rd ASC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- ============================================================
-- RPC: Apply Rating Decay (for inactivity)
-- ============================================================
CREATE OR REPLACE FUNCTION public.apply_ranked_decay(
    p_season_id text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_decay_per_day numeric;
    v_min_rating int;
    v_days_inactive int;
    v_rd_increase numeric;
BEGIN
    IF p_season_id IS NULL THEN
        SELECT id, rating_decay_per_day, min_rating_for_decay
        INTO p_season_id, v_decay_per_day, v_min_rating
        FROM seasons WHERE is_active = true LIMIT 1;
    ELSE
        SELECT rating_decay_per_day, min_rating_for_decay
        INTO v_decay_per_day, v_min_rating
        FROM seasons WHERE id = p_season_id;
    END IF;

    -- Update RD for inactive players (RD increases with inactivity)
    -- Only apply if rating is above minimum and last played > 1 day ago
    UPDATE ranked_ratings
    SET rd = LEAST(rd + v_decay_per_day * EXTRACT(DAY FROM (now() - last_played_at)), 350),
        updated_at = now()
    WHERE season_id = p_season_id
        AND rating > v_min_rating
        AND last_played_at IS NOT NULL
        AND last_played_at < now() - interval '1 day'
        AND rd < 350;

    RAISE NOTICE 'Ranked decay applied for season % at %', p_season_id, now();
END;
$$;

-- ============================================================
-- GRANT EXECUTE PERMISSIONS
-- ============================================================
GRANT EXECUTE ON FUNCTION public.log_keystroke_data(text, text, text, jsonb, int, int, int, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_keystroke_log(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.glicko2_update_rating(numeric, numeric, numeric, numeric[], numeric[], numeric[], numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_ranked_rating(text, text, text, text, text[], text, int, int, int, int, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ranked_rating(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_ranked_leaderboard(text, text, int, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_ranked_decay(text) TO authenticated;

-- ============================================================
-- CRON JOB: Daily rating decay at 03:00 UTC
-- ============================================================
-- Note: Requires pg_cron extension
-- SELECT cron.schedule('ranked-decay-daily', '0 3 * * *', 'SELECT public.apply_ranked_decay();');
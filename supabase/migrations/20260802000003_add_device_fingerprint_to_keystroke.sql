-- Phase 5a: Anti-Cheat Hardening - Device Fingerprinting
-- Shadow ban queue, device fingerprint registry, and enhanced anomaly detection

-- ============================================================
-- TABLE: Shadow Ban Queue (separate matchmaking pool for flagged accounts)
-- ============================================================
CREATE TABLE IF NOT EXISTS shadow_ban_queue (
    id bigserial PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reason text NOT NULL, -- 'high_anomaly_score', 'multiple_flags', 'device_mismatch', 'manual_review'
    anomaly_score numeric NOT NULL,
    flagged_at timestamptz DEFAULT now(),
    reviewed_at timestamptz,
    reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    resolution text, -- 'confirmed_cheat', 'false_positive', 'monitoring'
    resolution_notes text,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_shadow_ban_queue_user ON shadow_ban_queue (user_id);
CREATE INDEX idx_shadow_ban_queue_status ON shadow_ban_queue (reviewed_at) WHERE reviewed_at IS NULL;

ALTER TABLE shadow_ban_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view shadow ban queue" ON shadow_ban_queue;
CREATE POLICY "Admins can view shadow ban queue" ON shadow_ban_queue
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND (tier = 'admin' OR tier = 'moderator')
        )
    );

DROP POLICY IF EXISTS "Admins can insert shadow ban queue" ON shadow_ban_queue;
CREATE POLICY "Admins can insert shadow ban queue" ON shadow_ban_queue
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND (tier = 'admin' OR tier = 'moderator')
        )
    );

DROP POLICY IF EXISTS "Admins can update shadow ban queue" ON shadow_ban_queue;
CREATE POLICY "Admins can update shadow ban queue" ON shadow_ban_queue
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND (tier = 'admin' OR tier = 'moderator')
        )
    );

-- ============================================================
-- TABLE: Device Fingerprint Registry (for tracking known devices per user)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_device_fingerprints (
    id bigserial PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    fingerprint_id text NOT NULL, -- Shortened hash for matching
    full_fingerprint jsonb NOT NULL,
    first_seen_at timestamptz DEFAULT now(),
    last_seen_at timestamptz DEFAULT now(),
    is_trusted boolean DEFAULT false,
    trust_score numeric DEFAULT 0.5, -- 0-1, increases with consistent legitimate play
    created_at timestamptz DEFAULT now(),
    UNIQUE (user_id, fingerprint_id)
);

CREATE INDEX idx_user_device_fingerprints_user ON user_device_fingerprints (user_id);
CREATE INDEX idx_user_device_fingerprints_fingerprint ON user_device_fingerprints (fingerprint_id);

ALTER TABLE user_device_fingerprints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own device fingerprints" ON user_device_fingerprints;
CREATE POLICY "Users can view own device fingerprints" ON user_device_fingerprints
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can upsert device fingerprints" ON user_device_fingerprints;
CREATE POLICY "System can upsert device fingerprints" ON user_device_fingerprints
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all device fingerprints" ON user_device_fingerprints;
CREATE POLICY "Admins can view all device fingerprints" ON user_device_fingerprints
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND (tier = 'admin' OR tier = 'moderator')
        )
    );

-- ============================================================
-- RPC: Register/Update Device Fingerprint
-- ============================================================
CREATE OR REPLACE FUNCTION public.register_device_fingerprint(
    p_user_id uuid,
    p_fingerprint_id text,
    p_full_fingerprint jsonb
)
RETURNS TABLE (
    is_new boolean,
    trust_score numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_existing user_device_fingerprints%ROWTYPE;
    v_new_trust_score numeric;
BEGIN
    -- Check if this fingerprint exists for the user
    SELECT * INTO v_existing
    FROM user_device_fingerprints
    WHERE user_id = p_user_id AND fingerprint_id = p_fingerprint_id;

    IF FOUND THEN
        -- Update last seen and slightly increase trust score
        v_new_trust_score := LEAST(v_existing.trust_score + 0.02, 1.0);

        UPDATE user_device_fingerprints
        SET last_seen_at = now(),
            trust_score = v_new_trust_score,
            full_fingerprint = p_full_fingerprint -- Update with latest
        WHERE id = v_existing.id
        RETURNING * INTO v_existing;

        RETURN QUERY SELECT false, v_new_trust_score;
    ELSE
        -- Insert new fingerprint with base trust score
        INSERT INTO user_device_fingerprints (user_id, fingerprint_id, full_fingerprint, trust_score)
        VALUES (p_user_id, p_fingerprint_id, p_full_fingerprint, 0.5)
        ON CONFLICT (user_id, fingerprint_id) DO UPDATE SET
            full_fingerprint = EXCLUDED.full_fingerprint,
            last_seen_at = now()
        RETURNING true, 0.5;

        RETURN QUERY SELECT true, 0.5;
    END IF;
END;
$$;

-- ============================================================
-- RPC: Check Device Fingerprint Anomaly (device switching detection)
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_device_fingerprint_anomaly(
    p_user_id uuid,
    p_fingerprint_id text
)
RETURNS TABLE (
    is_anomaly boolean,
    anomaly_reason text,
    trust_score numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_device user_device_fingerprints%ROWTYPE;
    v_trusted_count int;
    v_total_count int;
BEGIN
    -- Get the current device
    SELECT * INTO v_device
    FROM user_device_fingerprints
    WHERE user_id = p_user_id AND fingerprint_id = p_fingerprint_id;

    IF NOT FOUND THEN
        -- First time seeing this device for this user
        RETURN QUERY SELECT true, 'new_device', 0.0;
    END IF;

    -- Count trusted vs total devices for this user
    SELECT count(*) FILTER (WHERE is_trusted) as trusted_count,
           count(*) as total_count
    INTO v_trusted_count, v_total_count
    FROM user_device_fingerprints
    WHERE user_id = p_user_id;

    -- If user has multiple devices and this one has low trust, flag it
    IF v_total_count > 1 AND v_device.trust_score < 0.3 THEN
        RETURN QUERY SELECT true, 'low_trust_device', v_device.trust_score;
    END IF;

    -- If this device was never marked trusted but others are
    IF v_trusted_count > 0 AND NOT v_device.is_trusted AND v_device.trust_score < 0.5 THEN
        RETURN QUERY SELECT true, 'untrusted_device_among_trusted', v_device.trust_score;
    END IF;

    RETURN QUERY SELECT false, 'ok', v_device.trust_score;
END;
$$;

-- ============================================================
-- RPC: Flag Player for Shadow Ban Review
-- ============================================================
CREATE OR REPLACE FUNCTION public.flag_for_shadow_ban(
    p_user_id uuid,
    p_reason text,
    p_anomaly_score numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO shadow_ban_queue (user_id, reason, anomaly_score)
    VALUES (p_user_id, p_reason, p_anomaly_score)
    ON CONFLICT DO NOTHING; -- Avoid duplicate flags
END;
$$;

-- ============================================================
-- RPC: Get Shadow Ban Queue (for admin review)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_shadow_ban_queue(
    p_limit int DEFAULT 50,
    p_offset int DEFAULT 0,
    p_unreviewed_only boolean DEFAULT true
)
RETURNS TABLE (
    id bigint,
    user_id uuid,
    username text,
    avatar_url text,
    reason text,
    anomaly_score numeric,
    flagged_at timestamptz,
    reviewed_at timestamptz,
    reviewed_by uuid,
    resolution text,
    resolution_notes text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        sbq.id,
        sbq.user_id,
        p.username,
        p.avatar_url,
        sbq.reason,
        sbq.anomaly_score,
        sbq.flagged_at,
        sbq.reviewed_at,
        sbq.reviewed_by,
        sbq.resolution,
        sbq.resolution_notes
    FROM shadow_ban_queue sbq
    INNER JOIN profiles p ON sbq.user_id = p.id
    WHERE (NOT p_unreviewed_only OR sbq.reviewed_at IS NULL)
    ORDER BY sbq.flagged_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- ============================================================
-- RPC: Resolve Shadow Ban Queue Entry
-- ============================================================
CREATE OR REPLACE FUNCTION public.resolve_shadow_ban(
    p_queue_id bigint,
    p_admin_id uuid,
    p_resolution text, -- 'confirmed_cheat', 'false_positive', 'monitoring'
    p_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE shadow_ban_queue
    SET reviewed_at = now(),
        reviewed_by = p_admin_id,
        resolution = p_resolution,
        resolution_notes = p_notes
    WHERE id = p_queue_id;
END;
$$;

-- ============================================================
-- RPC: Check if User is Shadow Banned (for matchmaking)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_shadow_banned(
    p_user_id uuid
)
RETURNS TABLE (
    is_shadow_banned boolean,
    reason text,
    flagged_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        true,
        sbq.reason,
        sbq.flagged_at
    FROM shadow_ban_queue sbq
    WHERE sbq.user_id = p_user_id
        AND sbq.reviewed_at IS NULL
        AND sbq.resolution = 'monitoring' -- Only actively shadow banned
    LIMIT 1;
END;
$$;

-- ============================================================
-- ENHANCED ANOMALY DETECTION: Update verify_keystroke_log
-- ============================================================
-- The verify_keystroke_log function already exists with statistical analysis
-- We'll add additional checks for:
-- 1. Device fingerprint mismatch
-- 2. Behavioral pattern analysis (consistency across words)
-- 3. Session-level anomaly aggregation

-- Update the verify_keystroke_log to include device fingerprint check
CREATE OR REPLACE FUNCTION public.verify_keystroke_log(
    p_room_id uuid,
    p_player_id uuid,
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
    v_device_fingerprint jsonb;
    v_fingerprint_id text;
    v_fingerprint_check record;
BEGIN
    -- Get the keystroke log for this word (including device fingerprint)
    SELECT keystrokes, wpm, time_taken_ms, word_length, device_fingerprint
    INTO v_keystrokes, v_wpm, v_time_taken_ms, v_word_length, v_device_fingerprint
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

    -- NEW: Device fingerprint anomaly check
    IF v_device_fingerprint IS NOT NULL THEN
        -- Generate fingerprint ID from the fingerprint
        v_fingerprint_id := md5(v_device_fingerprint::text);

        -- Check if this device is anomalous for this user
        SELECT * INTO v_fingerprint_check
        FROM check_device_fingerprint_anomaly(p_player_id, v_fingerprint_id);

        IF v_fingerprint_check.is_anomaly THEN
            v_anomaly_score := v_anomaly_score + 0.3;
            v_anomaly_reasons := v_anomaly_reasons || ('device_anomaly:' || v_fingerprint_check.anomaly_reason);
        END IF;

        -- Register/update the device fingerprint for this user
        PERFORM register_device_fingerprint(p_player_id, v_fingerprint_id, v_device_fingerprint);
    END IF;

    -- NEW: Session-level pattern analysis (check consistency across words in this room)
    DECLARE
        v_session_stats record;
        v_session_cv numeric;
        v_session_wpm_avg numeric;
        v_session_wpm_stddev numeric;
    BEGIN
        -- Get aggregate stats for this player in this room
        SELECT
            avg(interval_cv) as avg_cv,
            stddev(interval_cv) as cv_stddev,
            avg(wpm) as avg_wpm,
            stddev(wpm) as wpm_stddev,
            count(*) as word_count
        INTO v_session_stats
        FROM (
            SELECT
                rkl.word,
                rkl.wpm,
                -- Calculate CV for this word
                CASE
                    WHEN jsonb_array_length(rkl.keystrokes) > 1 THEN
                        (SELECT stddev(interval_ms)::numeric / avg(interval_ms)::numeric
                         FROM (
                             SELECT ((ks->>(idx+1))->>'t')::int - (ks->idx->>'t')::int as interval_ms
                             FROM generate_series(0, jsonb_array_length(rkl.keystrokes) - 2) as idx,
                                  (SELECT rkl.keystrokes as ks) k
                         ) intervals
                         WHERE interval_ms > 0 AND interval_ms < 5000
                        )
                    ELSE NULL
                END as interval_cv
            FROM room_keystroke_log rkl
            WHERE rkl.room_id = p_room_id
                AND rkl.player_id = p_player_id
                AND rkl.word != p_word -- Exclude current word
        ) session_words
        WHERE interval_cv IS NOT NULL;

        IF v_session_stats.word_count >= 3 THEN
            -- If this word's CV deviates significantly from session average
            IF v_session_stats.cv_stddev IS NOT NULL AND v_session_stats.cv_stddev > 0 THEN
                DECLARE
                    v_cv_z_score numeric := abs(v_cv - v_session_stats.avg_cv) / v_session_stats.cv_stddev;
                BEGIN
                    IF v_cv_z_score > 2.5 THEN -- 2.5 standard deviations
                        v_anomaly_score := v_anomaly_score + 0.25;
                        v_anomaly_reasons := v_anomaly_reasons || 'session_cv_outlier';
                    END IF;
                END;
            END IF;

            -- If this word's WPM deviates significantly from session average
            IF v_session_stats.wpm_stddev IS NOT NULL AND v_session_stats.wpm_stddev > 0 THEN
                DECLARE
                    v_wpm_z_score numeric := abs(v_wpm - v_session_stats.avg_wpm) / v_session_stats.wpm_stddev;
                BEGIN
                    IF v_wpm_z_score > 3.0 THEN -- 3 standard deviations
                        v_anomaly_score := v_anomaly_score + 0.3;
                        v_anomaly_reasons := v_anomaly_reasons || 'session_wpm_outlier';
                    END IF;
                END;
            END IF;
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

    -- NEW: Auto-flag for shadow ban if highly suspicious
    IF v_is_suspicious AND v_anomaly_score >= 0.8 THEN
        PERFORM flag_for_shadow_ban(p_player_id, 'high_anomaly_score', v_anomaly_score);
    END IF;

    RETURN QUERY SELECT NOT v_is_suspicious, v_anomaly_score, v_anomaly_reasons, v_is_suspicious;
END;
$$;

-- ============================================================
-- GRANT EXECUTE PERMISSIONS
-- ============================================================
GRANT EXECUTE ON FUNCTION public.verify_keystroke_log(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_device_fingerprint(uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_device_fingerprint_anomaly(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.flag_for_shadow_ban(uuid, text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_shadow_ban_queue(int, int, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_shadow_ban(bigint, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_shadow_banned(uuid) TO authenticated;
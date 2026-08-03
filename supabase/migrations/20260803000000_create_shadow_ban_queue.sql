-- Phase 5c: Anti-Cheat Hardening - Shadow Ban Queue
-- Server-side shadow ban management with admin review workflow

-- ============================================================
-- TABLE: Shadow Ban Queue
-- ============================================================
CREATE TABLE IF NOT EXISTS shadow_ban_queue (
    id bigserial PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reason text NOT NULL, -- e.g., 'high_anomaly_score', 'multiple_flags', 'device_mismatch', 'manual_review'
    anomaly_score numeric NOT NULL, -- 0-1 score from statistical analysis
    anomaly_details jsonb, -- Full details: { anomaly_reasons: [], keystroke_log_ids: [], device_fingerprint: {} }
    flagged_at timestamptz DEFAULT now(),
    flagged_by uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- System or admin user
    reviewed_at timestamptz,
    reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    resolution text, -- 'confirmed_cheat', 'false_positive', 'monitoring'
    resolution_notes text,
    -- Player info for display (denormalized for performance)
    player_username text,
    player_avatar_url text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_shadow_ban_queue_user ON shadow_ban_queue (user_id);
CREATE INDEX idx_shadow_ban_queue_reviewed ON shadow_ban_queue (reviewed_at) WHERE reviewed_at IS NULL;
CREATE INDEX idx_shadow_ban_queue_flagged ON shadow_ban_queue (flagged_at DESC);
CREATE INDEX idx_shadow_ban_queue_resolution ON shadow_ban_queue (resolution);

ALTER TABLE shadow_ban_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view shadow ban queue" ON shadow_ban_queue;
CREATE POLICY "Admins can view shadow ban queue" ON shadow_ban_queue
    FOR SELECT USING (
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

DROP POLICY IF EXISTS "System can insert shadow ban entries" ON shadow_ban_queue;
CREATE POLICY "System can insert shadow ban entries" ON shadow_ban_queue
    FOR INSERT WITH CHECK (
        -- Allow inserts from service role or via RPC
        auth.role() = 'service_role' OR true
    );

-- ============================================================
-- FUNCTION: Update updated_at timestamp
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_shadow_ban_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_shadow_ban_updated_at ON shadow_ban_queue;
CREATE TRIGGER trigger_update_shadow_ban_updated_at
    BEFORE UPDATE ON shadow_ban_queue
    FOR EACH ROW
    EXECUTE FUNCTION public.update_shadow_ban_updated_at();

-- ============================================================
-- RPC: Get Shadow Ban Queue (for admin panel)
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
    anomaly_details jsonb,
    flagged_at timestamptz,
    flagged_by uuid,
    reviewed_at timestamptz,
    reviewed_by uuid,
    resolution text,
    resolution_notes text,
    created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Verify admin/moderator access
    IF NOT EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND (tier = 'admin' OR tier = 'moderator')
    ) THEN
        RAISE EXCEPTION 'Insufficient permissions';
    END IF;

    RETURN QUERY
    SELECT
        sbq.id,
        sbq.user_id,
        COALESCE(p.username, sbq.player_username, 'Unknown') as username,
        COALESCE(p.avatar_url, sbq.player_avatar_url) as avatar_url,
        sbq.reason,
        sbq.anomaly_score,
        sbq.anomaly_details,
        sbq.flagged_at,
        sbq.flagged_by,
        sbq.reviewed_at,
        sbq.reviewed_by,
        sbq.resolution,
        sbq.resolution_notes,
        sbq.created_at
    FROM shadow_ban_queue sbq
    LEFT JOIN profiles p ON sbq.user_id = p.id
    WHERE (p_unreviewed_only = false OR sbq.reviewed_at IS NULL)
    ORDER BY sbq.flagged_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- ============================================================
-- RPC: Resolve Shadow Ban Entry (for admin panel)
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
DECLARE
    v_entry shadow_ban_queue;
    v_is_admin boolean;
BEGIN
    -- Verify admin/moderator access
    SELECT EXISTS (
        SELECT 1 FROM profiles WHERE id = p_admin_id AND (tier = 'admin' OR tier = 'moderator')
    ) INTO v_is_admin;

    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Insufficient permissions';
    END IF;

    -- Validate resolution value
    IF p_resolution NOT IN ('confirmed_cheat', 'false_positive', 'monitoring') THEN
        RAISE EXCEPTION 'Invalid resolution: must be confirmed_cheat, false_positive, or monitoring';
    END IF;

    -- Get the queue entry
    SELECT * INTO v_entry
    FROM shadow_ban_queue
    WHERE id = p_queue_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Shadow ban queue entry not found';
    END IF;

    -- Update the entry
    UPDATE shadow_ban_queue
    SET
        reviewed_at = now(),
        reviewed_by = p_admin_id,
        resolution = p_resolution,
        resolution_notes = p_notes
    WHERE id = p_queue_id;

    -- If confirmed cheat or false_positive, we may want to update the player's status
    -- For monitoring, they stay in shadow pool
    IF p_resolution = 'confirmed_cheat' THEN
        -- Could add additional actions here: ban user, reset ratings, etc.
        -- For now, just log it
        RAISE NOTICE 'Confirmed cheat for user %, queue entry %', v_entry.user_id, p_queue_id;
    ELSIF p_resolution = 'false_positive' THEN
        RAISE NOTICE 'False positive for user %, queue entry %', v_entry.user_id, p_queue_id;
    END IF;
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
    anomaly_score numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_latest_entry shadow_ban_queue;
BEGIN
    -- Get the latest unresolved or monitoring entry for this user
    SELECT * INTO v_latest_entry
    FROM shadow_ban_queue
    WHERE user_id = p_user_id
        AND (reviewed_at IS NULL OR resolution = 'monitoring')
    ORDER BY flagged_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, NULL, 0;
    END IF;

    -- If confirmed cheat, they are permanently shadow banned
    -- If monitoring, they are in shadow pool
    -- If false_positive, they are NOT shadow banned
    IF v_latest_entry.resolution = 'false_positive' THEN
        RETURN QUERY SELECT false, NULL, 0;
    ELSE
        RETURN QUERY SELECT true, v_latest_entry.reason, v_latest_entry.anomaly_score;
    END IF;
END;
$$;

-- ============================================================
-- RPC: Auto-flag Suspicious Players (called after keystroke verification)
-- ============================================================
CREATE OR REPLACE FUNCTION public.auto_flag_suspicious_player(
    p_user_id uuid,
    p_room_id uuid,
    p_word text,
    p_anomaly_score numeric,
    p_anomaly_reasons text[],
    p_device_fingerprint jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_reason text;
    v_existing_entry shadow_ban_queue;
    v_player_username text;
    v_player_avatar_url text;
BEGIN
    -- Only flag if anomaly score is high enough
    IF p_anomaly_score < 0.6 THEN
        RETURN;
    END IF;

    -- Determine primary reason
    IF p_anomaly_score >= 0.8 THEN
        v_reason := 'high_anomaly_score';
    ELSIF array_length(p_anomaly_reasons, 1) > 2 THEN
        v_reason := 'multiple_flags';
    ELSE
        v_reason := p_anomaly_reasons[1];
    END IF;

    -- Check if there's already an unreviewed entry for this user
    SELECT * INTO v_existing_entry
    FROM shadow_ban_queue
    WHERE user_id = p_user_id
        AND reviewed_at IS NULL
    ORDER BY flagged_at DESC
    LIMIT 1;

    -- Get player profile info
    SELECT username, avatar_url INTO v_player_username, v_player_avatar_url
    FROM profiles
    WHERE id = p_user_id;

    IF FOUND AND v_existing_entry IS NOT NULL THEN
        -- Update existing entry with new anomaly data
        UPDATE shadow_ban_queue
        SET
            anomaly_score = GREATEST(anomaly_score, p_anomaly_score),
            anomaly_details = jsonb_build_object(
                'anomaly_reasons', p_anomaly_reasons,
                'latest_room_id', p_room_id,
                'latest_word', p_word,
                'device_fingerprint', p_device_fingerprint,
                'all_flagged_at', COALESCE(anomaly_details->'all_flagged_at', '[]'::jsonb) || jsonb_build_array(now())
            ),
            updated_at = now()
        WHERE id = v_existing_entry.id;
    ELSE
        -- Insert new shadow ban queue entry
        INSERT INTO shadow_ban_queue (
            user_id,
            reason,
            anomaly_score,
            anomaly_details,
            flagged_by,
            player_username,
            player_avatar_url
        )
        VALUES (
            p_user_id,
            v_reason,
            p_anomaly_score,
            jsonb_build_object(
                'anomaly_reasons', p_anomaly_reasons,
                'latest_room_id', p_room_id,
                'latest_word', p_word,
                'device_fingerprint', p_device_fingerprint,
                'all_flagged_at', jsonb_build_array(now())
            ),
            NULL, -- flagged_by = system
            v_player_username,
            v_player_avatar_url
        );
    END IF;
END;
$$;

-- ============================================================
-- GRANT EXECUTE PERMISSIONS
-- ============================================================
GRANT EXECUTE ON FUNCTION public.get_shadow_ban_queue(int, int, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_shadow_ban(bigint, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_shadow_banned(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auto_flag_suspicious_player(uuid, uuid, text, numeric, text[], jsonb) TO authenticated;

-- ============================================================
-- SEED: Default reason documentation (for reference)
-- ============================================================
-- Reason codes:
-- 'high_anomaly_score' - Anomaly score >= 0.8 (very suspicious)
-- 'multiple_flags' - Multiple anomaly reasons detected (3+)
-- 'inter_key_intervals_too_uniform' - CV < 0.1
-- 'inter_key_intervals_highly_erratic' - CV > 1.0
-- 'burst_wpm_exceeds_human_limit' - WPM exceeds human limits for word length
-- 'perfectly_uniform_intervals' - All intervals exactly equal (robotic)
-- 'subhuman_keystroke_intervals' - Intervals < 30ms
-- 'impossible_typing_speed' - Chars/ms > 0.1
-- 'device_mismatch' - Fingerprint doesn't match previous sessions
-- 'manual_review' - Flagged by admin/mod manually
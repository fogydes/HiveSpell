-- Phase 5b: Replay System (Scrubbable Timeline Post-Game)
-- Stores complete game replays for post-game review and spectator mode

-- ============================================================
-- TABLE: Game Replays
-- ============================================================
CREATE TABLE IF NOT EXISTS game_replays (
    id bigserial PRIMARY KEY,
    room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    season_id text,
    mode text NOT NULL, -- 'baby', 'easy', 'medium', 'hard', 'genius', 'competitive', 'ranked'
    is_ranked boolean DEFAULT false,
    started_at timestamptz NOT NULL,
    ended_at timestamptz,
    winner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    total_players int NOT NULL,
    game_duration_ms int,
    -- Replay data stored as JSONB
    events jsonb NOT NULL DEFAULT '[]', -- Array of game events with timestamps
    player_stats jsonb NOT NULL DEFAULT '{}', -- Per-player final stats
    created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_game_replays_room ON game_replays (room_id);
CREATE INDEX idx_game_replays_player ON game_replays (winner_id);
CREATE INDEX idx_game_replays_season_mode ON game_replays (season_id, mode);
CREATE INDEX idx_game_replays_started ON game_replays (started_at DESC);

ALTER TABLE game_replays ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view replays" ON game_replays;
CREATE POLICY "Anyone can view replays" ON game_replays
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "System can insert replays" ON game_replays;
CREATE POLICY "System can insert replays" ON game_replays
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Players can view own replay data" ON game_replays;
CREATE POLICY "Players can view own replay data" ON game_replays
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM room_players rp
            WHERE rp.room_id = game_replays.room_id
            AND rp.user_id = auth.uid()
        ) OR winner_id = auth.uid()
    );

-- ============================================================
-- TABLE: Replay Events (Normalized for Querying)
-- ============================================================
CREATE TABLE IF NOT EXISTS replay_events (
    id bigserial PRIMARY KEY,
    replay_id bigint NOT NULL REFERENCES game_replays(id) ON DELETE CASCADE,
    sequence_num int NOT NULL, -- Order of event in replay
    event_type text NOT NULL, -- 'word_spoken', 'word_correct', 'word_incorrect', 'turn_start', 'turn_end', 'player_eliminated', 'game_start', 'game_end'
    player_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    word text,
    wpm int,
    time_taken_ms int,
    streak int,
    timestamp_ms int NOT NULL, -- Relative to replay start (ms)
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_replay_events_replay_seq ON replay_events (replay_id, sequence_num);
CREATE INDEX idx_replay_events_player ON replay_events (player_id);

ALTER TABLE replay_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view replay events" ON replay_events;
CREATE POLICY "Anyone can view replay events" ON replay_events
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "System can insert replay events" ON replay_events;
CREATE POLICY "System can insert replay events" ON replay_events
    FOR INSERT WITH CHECK (true);

-- ============================================================
-- RPC: Create Game Replay (called at game start/end by driver)
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_game_replay(
    p_room_id uuid,
    p_season_id text DEFAULT NULL,
    p_mode text,
    p_is_ranked boolean DEFAULT false,
    p_started_at timestamptz,
    p_ended_at timestamptz DEFAULT NULL,
    p_winner_id uuid DEFAULT NULL,
    p_total_players int,
    p_game_duration_ms int DEFAULT NULL,
    p_events jsonb DEFAULT '[]',
    p_player_stats jsonb DEFAULT '{}'
)
RETURNS TABLE (
    replay_id bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_replay_id bigint;
BEGIN
    INSERT INTO game_replays (
        room_id, season_id, mode, is_ranked,
        started_at, ended_at, winner_id,
        total_players, game_duration_ms,
        events, player_stats
    ) VALUES (
        p_room_id, p_season_id, p_mode, p_is_ranked,
        p_started_at, p_ended_at, p_winner_id,
        p_total_players, p_game_duration_ms,
        p_events, p_player_stats
    ) RETURNING id INTO v_replay_id;

    -- Also insert normalized events for querying
    IF jsonb_typeof(p_events) = 'array' THEN
        INSERT INTO replay_events (replay_id, sequence_num, event_type, player_id, word, wpm, time_taken_ms, streak, timestamp_ms, metadata)
        SELECT
            v_replay_id,
            (elem->>'sequence_num')::int,
            elem->>'event_type',
            NULLIF(elem->>'player_id', '')::uuid,
            elem->>'word',
            (elem->>'wpm')::int,
            (elem->>'time_taken_ms')::int,
            (elem->>'streak')::int,
            (elem->>'timestamp_ms')::int,
            COALESCE(elem->>'metadata', '{}')::jsonb
        FROM jsonb_array_elements(p_events) elem;
    END IF;

    RETURN QUERY SELECT v_replay_id;
END;
$$;

-- ============================================================
-- RPC: Get Game Replay
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_game_replay(
    p_replay_id bigint
)
RETURNS TABLE (
    id bigint,
    room_id uuid,
    season_id text,
    mode text,
    is_ranked boolean,
    started_at timestamptz,
    ended_at timestamptz,
    winner_id uuid,
    total_players int,
    game_duration_ms int,
    events jsonb,
    player_stats jsonb,
    winner_username text,
    winner_avatar_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        gr.id,
        gr.room_id,
        gr.season_id,
        gr.mode,
        gr.is_ranked,
        gr.started_at,
        gr.ended_at,
        gr.winner_id,
        gr.total_players,
        gr.game_duration_ms,
        gr.events,
        gr.player_stats,
        p.username as winner_username,
        p.avatar_url as winner_avatar_url
    FROM game_replays gr
    LEFT JOIN profiles p ON gr.winner_id = p.id
    WHERE gr.id = p_replay_id;
END;
$$;

-- ============================================================
-- RPC: Get Replay by Room ID
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_replay_by_room(
    p_room_id uuid
)
RETURNS TABLE (
    id bigint,
    room_id uuid,
    season_id text,
    mode text,
    is_ranked boolean,
    started_at timestamptz,
    ended_at timestamptz,
    winner_id uuid,
    total_players int,
    game_duration_ms int,
    events jsonb,
    player_stats jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        gr.id,
        gr.room_id,
        gr.season_id,
        gr.mode,
        gr.is_ranked,
        gr.started_at,
        gr.ended_at,
        gr.winner_id,
        gr.total_players,
        gr.game_duration_ms,
        gr.events,
        gr.player_stats
    FROM game_replays gr
    WHERE gr.room_id = p_room_id
    ORDER BY gr.started_at DESC
    LIMIT 1;
END;
$$;

-- ============================================================
-- RPC: Get Player Replay History
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_player_replays(
    p_user_id uuid,
    p_limit int DEFAULT 20,
    p_offset int DEFAULT 0
)
RETURNS TABLE (
    id bigint,
    room_id uuid,
    season_id text,
    mode text,
    is_ranked boolean,
    started_at timestamptz,
    ended_at timestamptz,
    winner_id uuid,
    total_players int,
    game_duration_ms int,
    player_stats jsonb,
    won boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        gr.id,
        gr.room_id,
        gr.season_id,
        gr.mode,
        gr.is_ranked,
        gr.started_at,
        gr.ended_at,
        gr.winner_id,
        gr.total_players,
        gr.game_duration_ms,
        gr.player_stats,
        (gr.winner_id = p_user_id) as won
    FROM game_replays gr
    WHERE gr.winner_id = p_user_id
       OR EXISTS (
           SELECT 1 FROM jsonb_object_keys(gr.player_stats) k WHERE k::uuid = p_user_id
       )
    ORDER BY gr.started_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- ============================================================
-- RPC: Get Replay Events (Timeline)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_replay_timeline(
    p_replay_id bigint
)
RETURNS TABLE (
    sequence_num int,
    event_type text,
    player_id uuid,
    player_username text,
    player_avatar_url text,
    word text,
    wpm int,
    time_taken_ms int,
    streak int,
    timestamp_ms int,
    metadata jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        re.sequence_num,
        re.event_type,
        re.player_id,
        p.username as player_username,
        p.avatar_url as player_avatar_url,
        re.word,
        re.wpm,
        re.time_taken_ms,
        re.streak,
        re.timestamp_ms,
        re.metadata
    FROM replay_events re
    LEFT JOIN profiles p ON re.player_id = p.id
    WHERE re.replay_id = p_replay_id
    ORDER BY re.sequence_num;
END;
$$;

-- ============================================================
-- GRANT EXECUTE PERMISSIONS
-- ============================================================
GRANT EXECUTE ON FUNCTION public.create_game_replay(uuid, text, text, boolean, timestamptz, timestamptz, uuid, int, int, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_game_replay(bigint) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_replay_by_room(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_player_replays(uuid, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_replay_timeline(bigint) TO anon, authenticated;
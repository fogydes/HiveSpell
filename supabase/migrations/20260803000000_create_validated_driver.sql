-- ============================================================
-- Phase 0.5: Validated Driver Pattern
-- Server-authoritative game logic via Supabase RPCs + pg_cron safety-nets
-- ============================================================

-- 1. Word Banks Table (source of truth for word selection)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.word_banks (
    id BIGSERIAL PRIMARY KEY,
    locale TEXT NOT NULL,           -- e.g., 'en', 'es', 'fr', 'ar'
    difficulty TEXT NOT NULL,       -- e.g., 'baby', 'cakewalk', 'learner', 'intermediate', 'heated', 'genius', 'omniscient', 'polymath'
    word TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (locale, difficulty, word)
);

CREATE INDEX idx_word_banks_locale_difficulty ON public.word_banks (locale, difficulty);

-- Enable RLS
ALTER TABLE public.word_banks ENABLE ROW LEVEL SECURITY;

-- RLS: Anyone authenticated can read word banks (for RPCs running as SECURITY DEFINER)
CREATE POLICY "Authenticated users can read word banks"
    ON public.word_banks FOR SELECT
    TO authenticated
    USING (true);

-- No direct INSERT/UPDATE/DELETE by clients - only via admin or migration

-- 2. Helper: Get current user ID from JWT (Firebase UID stored as text)
-- ============================================================
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT auth.jwt() ->> 'sub';
$$;

-- 3. RPC: start_game(room_id, locale, difficulty)
-- Atomic: sets status=playing, picks first word, initializes turnOrder
-- ============================================================
CREATE OR REPLACE FUNCTION public.start_game(
    p_room_id TEXT,  -- rooms.id is TEXT (Firebase push ID), not UUID
    p_locale TEXT,
    p_difficulty TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_room RECORD;
    v_players JSONB;
    v_turn_order TEXT[];
    v_first_player TEXT;
    v_word TEXT;
    v_timer_duration NUMERIC;
    v_start_time BIGINT;
    v_recent_words TEXT[];
    v_game_state JSONB;
    v_player_ids TEXT[];
    v_player_id TEXT;
BEGIN
    -- Fetch room with lock
    SELECT * INTO v_room
    FROM public.rooms
    WHERE id = p_room_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Room not found';
    END IF;

    IF v_room.status != 'waiting' THEN
        RAISE EXCEPTION 'Room not in waiting status';
    END IF;

    -- Verify caller is in room
    IF NOT (v_room.players ? current_user_id()) THEN
        RAISE EXCEPTION 'Player not in room';
    END IF;

    -- Get alive/connected players
    SELECT jsonb_object_agg(id, player) INTO v_players
    FROM jsonb_each(v_room.players) AS pe(id, player)
    WHERE (player->>'status') IN ('alive', 'connected');

    IF jsonb_typeof(v_players) IS NULL OR jsonb_object_keys(v_players) IS NULL OR array_length(jsonb_object_keys(v_players), 1) < 1 THEN
        RAISE EXCEPTION 'No active players';
    END IF;

    -- Build turn order (by joinedAt)
    SELECT array_agg(id ORDER BY (player->>'joinedAt')::BIGINT) INTO v_turn_order
    FROM jsonb_each(v_players) AS pe(id, player)
    WHERE (player->>'status') IN ('alive', 'connected');

    v_first_player := v_turn_order[1];

    -- Pick first word avoiding recent (none at game start)
    SELECT word INTO v_word
    FROM public.word_banks
    WHERE locale = p_locale AND difficulty = p_difficulty
    ORDER BY RANDOM()
    LIMIT 1;

    IF v_word IS NULL THEN
        RAISE EXCEPTION 'No words available for locale % difficulty %', p_locale, p_difficulty;
    END IF;

    v_timer_duration := 2 + LENGTH(v_word) - COALESCE(FLOOR(0 / 10) * 0.3, 0);
    v_timer_duration := GREATEST(2.5, v_timer_duration);
    v_start_time := EXTRACT(EPOCH FROM NOW())::BIGINT * 1000 + 1200; -- TURN_AUDIO_LEAD_MS
    v_recent_words := ARRAY[LOWER(v_word)];

    -- Build game state
    v_game_state := jsonb_build_object(
        'currentWord', v_word,
        'currentWordIndex', 0,
        'startTime', v_start_time,
        'timerDuration', v_timer_duration,
        'currentTurnPlayerId', v_first_player,
        'turnOrder', v_turn_order,
        'currentInput', '',
        'currentPlayerWpm', 0,
        'streak', 0,
        'roundNumber', 1,
        'winnerId', NULL,
        'winnerName', NULL,
        'frozenTimeLeft', NULL,
        'recentWords', v_recent_words
    );

    -- Build player updates - iterate over array of keys
    SELECT array_agg(key) INTO v_player_ids FROM jsonb_object_keys(v_players) AS key;
    FOREACH v_player_id IN ARRAY v_player_ids
    LOOP
        v_room.players := v_room.players || jsonb_build_object(
            v_player_id, v_room.players->v_player_id || jsonb_build_object('status', 'alive', 'score', 0, 'streak', 0)
        );
    END LOOP;

    -- Atomic update
    UPDATE public.rooms
    SET
        status = 'playing',
        game_state = v_game_state,
        settings = settings || jsonb_build_object('difficulty', p_difficulty),
        players = v_room.players,
        updated_at = NOW()
    WHERE id = p_room_id;

    RETURN jsonb_build_object(
        'success', true,
        'gameState', v_game_state,
        'firstPlayer', v_first_player
    );
END;
$$;

-- 4. RPC: pick_word(room_id, locale, difficulty)
-- Atomic: picks word avoiding recent, sets startTime, timerDuration, turnOrder, currentTurnPlayerId
-- ============================================================
CREATE OR REPLACE FUNCTION public.pick_word(
    p_room_id TEXT,  -- rooms.id is TEXT (Firebase push ID), not UUID
    p_locale TEXT,
    p_difficulty TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_room RECORD;
    v_game_state JSONB;
    v_turn_order TEXT[];
    v_current_player TEXT;
    v_recent_words TEXT[];
    v_word TEXT;
    v_timer_duration NUMERIC;
    v_start_time BIGINT;
    v_new_recent_words TEXT[];
BEGIN
    -- Fetch room with lock
    SELECT * INTO v_room
    FROM public.rooms
    WHERE id = p_room_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Room not found';
    END IF;

    IF v_room.status != 'playing' THEN
        RAISE EXCEPTION 'Room not in playing status';
    END IF;

    v_game_state := v_room.game_state;
    v_turn_order := (v_game_state->'turnOrder')::TEXT[];
    v_current_player := (v_game_state->>'currentTurnPlayerId')::TEXT;
    v_recent_words := ARRAY(SELECT jsonb_array_elements_text(v_game_state->'recentWords'));

    -- Pick word avoiding recent
    SELECT word INTO v_word
    FROM public.word_banks
    WHERE locale = p_locale AND difficulty = p_difficulty
        AND LOWER(word) != ALL(v_recent_words)
    ORDER BY RANDOM()
    LIMIT 1;

    -- Fallback: if all words used recently, pick any
    IF v_word IS NULL THEN
        SELECT word INTO v_word
        FROM public.word_banks
        WHERE locale = p_locale AND difficulty = p_difficulty
        ORDER BY RANDOM()
        LIMIT 1;
    END IF;

    IF v_word IS NULL THEN
        RAISE EXCEPTION 'No words available for locale % difficulty %', p_locale, p_difficulty;
    END IF;

    -- Calculate timer duration based on current streak
    v_timer_duration := 2 + LENGTH(v_word) - COALESCE(FLOOR((v_game_state->>'streak')::NUMERIC / 10) * 0.3, 0);
    v_timer_duration := GREATEST(2.5, v_timer_duration);
    v_start_time := EXTRACT(EPOCH FROM NOW())::BIGINT * 1000 + 1200; -- TURN_AUDIO_LEAD_MS

    -- Update recent words
    v_new_recent_words := v_recent_words || LOWER(v_word);
    IF array_length(v_new_recent_words, 1) > 20 THEN
        v_new_recent_words := v_new_recent_words[array_length(v_new_recent_words, 1) - 19 : array_length(v_new_recent_words, 1)];
    END IF;

    -- Update game state
    v_game_state := v_game_state || jsonb_build_object(
        'currentWord', v_word,
        'startTime', v_start_time,
        'timerDuration', v_timer_duration,
        'currentTurnPlayerId', v_current_player,
        'currentInput', '',
        'currentPlayerWpm', 0,
        'recentWords', v_new_recent_words
    );

    UPDATE public.rooms
    SET game_state = v_game_state, updated_at = NOW()
    WHERE id = p_room_id;

    RETURN jsonb_build_object(
        'success', true,
        'word', v_word,
        'timerDuration', v_timer_duration,
        'startTime', v_start_time,
        'currentTurnPlayerId', v_current_player
    );
END;
$$;

-- 5. RPC: advance_turn(room_id, player_id, was_correct, new_streak)
-- Atomic: updates score, clears input, advances to next player or intermission
-- ============================================================
CREATE OR REPLACE FUNCTION public.advance_turn(
    p_room_id TEXT,  -- rooms.id is TEXT (Firebase push ID), not UUID
    p_player_id TEXT,
    p_was_correct BOOLEAN,
    p_new_streak INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_room RECORD;
    v_game_state JSONB;
    v_players JSONB;
    v_turn_order TEXT[];
    v_current_player TEXT;
    v_next_player TEXT;
    v_alive_count INT;
    v_recent_words TEXT[];
    v_word TEXT;
    v_timer_duration NUMERIC;
    v_start_time BIGINT;
    v_new_recent_words TEXT[];
    v_winner_id TEXT;
    v_winner_name TEXT;
    v_round_number INT;
    v_idx INT;
    v_candidate TEXT;
    i INT;
BEGIN
    -- Fetch room with lock
    SELECT * INTO v_room
    FROM public.rooms
    WHERE id = p_room_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Room not found';
    END IF;

    IF v_room.status != 'playing' THEN
        RAISE EXCEPTION 'Room not in playing status';
    END IF;

    v_game_state := v_room.game_state;
    v_players := v_room.players;
    v_turn_order := (v_game_state->'turnOrder')::TEXT[];
    v_current_player := (v_game_state->>'currentTurnPlayerId')::TEXT;
    v_recent_words := ARRAY(SELECT jsonb_array_elements_text(v_game_state->'recentWords'));
    v_round_number := COALESCE((v_game_state->>'roundNumber')::INT, 1);

    -- Verify it's this player's turn
    IF v_current_player != p_player_id THEN
        RAISE EXCEPTION 'Not your turn';
    END IF;

    -- Update player score/streak if correct
    IF p_was_correct THEN
        v_players := v_players || jsonb_build_object(
            p_player_id, v_players->p_player_id || jsonb_build_object('score', (v_players->p_player_id->>'score')::INT + 1, 'streak', p_new_streak)
        );
    ELSE
        v_players := v_players || jsonb_build_object(
            p_player_id, v_players->p_player_id || jsonb_build_object('streak', p_new_streak)
        );
    END IF;

    -- Clear current input
    v_game_state := v_game_state || jsonb_build_object('currentInput', '');

    -- Find next active player
    v_next_player := NULL;
    FOR i IN 1..array_length(v_turn_order, 1)
    LOOP
        v_idx := array_position(v_turn_order, v_current_player);
        v_idx := ((v_idx + i - 1) % array_length(v_turn_order, 1)) + 1;
        v_candidate := v_turn_order[v_idx];

        IF (v_players->v_candidate->>'status') IN ('alive', 'connected') THEN
            v_next_player := v_candidate;
            EXIT;
        END IF;
    END LOOP;

    -- Count alive players
    SELECT COUNT(*) INTO v_alive_count
    FROM jsonb_each(v_players) AS pe(id, player)
    WHERE (player->>'status') IN ('alive', 'connected');

    -- Check if intermission needed
    IF v_next_player IS NULL OR v_alive_count <= 1 THEN
        -- Trigger intermission
        v_winner_id := NULL;
        v_winner_name := NULL;

        IF v_alive_count = 1 THEN
            DECLARE v_id TEXT;
            BEGIN
                FOR v_id IN SELECT * FROM jsonb_object_keys(v_players)
                LOOP
                    IF (v_players->v_id->>'status') IN ('alive', 'connected') THEN
                        v_winner_id := v_id;
                        v_winner_name := v_players->v_id->>'name';
                        EXIT;
                    END IF;
                END LOOP;
            END;
        END IF;

        v_game_state := v_game_state || jsonb_build_object(
            'currentWord', NULL,
            'currentTurnPlayerId', NULL,
            'startTime', NULL,
            'timerDuration', NULL,
            'winnerId', v_winner_id,
            'winnerName', v_winner_name
        );

        UPDATE public.rooms
        SET
            status = 'intermission',
            intermission_ends_at = EXTRACT(EPOCH FROM NOW())::BIGINT * 1000 + 10000, -- INTERMISSION_DURATION_MS
            game_state = v_game_state,
            players = v_players,
            updated_at = NOW()
        WHERE id = p_room_id;

        RETURN jsonb_build_object(
            'success', true,
            'status', 'intermission',
            'winnerId', v_winner_id,
            'winnerName', v_winner_name,
            'intermissionEndsAt', EXTRACT(EPOCH FROM NOW())::BIGINT * 1000 + 10000
        );
    END IF;

    -- Pick next word
    SELECT word INTO v_word
    FROM public.word_banks
    WHERE locale = (v_room.settings->>'difficulty')::TEXT -- stored in settings
        AND difficulty = (v_room.settings->>'difficulty')::TEXT
        AND LOWER(word) != ALL(v_recent_words)
    ORDER BY RANDOM()
    LIMIT 1;

    IF v_word IS NULL THEN
        SELECT word INTO v_word
        FROM public.word_banks
        WHERE locale = (v_room.settings->>'difficulty')::TEXT
            AND difficulty = (v_room.settings->>'difficulty')::TEXT
        ORDER BY RANDOM()
        LIMIT 1;
    END IF;

    v_timer_duration := 2 + LENGTH(v_word) - COALESCE(FLOOR(p_new_streak / 10) * 0.3, 0);
    v_timer_duration := GREATEST(2.5, v_timer_duration);
    v_start_time := EXTRACT(EPOCH FROM NOW())::BIGINT * 1000 + 1200;

    v_new_recent_words := v_recent_words || LOWER(v_word);
    IF array_length(v_new_recent_words, 1) > 20 THEN
        v_new_recent_words := v_new_recent_words[array_length(v_new_recent_words, 1) - 19 : array_length(v_new_recent_words, 1)];
    END IF;

    v_game_state := v_game_state || jsonb_build_object(
        'currentWord', v_word,
        'currentTurnPlayerId', v_next_player,
        'startTime', v_start_time,
        'timerDuration', v_timer_duration,
        'currentInput', '',
        'currentPlayerWpm', 0,
        'streak', p_new_streak,
        'recentWords', v_new_recent_words
    );

    UPDATE public.rooms
    SET
        game_state = v_game_state,
        players = v_players,
        updated_at = NOW()
    WHERE id = p_room_id;

    RETURN jsonb_build_object(
        'success', true,
        'status', 'playing',
        'word', v_word,
        'timerDuration', v_timer_duration,
        'startTime', v_start_time,
        'nextPlayerId', v_next_player,
        'streak', p_new_streak
    );
END;
$$;

-- 6. RPC: eliminate_player(room_id, player_id, reason)
-- Atomic: marks eliminated, advances turn or triggers intermission
-- ============================================================
CREATE OR REPLACE FUNCTION public.eliminate_player(
    p_room_id TEXT,  -- rooms.id is TEXT (Firebase push ID), not UUID
    p_player_id TEXT,
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_room RECORD;
    v_game_state JSONB;
    v_players JSONB;
    v_turn_order TEXT[];
    v_current_player TEXT;
    v_next_player TEXT;
    v_alive_count INT;
    v_recent_words TEXT[];
    v_word TEXT;
    v_timer_duration NUMERIC;
    v_start_time BIGINT;
    v_new_recent_words TEXT[];
    v_winner_id TEXT;
    v_winner_name TEXT;
    v_streak INT;
    v_idx INT;
    v_candidate TEXT;
    i INT;
BEGIN
    SELECT * INTO v_room FROM public.rooms WHERE id = p_room_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Room not found'; END IF;
    IF v_room.status != 'playing' THEN RAISE EXCEPTION 'Room not in playing status'; END IF;

    v_game_state := v_room.game_state;
    v_players := v_room.players;
    v_turn_order := (v_game_state->'turnOrder')::TEXT[];
    v_current_player := (v_game_state->>'currentTurnPlayerId')::TEXT;
    v_recent_words := ARRAY(SELECT jsonb_array_elements_text(v_game_state->'recentWords'));
    v_streak := COALESCE((v_game_state->>'streak')::INT, 0);

    -- Mark player eliminated
    IF v_players ? p_player_id THEN
        v_players := v_players || jsonb_build_object(
            p_player_id, v_players->p_player_id || jsonb_build_object('status', 'eliminated')
        );
    END IF;

    -- Count alive after elimination
    SELECT COUNT(*) INTO v_alive_count
    FROM jsonb_each(v_players) AS pe(id, player)
    WHERE (player->>'status') IN ('alive', 'connected');

    -- If eliminated player was current turn, find next
    IF v_current_player = p_player_id THEN
        -- Find next active
        FOR i IN 1..array_length(v_turn_order, 1)
        LOOP
            v_idx := array_position(v_turn_order, v_current_player);
            v_idx := ((v_idx + i - 1) % array_length(v_turn_order, 1)) + 1;
            v_candidate := v_turn_order[v_idx];
            IF (v_players->v_candidate->>'status') IN ('alive', 'connected') THEN
                v_next_player := v_candidate; EXIT;
            END IF;
        END LOOP;
    ELSE
        v_next_player := v_current_player;
    END IF;

    -- Check intermission
    IF v_next_player IS NULL OR v_alive_count <= 1 THEN
        v_winner_id := NULL; v_winner_name := NULL;
        IF v_alive_count = 1 THEN
            DECLARE v_id TEXT;
            BEGIN
                FOR v_id IN SELECT * FROM jsonb_object_keys(v_players)
                LOOP
                    IF (v_players->v_id->>'status') IN ('alive', 'connected') THEN
                        v_winner_id := v_id; v_winner_name := v_players->v_id->>'name'; EXIT;
                    END IF;
                END LOOP;
            END;
        END IF;

        v_game_state := v_game_state || jsonb_build_object(
            'currentWord', NULL, 'currentTurnPlayerId', NULL,
            'startTime', NULL, 'timerDuration', NULL,
            'winnerId', v_winner_id, 'winnerName', v_winner_name
        );

        UPDATE public.rooms SET status = 'intermission',
            intermission_ends_at = EXTRACT(EPOCH FROM NOW())::BIGINT * 1000 + 10000,
            game_state = v_game_state, players = v_players, updated_at = NOW()
        WHERE id = p_room_id;

        RETURN jsonb_build_object('success', true, 'status', 'intermission', 'winnerId', v_winner_id, 'winnerName', v_winner_name);
    END IF;

    -- Pick next word
    SELECT word INTO v_word FROM public.word_banks
        WHERE locale = (v_room.settings->>'difficulty')::TEXT AND difficulty = (v_room.settings->>'difficulty')::TEXT
            AND LOWER(word) != ALL(v_recent_words) ORDER BY RANDOM() LIMIT 1;
    IF v_word IS NULL THEN
        SELECT word INTO v_word FROM public.word_banks
            WHERE locale = (v_room.settings->>'difficulty')::TEXT AND difficulty = (v_room.settings->>'difficulty')::TEXT
            ORDER BY RANDOM() LIMIT 1;
    END IF;

    v_timer_duration := 2 + LENGTH(v_word) - COALESCE(FLOOR(v_streak / 10) * 0.3, 0);
    v_timer_duration := GREATEST(2.5, v_timer_duration);
    v_start_time := EXTRACT(EPOCH FROM NOW())::BIGINT * 1000 + 1200;
    v_new_recent_words := v_recent_words || LOWER(v_word);
    IF array_length(v_new_recent_words, 1) > 20 THEN
        v_new_recent_words := v_new_recent_words[array_length(v_new_recent_words, 1) - 19 : array_length(v_new_recent_words, 1)];
    END IF;

    v_game_state := v_game_state || jsonb_build_object(
        'currentWord', v_word, 'currentTurnPlayerId', v_next_player,
        'startTime', v_start_time, 'timerDuration', v_timer_duration,
        'currentInput', '', 'currentPlayerWpm', 0,
        'recentWords', v_new_recent_words
    );

    UPDATE public.rooms SET game_state = v_game_state, players = v_players, updated_at = NOW() WHERE id = p_room_id;

    RETURN jsonb_build_object('success', true, 'status', 'playing', 'word', v_word, 'timerDuration', v_timer_duration, 'startTime', v_start_time, 'nextPlayerId', v_next_player);
END;
$$;

-- 7. RPC: restart_round(room_id)
-- Atomic: resets all alive players, clears gameState, sets status=playing
-- ============================================================
CREATE OR REPLACE FUNCTION public.restart_round(p_room_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_room RECORD;
    v_game_state JSONB;
    v_players JSONB;
    v_turn_order TEXT[];
    v_first_player TEXT;
    v_word TEXT;
    v_timer_duration NUMERIC;
    v_start_time BIGINT;
    v_recent_words TEXT[];
    v_player_ids TEXT[];
    v_player_id TEXT;
BEGIN
    SELECT * INTO v_room FROM public.rooms WHERE id = p_room_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Room not found'; END IF;
    IF v_room.status != 'intermission' THEN RAISE EXCEPTION 'Room not in intermission'; END IF;

    v_players := v_room.players;
    v_game_state := v_room.game_state;

    -- Reset alive players - iterate over array of keys
    SELECT array_agg(key) INTO v_player_ids FROM jsonb_object_keys(v_players) AS key;
    FOREACH v_player_id IN ARRAY v_player_ids
    LOOP
        IF (v_players->v_player_id->>'status') IN ('eliminated', 'alive', 'connected') THEN
            v_players := v_players || jsonb_build_object(
                v_player_id, v_players->v_player_id || jsonb_build_object('status', 'alive', 'score', 0, 'streak', 0)
            );
        END IF;
    END LOOP;

    -- Build turn order
    SELECT array_agg(id ORDER BY (player->>'joinedAt')::BIGINT) INTO v_turn_order
    FROM jsonb_each(v_players) AS pe(id, player)
    WHERE (player->>'status') IN ('alive', 'connected');

    v_first_player := v_turn_order[1];

    -- Pick first word
    SELECT word INTO v_word FROM public.word_banks
        WHERE locale = (v_room.settings->>'difficulty')::TEXT AND difficulty = (v_room.settings->>'difficulty')::TEXT
        ORDER BY RANDOM() LIMIT 1;
    IF v_word IS NULL THEN RAISE EXCEPTION 'No words available'; END IF;

    v_timer_duration := 2 + LENGTH(v_word);
    v_timer_duration := GREATEST(2.5, v_timer_duration);
    v_start_time := EXTRACT(EPOCH FROM NOW())::BIGINT * 1000 + 1200;
    v_recent_words := ARRAY[LOWER(v_word)];

    v_game_state := jsonb_build_object(
        'currentWord', v_word, 'currentWordIndex', 0,
        'startTime', v_start_time, 'timerDuration', v_timer_duration,
        'currentTurnPlayerId', v_first_player, 'turnOrder', v_turn_order,
        'currentInput', '', 'currentPlayerWpm', 0,
        'streak', 0, 'roundNumber', COALESCE((v_game_state->>'roundNumber')::INT, 1) + 1,
        'winnerId', NULL, 'winnerName', NULL,
        'frozenTimeLeft', NULL, 'recentWords', v_recent_words
    );

    UPDATE public.rooms SET
        status = 'playing', intermission_ends_at = NULL,
        game_state = v_game_state, players = v_players, updated_at = NOW()
    WHERE id = p_room_id;

    RETURN jsonb_build_object('success', true, 'gameState', v_game_state, 'firstPlayer', v_first_player);
END;
$$;

-- 8. RLS: Lock game_state writes to RPC-only
-- ============================================================
-- The "Deny direct game_state writes" policy lives in
-- 20260803000001_create_rooms_table.sql, which creates public.rooms.
-- This migration (…_create_validated_driver) applies BEFORE the rooms
-- table exists (lexicographically 000000 < 000001), so a CREATE POLICY
-- ON public.rooms here would fail with "relation does not exist".
-- The RPCs above are SECURITY DEFINER and bypass RLS regardless.

-- 9. pg_cron Safety-Net Jobs
-- ============================================================
-- Enable pg_cron extension if not already
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Timer Watchdog: every 30 seconds
-- Eliminates players whose timer expired but driver missed
SELECT cron.schedule(
    'timer-watchdog-30s',
    '*/30 * * * *',
    $$
    SELECT public.check_expired_timers();
    $$
);

-- Intermission Watchdog: every 60 seconds
-- Restarts rounds stuck in intermission
SELECT cron.schedule(
    'intermission-watchdog-60s',
    '*/1 * * * *',
    $$
    SELECT public.check_stalled_intermissions();
    $$
);

-- Orphaned Room Cleanup: every 5 minutes
SELECT cron.schedule(
    'orphaned-room-cleanup-5m',
    '*/5 * * * *',
    $$
    SELECT public.cleanup_abandoned_rooms();
    $$
);

-- 10. Watchdog Helper Functions
-- ============================================================

-- check_expired_timers()
CREATE OR REPLACE FUNCTION public.check_expired_timers()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_room RECORD;
    v_eliminated_count INT := 0;
BEGIN
    FOR v_room IN
        SELECT id, game_state, players
        FROM public.rooms
        WHERE status = 'playing'
            AND game_state IS NOT NULL
            AND game_state->>'startTime' IS NOT NULL
            AND game_state->>'timerDuration' IS NOT NULL
            AND game_state->>'currentTurnPlayerId' IS NOT NULL
    LOOP
        DECLARE
            v_start_time BIGINT := (v_room.game_state->>'startTime')::BIGINT;
            v_timer_duration NUMERIC := (v_room.game_state->>'timerDuration')::NUMERIC;
            v_current_player TEXT := (v_room.game_state->>'currentTurnPlayerId')::TEXT;
            v_elapsed NUMERIC;
        BEGIN
            v_elapsed := (EXTRACT(EPOCH FROM NOW())::BIGINT * 1000 - v_start_time) / 1000;

            IF v_elapsed > v_timer_duration THEN
                -- Timer expired, eliminate current player
                PERFORM public.eliminate_player(v_room.id, v_current_player, 'timer_expired_watchdog');
                v_eliminated_count := v_eliminated_count + 1;
            END IF;
        END;
    END LOOP;

    RETURN v_eliminated_count;
END;
$$;

-- check_stalled_intermissions()
CREATE OR REPLACE FUNCTION public.check_stalled_intermissions()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_room RECORD;
    v_restarted_count INT := 0;
BEGIN
    FOR v_room IN
        SELECT id, intermission_ends_at
        FROM public.rooms
        WHERE status = 'intermission'
            AND intermission_ends_at IS NOT NULL
            AND intermission_ends_at < EXTRACT(EPOCH FROM NOW())::BIGINT * 1000
    LOOP
        PERFORM public.restart_round(v_room.id);
        v_restarted_count := v_restarted_count + 1;
    END LOOP;

    RETURN v_restarted_count;
END;
$$;

-- cleanup_abandoned_rooms()
CREATE OR REPLACE FUNCTION public.cleanup_abandoned_rooms()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_room RECORD;
    v_cleaned INT := 0;
    v_threshold BIGINT := EXTRACT(EPOCH FROM NOW())::BIGINT * 1000 - 30 * 60 * 1000; -- 30 minutes
BEGIN
    FOR v_room IN
        SELECT id FROM public.rooms
        WHERE status IN ('waiting', 'playing', 'intermission')
            AND updated_at < v_threshold
    LOOP
        UPDATE public.rooms SET status = 'finished', updated_at = NOW() WHERE id = v_room.id;
        v_cleaned := v_cleaned + 1;
    END LOOP;

    RETURN v_cleaned;
END;
$$;

-- 11. Seed initial word banks (run once)
-- ============================================================
-- English Baby difficulty (sample)
INSERT INTO public.word_banks (locale, difficulty, word) VALUES
    ('en', 'baby', 'cat'), ('en', 'baby', 'dog'), ('en', 'baby', 'sun'),
    ('en', 'baby', 'hat'), ('en', 'baby', 'pen'), ('en', 'baby', 'cup'),
    ('en', 'baby', 'bed'), ('en', 'baby', 'box'), ('en', 'baby', 'car'),
    ('en', 'baby', 'red'), ('en', 'baby', 'blue'), ('en', 'baby', 'green'),
    ('en', 'baby', 'run'), ('en', 'baby', 'jump'), ('en', 'baby', 'play')
ON CONFLICT (locale, difficulty, word) DO NOTHING;

-- English Cakewalk
INSERT INTO public.word_banks (locale, difficulty, word) VALUES
    ('en', 'cakewalk', 'apple'), ('en', 'cakewalk', 'bread'), ('en', 'cakewalk', 'chair'),
    ('en', 'cakewalk', 'dance'), ('en', 'cakewalk', 'eagle'), ('en', 'cakewalk', 'flame'),
    ('en', 'cakewalk', 'grape'), ('en', 'cakewalk', 'house'), ('en', 'cakewalk', 'juice'),
    ('en', 'cakewalk', 'knife'), ('en', 'cakewalk', 'lemon'), ('en', 'cakewalk', 'music')
ON CONFLICT (locale, difficulty, word) DO NOTHING;

-- Add more locales/difficulties as needed via separate migration
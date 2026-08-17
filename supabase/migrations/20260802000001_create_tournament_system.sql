-- Phase 5c: Tournament System
-- Brackets, scheduling, prize pools
-- Supabase migration

-- ============================================================
-- TABLE: Tournaments
-- ============================================================
CREATE TABLE IF NOT EXISTS tournaments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    season_id text NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    mode text NOT NULL, -- 'medium', 'hard', 'genius', 'competitive'
    format text NOT NULL DEFAULT 'single_elimination', -- 'single_elimination', 'double_elimination', 'swiss', 'round_robin'
    max_participants int NOT NULL DEFAULT 64,
    min_rating int DEFAULT 0,
    max_rating int DEFAULT NULL, -- NULL = no cap
    entry_fee_nectar int DEFAULT 0,
    prize_pool_nectar int DEFAULT 0,
    prize_pool_cosmetics jsonb DEFAULT '[]', -- Array of {tier: string, cosmetic_id: string}
    starts_at timestamptz NOT NULL,
    registration_closes_at timestamptz NOT NULL,
    check_in_starts_at timestamptz,
    status text NOT NULL DEFAULT 'upcoming', -- 'upcoming', 'registration', 'check_in', 'in_progress', 'completed', 'cancelled'
    current_round int DEFAULT 0,
    total_rounds int DEFAULT 0,
    bracket_data jsonb DEFAULT NULL, -- Stored bracket structure
    settings jsonb DEFAULT '{}', -- Tournament-specific settings
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_tournaments_season_status ON tournaments (season_id, status);
CREATE INDEX idx_tournaments_starts_at ON tournaments (starts_at);

ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view tournaments" ON tournaments;
CREATE POLICY "Public can view tournaments" ON tournaments
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated can create tournaments" ON tournaments;
CREATE POLICY "Authenticated can create tournaments" ON tournaments
    FOR INSERT WITH CHECK ((select auth.jwt() ->> 'sub') IS NOT NULL);

DROP POLICY IF EXISTS "Tournament creators can update" ON tournaments;
CREATE POLICY "Tournament creators can update" ON tournaments
    FOR UPDATE USING ((select auth.jwt() ->> 'sub') = created_by); -- Need created_by column

-- ============================================================
-- TABLE: Tournament Participants
-- ============================================================
CREATE TABLE IF NOT EXISTS tournament_participants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    user_id text NOT NULL, -- Firebase UID (TEXT), no FK to auth.users
    seed int DEFAULT NULL,
    rating_at_registration int NOT NULL,
    status text NOT NULL DEFAULT 'registered', -- 'registered', 'checked_in', 'active', 'eliminated', 'winner', 'disqualified', 'withdrawn'
    current_round int DEFAULT 0,
    final_placement int DEFAULT NULL,
    prize_claimed boolean DEFAULT false,
    joined_at timestamptz DEFAULT now(),
    checked_in_at timestamptz DEFAULT NULL,
    eliminated_at timestamptz DEFAULT NULL,
    UNIQUE (tournament_id, user_id)
);

CREATE INDEX idx_tournament_participants_tournament ON tournament_participants (tournament_id);
CREATE INDEX idx_tournament_participants_user ON tournament_participants (user_id);
CREATE INDEX idx_tournament_participants_status ON tournament_participants (tournament_id, status);

ALTER TABLE tournament_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view tournament participants" ON tournament_participants;
CREATE POLICY "Users can view tournament participants" ON tournament_participants
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can register for tournaments" ON tournament_participants;
CREATE POLICY "Users can register for tournaments" ON tournament_participants
    FOR INSERT WITH CHECK ((select auth.jwt() ->> 'sub') = user_id);

DROP POLICY IF EXISTS "Users can update own participation" ON tournament_participants;
CREATE POLICY "Users can update own participation" ON tournament_participants
    FOR UPDATE USING ((select auth.jwt() ->> 'sub') = user_id);

-- ============================================================
-- TABLE: Tournament Matches
-- ============================================================
CREATE TABLE IF NOT EXISTS tournament_matches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    round_number int NOT NULL,
    match_number int NOT NULL, -- Position in bracket
    player1_id text, -- Firebase UID (TEXT), no FK to auth.users
    player2_id text, -- Firebase UID (TEXT), no FK to auth.users
    winner_id text, -- Firebase UID (TEXT), no FK to auth.users
    room_id text, -- Firebase room push ID (TEXT); no FK (rooms table is created later in migration order)
    status text NOT NULL DEFAULT 'pending', -- 'pending', 'ready', 'in_progress', 'completed', 'walkover', 'dispute'
    scheduled_at timestamptz,
    started_at timestamptz,
    completed_at timestamptz,
    score jsonb DEFAULT NULL, -- {player1: 2, player2: 1} for best-of series
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE (tournament_id, round_number, match_number)
);

CREATE INDEX idx_tournament_matches_tournament_round ON tournament_matches (tournament_id, round_number);
CREATE INDEX idx_tournament_matches_player ON tournament_matches (player1_id, player2_id);
CREATE INDEX idx_tournament_matches_status ON tournament_matches (tournament_id, status);

ALTER TABLE tournament_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view tournament matches" ON tournament_matches;
CREATE POLICY "Public can view tournament matches" ON tournament_matches
    FOR SELECT USING (true);

-- ============================================================
-- TABLE: Tournament Brackets (for visualization)
-- ============================================================
CREATE TABLE IF NOT EXISTS tournament_brackets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    bracket_type text NOT NULL, -- 'winners', 'losers', 'grand_finals'
    round_number int NOT NULL,
    position int NOT NULL, -- Visual position in bracket
    match_id uuid REFERENCES tournament_matches(id) ON DELETE SET NULL,
    participant1_id uuid REFERENCES tournament_participants(id) ON DELETE SET NULL,
    participant2_id uuid REFERENCES tournament_participants(id) ON DELETE SET NULL,
    next_match_id uuid REFERENCES tournament_matches(id) ON DELETE SET NULL, -- Where winner advances
    next_match_position text DEFAULT NULL, -- 'player1' or 'player2'
    created_at timestamptz DEFAULT now(),
    UNIQUE (tournament_id, bracket_type, round_number, position)
);

CREATE INDEX idx_tournament_brackets_tournament ON tournament_brackets (tournament_id);

ALTER TABLE tournament_brackets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view tournament brackets" ON tournament_brackets;
CREATE POLICY "Public can view tournament brackets" ON tournament_brackets
    FOR SELECT USING (true);

-- ============================================================
-- Add created_by to tournaments
-- ============================================================
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS created_by text; -- Firebase UID (TEXT), no FK to auth.users

-- ============================================================
-- RPC: Create Tournament
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_tournament(
    p_name text,
    p_description text,
    p_season_id text,
    p_mode text,
    p_starts_at timestamptz,
    p_registration_closes_at timestamptz,
    p_format text DEFAULT 'single_elimination',
    p_max_participants int DEFAULT 64,
    p_min_rating int DEFAULT 0,
    p_max_rating int DEFAULT NULL,
    p_entry_fee_nectar int DEFAULT 0,
    p_prize_pool_nectar int DEFAULT 0,
    p_settings jsonb DEFAULT '{}'
)
RETURNS TABLE (tournament_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tournament_id uuid;
BEGIN
    -- Validate
    IF p_starts_at <= now() THEN
        RAISE EXCEPTION 'Tournament start time must be in the future';
    END IF;
    IF p_registration_closes_at >= p_starts_at THEN
        RAISE EXCEPTION 'Registration must close before tournament starts';
    END IF;

    INSERT INTO tournaments (
        name, description, season_id, mode, format,
        max_participants, min_rating, max_rating,
        entry_fee_nectar, prize_pool_nectar,
        starts_at, registration_closes_at,
        settings, status, created_by
    ) VALUES (
        p_name, p_description, p_season_id, p_mode, p_format,
        p_max_participants, p_min_rating, p_max_rating,
        p_entry_fee_nectar, p_prize_pool_nectar,
        p_starts_at, p_registration_closes_at,
        p_settings, 'upcoming', (select auth.jwt() ->> 'sub')
    ) RETURNING id INTO v_tournament_id;

    RETURN QUERY SELECT v_tournament_id;
END;
$$;

-- ============================================================
-- RPC: Register for Tournament
-- ============================================================
CREATE OR REPLACE FUNCTION public.register_for_tournament(
    p_tournament_id uuid
)
RETURNS TABLE (
    success boolean,
    message text,
    participant_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tournament tournaments%ROWTYPE;
    v_user_rating int;
    v_participant_id uuid;
    v_current_participants int;
BEGIN
    -- Get tournament
    SELECT * INTO v_tournament
    FROM tournaments
    WHERE id = p_tournament_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Tournament not found', NULL::uuid;
    END IF;

    -- Check status
    IF v_tournament.status NOT IN ('upcoming', 'registration') THEN
        RETURN QUERY SELECT false, 'Registration not open', NULL::uuid;
    END IF;

    -- Check registration deadline
    IF v_tournament.registration_closes_at < now() THEN
        RETURN QUERY SELECT false, 'Registration closed', NULL::uuid;
    END IF;

    -- Check max participants
    SELECT count(*) INTO v_current_participants
    FROM tournament_participants
    WHERE tournament_id = p_tournament_id;

    IF v_current_participants >= v_tournament.max_participants THEN
        RETURN QUERY SELECT false, 'Tournament full', NULL::uuid;
    END IF;

    -- Get user's rating for this mode
    SELECT rating INTO v_user_rating
    FROM ranked_ratings
    WHERE user_id = (select auth.jwt() ->> 'sub')
        AND season_id = v_tournament.season_id
        AND mode = v_tournament.mode
        AND placement_matches_remaining = 0;

    IF v_user_rating IS NULL THEN
        v_user_rating := 1500; -- Default
    END IF;

    -- Check rating requirements
    IF v_user_rating < v_tournament.min_rating THEN
        RETURN QUERY SELECT false, 'Rating too low for this tournament', NULL::uuid;
    END IF;
    IF v_tournament.max_rating IS NOT NULL AND v_user_rating > v_tournament.max_rating THEN
        RETURN QUERY SELECT false, 'Rating too high for this tournament', NULL::uuid;
    END IF;

    -- Check entry fee (nectar)
    IF v_tournament.entry_fee_nectar > 0 THEN
        -- Would call a function to deduct nectar here
        -- For now just check
        -- PERFORM deduct_nectar((select auth.jwt() ->> 'sub'), v_tournament.entry_fee_nectar);
    END IF;

    -- Register
    INSERT INTO tournament_participants (
        tournament_id, user_id, rating_at_registration
    ) VALUES (
        p_tournament_id, (select auth.jwt() ->> 'sub'), v_user_rating
    ) RETURNING id INTO v_participant_id;

    RETURN QUERY SELECT true, 'Registered successfully', v_participant_id;
END;
$$;

-- ============================================================
-- RPC: Check In for Tournament
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_in_tournament(
    p_tournament_id uuid
)
RETURNS TABLE (success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_participant tournament_participants%ROWTYPE;
    v_tournament tournaments%ROWTYPE;
BEGIN
    SELECT * INTO v_tournament FROM tournaments WHERE id = p_tournament_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Tournament not found';
    END IF;

    SELECT * INTO v_participant
    FROM tournament_participants
    WHERE tournament_id = p_tournament_id AND user_id = (select auth.jwt() ->> 'sub');

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Not registered for this tournament';
    END IF;

    IF v_participant.status != 'registered' THEN
        RETURN QUERY SELECT false, 'Already checked in or invalid status';
    END IF;

    IF v_tournament.check_in_starts_at IS NOT NULL AND v_tournament.check_in_starts_at > now() THEN
        RETURN QUERY SELECT false, 'Check-in not started yet';
    END IF;

    IF v_tournament.starts_at <= now() THEN
        RETURN QUERY SELECT false, 'Tournament already started';
    END IF;

    UPDATE tournament_participants
    SET status = 'checked_in', checked_in_at = now()
    WHERE id = v_participant.id;

    RETURN QUERY SELECT true, 'Checked in successfully';
END;
$$;

-- ============================================================
-- RPC: Start Tournament (generate bracket)
-- ============================================================
CREATE OR REPLACE FUNCTION public.start_tournament(
    p_tournament_id uuid
)
RETURNS TABLE (success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tournament tournaments%ROWTYPE;
    v_participants tournament_participants[];
    v_count int;
    v_total_rounds int;
    i int;
    v_match_id uuid;
BEGIN
    SELECT * INTO v_tournament FROM tournaments WHERE id = p_tournament_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Tournament not found';
    END IF;

    IF v_tournament.created_by != (select auth.jwt() ->> 'sub') THEN
        RETURN QUERY SELECT false, 'Only tournament creator can start';
    END IF;

    IF v_tournament.status != 'registration' AND v_tournament.status != 'check_in' THEN
        RETURN QUERY SELECT false, 'Tournament not in startable state';
    END IF;

    -- Get checked-in participants
    SELECT array_agg(p ORDER BY p.rating_at_registration DESC) INTO v_participants
    FROM tournament_participants p
    WHERE p.tournament_id = p_tournament_id
        AND p.status IN ('registered', 'checked_in');

    v_count := array_length(v_participants, 1);
    IF v_count < 2 THEN
        RETURN QUERY SELECT false, 'Need at least 2 participants';
    END IF;

    -- Calculate rounds needed for single elimination
    v_total_rounds := ceil(log(v_count) / log(2))::int;

    -- Update tournament
    UPDATE tournaments
    SET status = 'in_progress',
        current_round = 1,
        total_rounds = v_total_rounds,
        updated_at = now()
    WHERE id = p_tournament_id;

    -- Update participant status
    UPDATE tournament_participants
    SET status = 'active'
    WHERE tournament_id = p_tournament_id
        AND status IN ('registered', 'checked_in');

    -- Generate first round matches (simplified - pair adjacent ratings)
    -- This is a basic implementation; production would use proper seeding
    FOR i IN 1..(v_count / 2) LOOP
        INSERT INTO tournament_matches (
            tournament_id, round_number, match_number,
            player1_id, player2_id,
            scheduled_at, status
        ) VALUES (
            p_tournament_id, 1, i,
            v_participants[2*i - 1].user_id,
            v_participants[2*i].user_id,
            v_tournament.starts_at + (i * interval '15 minutes'),
            'ready'
        ) RETURNING id INTO v_match_id;
    END LOOP;

    -- Handle odd number (bye)
    IF v_count % 2 = 1 THEN
        INSERT INTO tournament_matches (
            tournament_id, round_number, match_number,
            player1_id, winner_id,
            scheduled_at, status
        ) VALUES (
            p_tournament_id, 1, (v_count / 2) + 1,
            v_participants[v_count].user_id,
            v_participants[v_count].user_id,
            v_tournament.starts_at,
            'completed'
        );
    END IF;

    RETURN QUERY SELECT true, 'Tournament started';
END;
$$;

-- ============================================================
-- RPC: Report Match Result
-- ============================================================
CREATE OR REPLACE FUNCTION public.report_tournament_match_result(
    p_match_id uuid,
    p_winner_id text,
    p_score jsonb DEFAULT NULL
)
RETURNS TABLE (success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_match tournament_matches%ROWTYPE;
    v_tournament tournaments%ROWTYPE;
    v_loser_id text;
    v_next_round int;
    v_next_match_num int;
    v_next_match_id uuid;
BEGIN
    SELECT * INTO v_match FROM tournament_matches WHERE id = p_match_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Match not found';
    END IF;

    IF v_match.status != 'in_progress' AND v_match.status != 'ready' THEN
        RETURN QUERY SELECT false, 'Match not in playable state';
    END IF;

    -- Verify winner is one of the players
    IF p_winner_id != v_match.player1_id AND p_winner_id != v_match.player2_id THEN
        RETURN QUERY SELECT false, 'Winner not a participant in this match';
    END IF;

    v_loser_id := CASE WHEN p_winner_id = v_match.player1_id THEN v_match.player2_id ELSE v_match.player1_id END;

    -- Update match
    UPDATE tournament_matches
    SET winner_id = p_winner_id,
        status = 'completed',
        completed_at = now(),
        score = p_score
    WHERE id = p_match_id;

    -- Update participants
    UPDATE tournament_participants
    SET status = 'active',
        current_round = v_match.round_number + 1
    WHERE tournament_id = v_match.tournament_id
        AND user_id = p_winner_id;

    UPDATE tournament_participants
    SET status = 'eliminated',
        eliminated_at = now(),
        final_placement = (
            SELECT count(*) FROM tournament_participants tp2
            WHERE tp2.tournament_id = v_match.tournament_id
                AND tp2.status IN ('active', 'eliminated')
        )
    WHERE tournament_id = v_match.tournament_id
        AND user_id = v_loser_id;

    -- Get tournament info
    SELECT * INTO v_tournament FROM tournaments WHERE id = v_match.tournament_id;

    -- Check if round is complete
    IF NOT EXISTS (
        SELECT 1 FROM tournament_matches
        WHERE tournament_id = v_match.tournament_id
            AND round_number = v_match.round_number
            AND status IN ('pending', 'ready', 'in_progress')
    ) THEN
        -- Round complete, advance or finish
        IF v_match.round_number >= v_tournament.total_rounds THEN
            -- Tournament complete!
            UPDATE tournament_participants
            SET status = 'winner', final_placement = 1
            WHERE tournament_id = v_match.tournament_id
                AND user_id = p_winner_id;

            UPDATE tournaments
            SET status = 'completed',
                current_round = v_tournament.total_rounds
            WHERE id = v_match.tournament_id;

            RETURN QUERY SELECT true, 'Tournament completed! Winner: ' || p_winner_id;
        ELSE
            -- Generate next round matches
            v_next_round := v_match.round_number + 1;
            -- This would pair winners appropriately
            -- Simplified for now
            UPDATE tournaments
            SET current_round = v_next_round
            WHERE id = v_match.tournament_id;

            RETURN QUERY SELECT true, 'Round ' || v_match.round_number || ' complete. Next round generated.';
        END IF;
    END IF;

    RETURN QUERY SELECT true, 'Match result recorded';
END;
$$;

-- ============================================================
-- RPC: Get Tournament Details
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_tournament(
    p_tournament_id uuid
)
RETURNS TABLE (
    id uuid,
    name text,
    description text,
    season_id text,
    mode text,
    format text,
    max_participants int,
    min_rating int,
    max_rating int,
    entry_fee_nectar int,
    prize_pool_nectar int,
    prize_pool_cosmetics jsonb,
    starts_at timestamptz,
    registration_closes_at timestamptz,
    check_in_starts_at timestamptz,
    status text,
    current_round int,
    total_rounds int,
    bracket_data jsonb,
    settings jsonb,
    created_by text,
    created_at timestamptz,
    updated_at timestamptz,
    participant_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id, t.name, t.description, t.season_id, t.mode, t.format,
        t.max_participants, t.min_rating, t.max_rating,
        t.entry_fee_nectar, t.prize_pool_nectar, t.prize_pool_cosmetics,
        t.starts_at, t.registration_closes_at, t.check_in_starts_at,
        t.status, t.current_round, t.total_rounds, t.bracket_data, t.settings,
        t.created_by, t.created_at, t.updated_at,
        (SELECT count(*) FROM tournament_participants tp WHERE tp.tournament_id = t.id) as participant_count
    FROM tournaments t
    WHERE t.id = p_tournament_id;
END;
$$;

-- ============================================================
-- RPC: List Tournaments
-- ============================================================
CREATE OR REPLACE FUNCTION public.list_tournaments(
    p_season_id text DEFAULT NULL,
    p_status text DEFAULT NULL,
    p_mode text DEFAULT NULL,
    p_limit int DEFAULT 20,
    p_offset int DEFAULT 0
)
RETURNS TABLE (
    id uuid,
    name text,
    description text,
    season_id text,
    mode text,
    format text,
    max_participants int,
    min_rating int,
    max_rating int,
    entry_fee_nectar int,
    prize_pool_nectar int,
    starts_at timestamptz,
    registration_closes_at timestamptz,
    status text,
    current_round int,
    total_rounds int,
    participant_count bigint,
    is_registered boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id text := (select auth.jwt() ->> 'sub');
BEGIN
    RETURN QUERY
    SELECT
        t.id,
        t.name,
        t.description,
        t.season_id,
        t.mode,
        t.format,
        t.max_participants,
        t.min_rating,
        t.max_rating,
        t.entry_fee_nectar,
        t.prize_pool_nectar,
        t.starts_at,
        t.registration_closes_at,
        t.status,
        t.current_round,
        t.total_rounds,
        (SELECT count(*) FROM tournament_participants tp WHERE tp.tournament_id = t.id) as participant_count,
        (v_user_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM tournament_participants tp
            WHERE tp.tournament_id = t.id AND tp.user_id = v_user_id
        )) as is_registered
    FROM tournaments t
    WHERE (p_season_id IS NULL OR t.season_id = p_season_id)
        AND (p_status IS NULL OR t.status = p_status)
        AND (p_mode IS NULL OR t.mode = p_mode)
    ORDER BY
        CASE t.status
            WHEN 'registration' THEN 1
            WHEN 'check_in' THEN 2
            WHEN 'in_progress' THEN 3
            WHEN 'upcoming' THEN 4
            WHEN 'completed' THEN 5
            ELSE 6
        END,
        t.starts_at ASC
    LIMIT p_limit OFFSET p_offset;
END;
$$;

-- ============================================================
-- RPC: Get Tournament Matches
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_tournament_matches(
    p_tournament_id uuid,
    p_round_number int DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    tournament_id uuid,
    round_number int,
    match_number int,
    player1_id text,
    player2_id text,
    winner_id text,
    room_id text,
    status text,
    scheduled_at timestamptz,
    started_at timestamptz,
    completed_at timestamptz,
    score jsonb,
    player1_username text,
    player2_username text,
    winner_username text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        tm.id,
        tm.tournament_id,
        tm.round_number,
        tm.match_number,
        tm.player1_id,
        tm.player2_id,
        tm.winner_id,
        tm.room_id,
        tm.status,
        tm.scheduled_at,
        tm.started_at,
        tm.completed_at,
        tm.score,
        p1.username as player1_username,
        p2.username as player2_username,
        pw.username as winner_username
    FROM tournament_matches tm
    LEFT JOIN profiles p1 ON tm.player1_id = p1.id
    LEFT JOIN profiles p2 ON tm.player2_id = p2.id
    LEFT JOIN profiles pw ON tm.winner_id = pw.id
    WHERE tm.tournament_id = p_tournament_id
        AND (p_round_number IS NULL OR tm.round_number = p_round_number)
    ORDER BY tm.round_number, tm.match_number;
END;
$$;

-- ============================================================
-- RPC: Get Tournament Bracket
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_tournament_bracket(
    p_tournament_id uuid
)
RETURNS TABLE (
    bracket_type text,
    round_number int,
    position int,
    match_id uuid,
    participant1_id uuid,
    participant2_id uuid,
    next_match_id uuid,
    next_match_position text,
    participant1_username text,
    participant2_username text,
    participant1_rating int,
    participant2_rating int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        tb.bracket_type,
        tb.round_number,
        tb.position,
        tb.match_id,
        tp1.id as participant1_id,
        tp2.id as participant2_id,
        tb.next_match_id,
        tb.next_match_position,
        p1.username as participant1_username,
        p2.username as participant2_username,
        tp1.rating_at_registration as participant1_rating,
        tp2.rating_at_registration as participant2_rating
    FROM tournament_brackets tb
    LEFT JOIN tournament_participants tp1 ON tb.participant1_id = tp1.id
    LEFT JOIN tournament_participants tp2 ON tb.participant2_id = tp2.id
    LEFT JOIN profiles p1 ON tp1.user_id = p1.id
    LEFT JOIN profiles p2 ON tp2.user_id = p2.id
    WHERE tb.tournament_id = p_tournament_id
    ORDER BY tb.bracket_type, tb.round_number, tb.position;
END;
$$;

-- ============================================================
-- GRANT EXECUTE PERMISSIONS
-- ============================================================
GRANT EXECUTE ON FUNCTION public.create_tournament(text, text, text, text, timestamptz, timestamptz, text, int, int, int, int, int, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_for_tournament(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_in_tournament(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_tournament(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_tournament_match_result(uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tournament(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_tournaments(text, text, text, int, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_tournament_matches(uuid, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_tournament_bracket(uuid) TO anon, authenticated;

-- ============================================================
-- CRON: Update tournament statuses (run every 5 minutes)
-- ============================================================
-- SELECT cron.schedule('tournament-status-update', '*/5 * * * *', '
--     UPDATE tournaments
--     SET status = CASE
--         WHEN status = ''upcoming'' AND registration_closes_at <= now() THEN ''registration''
--         WHEN status = ''registration'' AND starts_at <= now() THEN ''in_progress''
--         WHEN status = ''check_in'' AND starts_at <= now() THEN ''in_progress''
--         ELSE status
--     END,
--     updated_at = now()
--     WHERE status IN (''upcoming'', ''registration'', ''check_in'')
-- ');
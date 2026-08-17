-- ============================================================
-- Create Supabase rooms table (mirrors Firebase structure)
-- Stores game state for Validated Driver RPCs
-- Uses TEXT id to match Firebase Realtime DB push IDs
-- ============================================================

CREATE TABLE IF NOT EXISTS public.rooms (
    id TEXT PRIMARY KEY,              -- Firebase room push ID (e.g., "-Nxyz123")
    host_id TEXT NOT NULL,            -- Firebase UID of host
    type TEXT NOT NULL,               -- 'public' | 'private'
    status TEXT NOT NULL DEFAULT 'waiting',  -- 'waiting' | 'playing' | 'intermission' | 'finished'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    code TEXT,                        -- Optional for private rooms
    settings JSONB NOT NULL DEFAULT '{}',  -- {difficulty, maxPlayers}
    players JSONB NOT NULL DEFAULT '{}',   -- JSON object of players by Firebase UID
    game_state JSONB,                 -- Current game state
    intermission_ends_at BIGINT,      -- Milliseconds epoch when intermission ends
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rooms_status ON public.rooms (status);
CREATE INDEX idx_rooms_host_id ON public.rooms (host_id);
CREATE INDEX idx_rooms_updated_at ON public.rooms (updated_at DESC);

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- RLS: Players can read rooms they're in
CREATE POLICY "Players can read rooms they are in"
    ON public.rooms FOR SELECT
    TO authenticated
    USING (players ? auth.jwt() ->> 'sub');

-- Players cannot write to rooms directly; all game-state mutations go through
-- SECURITY DEFINER RPCs (start_game, advance_turn, eliminate_player, …) which
-- bypass RLS. Direct client UPDATEs are denied. (Declared here — not in the
-- validated_driver migration — because that migration applies before this
-- table exists, so a CREATE POLICY ON public.rooms there would fail.)
CREATE POLICY "Deny direct game_state writes"
    ON public.rooms FOR UPDATE
    TO authenticated
    USING (false)
    WITH CHECK (false);

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

-- Grant execute on current_user_id
GRANT EXECUTE ON FUNCTION public.current_user_id() TO authenticated, anon;
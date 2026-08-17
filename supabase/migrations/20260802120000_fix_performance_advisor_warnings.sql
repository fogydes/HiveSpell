-- Phase 6b: Performance Optimization - Fix Supabase Performance Advisor Warnings
-- 1. Fix auth_rls_initplan for battle_pass_progress table (3 policies)
-- 2. Drop unused indexes (8 indexes)
-- 3. Add missing index for unindexed foreign key (player_challenges_challenge_id_fkey)

-- ============================================================================
-- 1. Fix auth_rls_initplan warnings for battle_pass_progress
-- ============================================================================

-- The current policies use: current_setting('request.headers', true)::json->>'x-firebase-uid'
-- Firebase UIDs are non-UUID TEXT, so we compare against (select auth.jwt()->>'sub').
-- NOTE: do NOT use auth.uid() here -- it casts the JWT sub to uuid and throws 22P02 for Firebase UIDs.

DROP POLICY IF EXISTS "Users can view own battle pass progress" ON public.battle_pass_progress;
CREATE POLICY "Users can view own battle pass progress"
  ON public.battle_pass_progress FOR SELECT
  USING (user_id = (select auth.jwt()->>'sub'));

DROP POLICY IF EXISTS "Users can create own battle pass progress" ON public.battle_pass_progress;
CREATE POLICY "Users can create own battle pass progress"
  ON public.battle_pass_progress FOR INSERT
  WITH CHECK (user_id = (select auth.jwt()->>'sub'));

DROP POLICY IF EXISTS "Users can update own battle pass progress" ON public.battle_pass_progress;
CREATE POLICY "Users can update own battle pass progress"
  ON public.battle_pass_progress FOR UPDATE
  USING (user_id = (select auth.jwt()->>'sub'));

-- ============================================================================
-- 2. Drop unused indexes (INFO level warnings)
-- ============================================================================

-- These indexes are not being used by any queries
DROP INDEX IF EXISTS idx_messages_receiver;
DROP INDEX IF EXISTS idx_messages_conversation;
DROP INDEX IF EXISTS idx_battle_pass_progress_user_season;
DROP INDEX IF EXISTS idx_friendships_requester;
DROP INDEX IF EXISTS idx_friendships_addressee;
DROP INDEX IF EXISTS idx_player_challenges_user_season;
DROP INDEX IF EXISTS idx_player_challenges_completed;

-- ============================================================================
-- 3. Add missing index for unindexed foreign key
-- ============================================================================

-- player_challenges.challenge_id references challenge_definitions.id
-- This foreign key needs an index for efficient JOINs and cascading deletes
CREATE INDEX IF NOT EXISTS idx_player_challenges_challenge_id
  ON public.player_challenges(challenge_id);

-- ============================================================================
-- 4. Also fix any remaining tables with current_setting pattern if they exist
-- Check profiles - already fixed in 20260316000000_security_and_performance.sql
-- Check friendships - already fixed in 20260316000000_security_and_performance.sql
-- Check notifications - already fixed in 20260316000000_security_and_performance.sql
-- Check messages - already fixed in 20260316000000_security_and_performance.sql
-- Check daily_stats - uses (select auth.jwt()->>'sub') = user_id (Firebase TEXT UID)
-- Check mode_stats - uses (select auth.jwt()->>'sub') = user_id (Firebase TEXT UID)
-- Check player_challenges - uses (select auth.jwt()->>'sub') = user_id (Firebase TEXT UID)
-- Check challenge_definitions - no RLS needed (public read)
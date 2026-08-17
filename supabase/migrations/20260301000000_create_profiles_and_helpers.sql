-- Foundational schema: public.profiles table + shared trigger helper.
--
-- WHY THIS MIGRATION EXISTS
-- The profiles table, the handle_updated_at() trigger helper, and several base
-- profiles columns were originally hand-created in the Supabase dashboard and were
-- never captured in a migration. Every other migration assumes they already exist:
--   * The earliest migration (20260301161255_create_friendships_table) and many
--     others FK to public.profiles(id).
--   * The leaderboard materialized views (20260802...) SELECT base stat columns
--     (games_played, games_won, total_correct_words, max_streak, current_streak)
--     and are validated at CREATE time -> a clean `supabase db reset` fails without
--     them.
--   * Triggers in 20260801130000 and 20260805000000 EXECUTE FUNCTION
--     public.handle_updated_at(), which is validated at CREATE TRIGGER time.
--
-- This migration is timestamped 20260301000000 so it sorts BEFORE 20260301161255,
-- guaranteeing profiles (and the helper) exist before anything references them.
-- It creates ONLY the base objects. Columns added by later migrations
-- (title, equipped_theme/cursor/badge, presence_status/current_room_id/
-- current_activity/last_seen, updated_at) are intentionally NOT created here so
-- those migrations remain the single source for them.

-- 1. Shared updated_at trigger helper. Empty search_path is safe: now() and
--    timezone() live in pg_catalog, which is always implicitly in scope. This
--    also satisfies the function_search_path_mutable security advisor.
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- 2. Base profiles table. id is TEXT (Firebase Auth UIDs are not UUIDs) and is the
--    primary key so downstream FK references to public.profiles(id) are valid.
create table if not exists public.profiles (
  id                  text primary key,
  username            text,
  current_nectar      integer not null default 0,
  lifetime_nectar     integer not null default 0,
  inventory           jsonb   not null default '[]'::jsonb,
  corrects            integer not null default 0,
  wins                integer not null default 0,
  avatar_url          text,
  avatar_seed         text,
  tier                text default 'Bronze',
  games_played        integer not null default 0,
  games_won           integer not null default 0,
  total_correct_words integer not null default 0,
  max_streak          integer not null default 0,
  current_streak      integer not null default 0,
  created_at          timestamptz not null default timezone('utc', now())
);

-- 3. Enable RLS to match live behavior. The own-row INSERT/UPDATE policies are
--    (re)created by 20260316000005 / 20260316000006; without RLS enabled those
--    policies would not be enforced, so any authenticated user could write any
--    profile. Reads are intentionally public: leaderboards (Header), user search
--    (FriendsPanel), friend/message services, and ProfileModal all read other
--    users' rows. Profiles hold no sensitive data (no email/auth material).
alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by everyone" on public.profiles;
create policy "Profiles are viewable by everyone" on public.profiles
  for select using (true);

-- Account linking: map a Discord identity onto an existing HiveSpell profile.
--
-- Discord is a plain OAuth2 provider, so it cannot be attached to a Firebase
-- account as a native linked credential. Instead the `discord-auth` Edge
-- Function records the link here, and resolves it on every subsequent Discord
-- sign-in so the user lands in their existing account rather than a separate
-- `discord:<id>` shadow account.

alter table public.profiles
  add column if not exists discord_id text;

-- One Discord identity may back at most one profile. Partial index so the vast
-- majority of rows (discord_id is null) are not indexed at all.
create unique index if not exists profiles_discord_id_key
  on public.profiles (discord_id)
  where discord_id is not null;

comment on column public.profiles.discord_id is
  'Discord user id linked to this profile. Set only by the discord-auth Edge Function (service_role); clients may only clear it to unlink.';

-- The own-row UPDATE policy from 20260316000005_final_native_auth_rls.sql is
-- column-blind (USING only, no WITH CHECK), so without this guard any client
-- could claim someone else's discord_id and hijack their future sign-ins.
-- Clients keep the ability to *clear* the column (unlink is safe: you can only
-- ever touch your own row), while setting it requires service_role.
create or replace function public.guard_profiles_discord_id()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.discord_id is distinct from old.discord_id
     and new.discord_id is not null
     and current_role <> 'service_role'
  then
    raise exception 'discord_id may only be set by the auth service';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_discord_id on public.profiles;
create trigger profiles_guard_discord_id
  before update on public.profiles
  for each row
  execute function public.guard_profiles_discord_id();

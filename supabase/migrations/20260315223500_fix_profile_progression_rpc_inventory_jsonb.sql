create or replace function public.award_profile_win(
  p_user_id text,
  p_username text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile profiles%rowtype;
begin
  insert into public.profiles (
    id,
    username,
    current_nectar,
    lifetime_nectar,
    inventory,
    equipped_theme,
    equipped_cursor,
    equipped_badge,
    corrects,
    wins,
    title
  )
  values (
    p_user_id,
    coalesce(p_username, 'Player'),
    0,
    0,
    '[]'::jsonb,
    'hive',
    null,
    null,
    0,
    1,
    public.calculate_profile_title(0, 1)
  )
  on conflict (id) do update
  set
    username = coalesce(profiles.username, excluded.username),
    wins = coalesce(profiles.wins, 0) + 1,
    title = public.calculate_profile_title(
      coalesce(profiles.corrects, 0),
      coalesce(profiles.wins, 0) + 1
    )
  returning * into v_profile;

  return jsonb_build_object(
    'id', v_profile.id,
    'corrects', v_profile.corrects,
    'wins', v_profile.wins,
    'title', v_profile.title
  );
end;
$$;

create or replace function public.apply_correct_answer_reward(
  p_user_id text,
  p_username text default null,
  p_nectar_to_add integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile profiles%rowtype;
begin
  insert into public.profiles (
    id,
    username,
    current_nectar,
    lifetime_nectar,
    inventory,
    equipped_theme,
    equipped_cursor,
    equipped_badge,
    corrects,
    wins,
    title
  )
  values (
    p_user_id,
    coalesce(p_username, 'Player'),
    greatest(p_nectar_to_add, 0),
    greatest(p_nectar_to_add, 0),
    '[]'::jsonb,
    'hive',
    null,
    null,
    1,
    0,
    public.calculate_profile_title(1, 0)
  )
  on conflict (id) do update
  set
    username = coalesce(profiles.username, excluded.username),
    corrects = coalesce(profiles.corrects, 0) + 1,
    current_nectar = coalesce(profiles.current_nectar, 0) + greatest(p_nectar_to_add, 0),
    lifetime_nectar = coalesce(profiles.lifetime_nectar, 0) + greatest(p_nectar_to_add, 0),
    title = public.calculate_profile_title(
      coalesce(profiles.corrects, 0) + 1,
      coalesce(profiles.wins, 0)
    )
  returning * into v_profile;

  return jsonb_build_object(
    'id', v_profile.id,
    'corrects', v_profile.corrects,
    'wins', v_profile.wins,
    'title', v_profile.title,
    'current_nectar', v_profile.current_nectar,
    'lifetime_nectar', v_profile.lifetime_nectar
  );
end;
$$;

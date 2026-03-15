create or replace function public.calculate_profile_title(
  p_corrects bigint,
  p_wins bigint
)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when p_corrects >= 50000 then 'Queen Bee'
    when p_corrects >= 10000 then 'Hive Master'
    when p_wins >= 1000 then 'Hive Champion'
    when p_corrects >= 1000 and p_wins >= 100 then 'Busy Bee'
    else 'Newbee'
  end;
$$;

drop policy if exists "Users can create notifications" on public.notifications;

create policy "Users can create notifications"
  on public.notifications for insert
  with check (
    user_id is not null
    and type in ('friend_request', 'friend_accepted', 'system')
    and (
      type = 'system'
      or (
        coalesce(data->>'from_user_id', '') <> ''
        and coalesce(data->>'from_username', '') <> ''
      )
    )
  );

alter table public.profiles
add column if not exists equipped_theme text;

alter table public.profiles
add column if not exists equipped_cursor text;

alter table public.profiles
add column if not exists equipped_badge text;

update public.profiles
set equipped_theme = 'hive'
where equipped_theme is null;

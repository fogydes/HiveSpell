-- 1. DROP EXISTING RPCS WITH OLD SIGNATURES
DROP FUNCTION IF EXISTS public.award_profile_win(text, text);
DROP FUNCTION IF EXISTS public.apply_correct_answer_reward(text, text, integer);
DROP FUNCTION IF EXISTS public.purchase_item(text, text, integer, text);

-- 2. RECREATE RPCS SECURELY USING auth.uid()
create or replace function public.award_profile_win(
  p_username text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile profiles%rowtype;
  v_user_id text;
begin
  v_user_id := auth.uid()::text;
  if v_user_id is null then
    return jsonb_build_object('error', 'Unauthorized');
  end if;

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
    v_user_id,
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
  v_user_id text;
begin
  v_user_id := auth.uid()::text;
  if v_user_id is null then
    return jsonb_build_object('error', 'Unauthorized');
  end if;

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
    v_user_id,
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

CREATE OR REPLACE FUNCTION public.purchase_item(item_id text, cost integer, category text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current_nectar INT;
  v_current_inventory JSONB;
  v_user_id text;
BEGIN
  v_user_id := auth.uid()::text;
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Unauthorized');
  END IF;

  -- Validate user exists
  SELECT current_nectar, inventory INTO v_current_nectar, v_current_inventory
  FROM public.profiles
  WHERE id = v_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'User not found');
  END IF;

  -- Check funds
  IF v_current_nectar < cost THEN
    RETURN jsonb_build_object('success', false, 'message', 'Insufficient Nectar');
  END IF;

  -- Check if already owned
  IF v_current_inventory @> jsonb_build_array(item_id) THEN
     RETURN jsonb_build_object('success', false, 'message', 'Item already owned');
  END IF;

  -- Execute Transaction
  UPDATE public.profiles
  SET 
    current_nectar = current_nectar - cost,
    inventory = inventory || jsonb_build_array(item_id)
  WHERE id = v_user_id;

  RETURN jsonb_build_object('success', true, 'message', 'Purchase successful', 'new_balance', v_current_nectar - cost);
END;
$function$;

-- Revoke anon access from new functions
REVOKE EXECUTE ON FUNCTION public.award_profile_win(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.apply_correct_answer_reward(text, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.purchase_item(text, integer, text) FROM anon;

-- Grant authenticated access
GRANT EXECUTE ON FUNCTION public.award_profile_win(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_correct_answer_reward(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_item(text, integer, text) TO authenticated;

-- 3. FIX RLS POLICIES FOR ALL TABLES (Remove backdoor and use InitPlan)
-- Profiles
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT
WITH CHECK (id = (select auth.uid()::text));

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE
USING (id = (select auth.uid()::text));

-- Friendships
DROP POLICY IF EXISTS "Users can view own friendships" ON public.friendships;
CREATE POLICY "Users can view own friendships" ON public.friendships FOR SELECT
USING (requester_id = (select auth.uid()::text) OR addressee_id = (select auth.uid()::text));

DROP POLICY IF EXISTS "Users can send friend requests" ON public.friendships;
CREATE POLICY "Users can send friend requests" ON public.friendships FOR INSERT
WITH CHECK (requester_id = (select auth.uid()::text));

DROP POLICY IF EXISTS "Addressee can respond to requests" ON public.friendships;
CREATE POLICY "Addressee can respond to requests" ON public.friendships FOR UPDATE
USING (addressee_id = (select auth.uid()::text));

DROP POLICY IF EXISTS "Users can remove friendships" ON public.friendships;
CREATE POLICY "Users can remove friendships" ON public.friendships FOR DELETE
USING (requester_id = (select auth.uid()::text) OR addressee_id = (select auth.uid()::text));

-- Notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT
USING (user_id = (select auth.uid()::text));

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE
USING (user_id = (select auth.uid()::text));

DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE
USING (user_id = (select auth.uid()::text));

-- Messages
DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
CREATE POLICY "Users can view own messages" ON public.messages FOR SELECT
USING (sender_id = (select auth.uid()::text) OR receiver_id = (select auth.uid()::text));

DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT
WITH CHECK (sender_id = (select auth.uid()::text));

DROP POLICY IF EXISTS "Receiver can update messages" ON public.messages;
CREATE POLICY "Receiver can update messages" ON public.messages FOR UPDATE
USING (receiver_id = (select auth.uid()::text));

-- 4. STORAGE BUCKET FIXES
-- Avatars bucket
DROP POLICY IF EXISTS "Avatar Public Access" ON storage.objects;
CREATE POLICY "Avatar Public Access" ON storage.objects FOR SELECT
USING (bucket_id = 'avatars'); -- Note: Since we want anyone to view, we just leave it for SELECT. Wait, Supabase linter says broad SELECT allows listing.
-- To allow fetching but not listing, we should restrict it. However, Supabase doesn't easily differentiate listing vs getting without using `auth.uid()` or similar. Wait, the advisor said: "Public bucket `avatars` has 1 broad SELECT policy on `storage.objects` (Avatar Public Access), allowing clients to list all files. Public buckets don't need this for object URL access and it may expose more data than intended."
-- Ah! Public buckets DO NOT NEED a SELECT policy for object URL access! So we can just drop the policies entirely if they are public buckets.
DROP POLICY IF EXISTS "Avatar Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;

-- If users need to be able to upload, we should have INSERT policies. But we are just dropping the overly broad SELECT policies.

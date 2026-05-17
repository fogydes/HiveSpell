-- 1. DROP RECENTLY CREATED RPCS WITHOUT PARAMS
DROP FUNCTION IF EXISTS public.award_profile_win(text);
DROP FUNCTION IF EXISTS public.apply_correct_answer_reward(text, integer);
DROP FUNCTION IF EXISTS public.purchase_item(item_id text, cost integer, category text);

-- 2. RECREATE RPCS WITH ORIGINAL SIGNATURES BUT SECURE VALIDATION
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
  v_firebase_uid text;
begin
  v_firebase_uid := current_setting('request.headers', true)::json->>'x-firebase-uid';
  if v_firebase_uid is null or v_firebase_uid != p_user_id then
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
  v_firebase_uid text;
begin
  v_firebase_uid := current_setting('request.headers', true)::json->>'x-firebase-uid';
  if v_firebase_uid is null or v_firebase_uid != p_user_id then
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

CREATE OR REPLACE FUNCTION public.purchase_item(p_user_id text, item_id text, cost integer, category text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current_nectar INT;
  v_current_inventory JSONB;
  v_firebase_uid text;
BEGIN
  v_firebase_uid := current_setting('request.headers', true)::json->>'x-firebase-uid';
  if v_firebase_uid is null or v_firebase_uid != p_user_id then
    RETURN jsonb_build_object('success', false, 'message', 'Unauthorized');
  end if;

  -- Validate user exists
  SELECT current_nectar, inventory INTO v_current_nectar, v_current_inventory
  FROM public.profiles
  WHERE id = p_user_id;

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
  WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true, 'message', 'Purchase successful', 'new_balance', v_current_nectar - cost);
END;
$function$;

-- Revoke anon access from new functions
REVOKE EXECUTE ON FUNCTION public.award_profile_win(text, text) FROM public;
REVOKE EXECUTE ON FUNCTION public.award_profile_win(text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.apply_correct_answer_reward(text, text, integer) FROM public;
REVOKE EXECUTE ON FUNCTION public.apply_correct_answer_reward(text, text, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.purchase_item(text, text, integer, text) FROM public;
REVOKE EXECUTE ON FUNCTION public.purchase_item(text, text, integer, text) FROM anon;

-- Grant authenticated access
GRANT EXECUTE ON FUNCTION public.award_profile_win(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_correct_answer_reward(text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_item(text, text, integer, text) TO authenticated;

-- 3. FIX RLS POLICIES FOR ALL TABLES (Use x-firebase-uid and InitPlan)
-- Profiles
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT
WITH CHECK (id = (select current_setting('request.headers', true)::json->>'x-firebase-uid'));

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE
USING (id = (select current_setting('request.headers', true)::json->>'x-firebase-uid'));

-- Friendships
DROP POLICY IF EXISTS "Users can view own friendships" ON public.friendships;
CREATE POLICY "Users can view own friendships" ON public.friendships FOR SELECT
USING (requester_id = (select current_setting('request.headers', true)::json->>'x-firebase-uid') OR addressee_id = (select current_setting('request.headers', true)::json->>'x-firebase-uid'));

DROP POLICY IF EXISTS "Users can send friend requests" ON public.friendships;
CREATE POLICY "Users can send friend requests" ON public.friendships FOR INSERT
WITH CHECK (requester_id = (select current_setting('request.headers', true)::json->>'x-firebase-uid'));

DROP POLICY IF EXISTS "Addressee can respond to requests" ON public.friendships;
CREATE POLICY "Addressee can respond to requests" ON public.friendships FOR UPDATE
USING (addressee_id = (select current_setting('request.headers', true)::json->>'x-firebase-uid'));

DROP POLICY IF EXISTS "Users can remove friendships" ON public.friendships;
CREATE POLICY "Users can remove friendships" ON public.friendships FOR DELETE
USING (requester_id = (select current_setting('request.headers', true)::json->>'x-firebase-uid') OR addressee_id = (select current_setting('request.headers', true)::json->>'x-firebase-uid'));

-- Notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT
USING (user_id = (select current_setting('request.headers', true)::json->>'x-firebase-uid'));

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE
USING (user_id = (select current_setting('request.headers', true)::json->>'x-firebase-uid'));

DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE
USING (user_id = (select current_setting('request.headers', true)::json->>'x-firebase-uid'));

-- Messages
DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
CREATE POLICY "Users can view own messages" ON public.messages FOR SELECT
USING (sender_id = (select current_setting('request.headers', true)::json->>'x-firebase-uid') OR receiver_id = (select current_setting('request.headers', true)::json->>'x-firebase-uid'));

DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT
WITH CHECK (sender_id = (select current_setting('request.headers', true)::json->>'x-firebase-uid'));

DROP POLICY IF EXISTS "Receiver can update messages" ON public.messages;
CREATE POLICY "Receiver can update messages" ON public.messages FOR UPDATE
USING (receiver_id = (select current_setting('request.headers', true)::json->>'x-firebase-uid'));

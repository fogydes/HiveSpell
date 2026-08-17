-- Fix Supabase RPC search_path security issue
-- MISTAKES_AND_LESSONS #48: Using `SET search_path = public` in SECURITY DEFINER functions
-- is a migration-time bomb. It exposes the functions to search path injection attacks.
-- The fix: use empty search path (`SET search_path = ''`) since all internal
-- references are already fully schema-qualified (public.profiles, public.calculate_profile_title).

-- Fix award_profile_win (signature: p_user_id text, p_username text)
ALTER FUNCTION public.award_profile_win(text, text) SET search_path = '';

-- Fix apply_correct_answer_reward (signature: p_user_id text, p_username text, p_nectar_to_add integer)
ALTER FUNCTION public.apply_correct_answer_reward(text, text, integer) SET search_path = '';

-- Fix purchase_item (signature: p_user_id text, item_id text, cost integer, category text)
ALTER FUNCTION public.purchase_item(text, text, integer, text) SET search_path = '';

-- Fix calculate_profile_title (no search_path issue but good to be explicit)
ALTER FUNCTION public.calculate_profile_title(bigint, bigint) SET search_path = '';
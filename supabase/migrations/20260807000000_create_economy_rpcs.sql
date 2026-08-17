-- Economy RPCs consumed by hooks/useBattlePass.ts applyReward().
--
-- These two functions are called by the battle-pass reward flow but were never
-- defined in a migration (they were expected to exist on the live DB). Without
-- them a clean `supabase db reset` produces a schema where every nectar/cosmetic
-- battle-pass reward call fails with PGRST202 (function not found).
--
-- Signatures MUST match the client's named arguments exactly, because PostgREST
-- resolves overloads by argument name:
--   increment_nectar  -> { p_user_id, p_amount, p_lifetime }
--   add_to_inventory  -> { p_user_id, p_item_id, p_item_type }
--
-- Security pattern mirrors the existing identity RPCs (20260316000006):
-- SECURITY DEFINER, empty search_path (all refs schema-qualified; auth.jwt() and
-- pg_catalog builtins resolve regardless), and the caller's JWT subject is
-- validated against p_user_id so a caller cannot mutate another user's profile.

-- 1. increment_nectar: add nectar to the caller's profile. When p_lifetime is
--    true, also credit lifetime_nectar (used for leaderboards / progression).
--    p_amount is clamped to >= 0 to prevent using this as a withdrawal.
create or replace function public.increment_nectar(
  p_user_id text,
  p_amount integer,
  p_lifetime boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id text;
  v_amount integer;
  v_current integer;
  v_lifetime integer;
begin
  v_user_id := auth.jwt()->>'sub';
  if v_user_id is null or v_user_id != p_user_id then
    return jsonb_build_object('success', false, 'message', 'Unauthorized');
  end if;

  v_amount := greatest(coalesce(p_amount, 0), 0);

  update public.profiles
  set
    current_nectar = coalesce(current_nectar, 0) + v_amount,
    lifetime_nectar = coalesce(lifetime_nectar, 0)
      + case when p_lifetime then v_amount else 0 end
  where id = v_user_id
  returning current_nectar, lifetime_nectar into v_current, v_lifetime;

  if not found then
    return jsonb_build_object('success', false, 'message', 'User not found');
  end if;

  return jsonb_build_object(
    'success', true,
    'current_nectar', v_current,
    'lifetime_nectar', v_lifetime
  );
end;
$$;

-- 2. add_to_inventory: idempotently append an owned item id to the caller's
--    inventory. Inventory is a flat jsonb array of item-id strings (same shape
--    purchase_item writes), so p_item_type is accepted to satisfy the client
--    signature but the stored value is the bare item id. Re-granting an item the
--    user already owns is a no-op.
create or replace function public.add_to_inventory(
  p_user_id text,
  p_item_id text,
  p_item_type text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id text;
  v_inventory jsonb;
begin
  v_user_id := auth.jwt()->>'sub';
  if v_user_id is null or v_user_id != p_user_id then
    return jsonb_build_object('success', false, 'message', 'Unauthorized');
  end if;

  select coalesce(inventory, '[]'::jsonb) into v_inventory
  from public.profiles
  where id = v_user_id;

  if not found then
    return jsonb_build_object('success', false, 'message', 'User not found');
  end if;

  if v_inventory @> jsonb_build_array(p_item_id) then
    return jsonb_build_object('success', true, 'message', 'Already owned', 'inventory', v_inventory);
  end if;

  update public.profiles
  set inventory = coalesce(inventory, '[]'::jsonb) || jsonb_build_array(p_item_id)
  where id = v_user_id
  returning inventory into v_inventory;

  return jsonb_build_object('success', true, 'inventory', v_inventory);
end;
$$;

-- 3. Lock down execution: authenticated users only (the JWT check inside each
--    function further restricts writes to the caller's own row).
revoke execute on function public.increment_nectar(text, integer, boolean) from anon, public;
revoke execute on function public.add_to_inventory(text, text, text) from anon, public;

grant execute on function public.increment_nectar(text, integer, boolean) to authenticated;
grant execute on function public.add_to_inventory(text, text, text) to authenticated;

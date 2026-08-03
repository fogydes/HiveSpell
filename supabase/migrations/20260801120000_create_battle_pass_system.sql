-- Battle Pass System Migration
-- Phase 4b: Seasonal Battle Pass

-- Create battle_pass_progress table for tracking player progress per season
CREATE TABLE public.battle_pass_progress (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  season_id text NOT NULL,
  current_tier integer NOT NULL DEFAULT 0,
  current_xp integer NOT NULL DEFAULT 0,
  total_xp_earned integer NOT NULL DEFAULT 0,
  is_premium boolean NOT NULL DEFAULT false,
  claimed_free_tiers integer[] NOT NULL DEFAULT '{}',
  claimed_premium_tiers integer[] NOT NULL DEFAULT '{}',
  last_updated timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  weekly_progress jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- One progress record per user per season
  CONSTRAINT unique_user_season UNIQUE (user_id, season_id)
);

-- Indexes for fast lookups
CREATE INDEX idx_battle_pass_user ON public.battle_pass_progress(user_id);
CREATE INDEX idx_battle_pass_season ON public.battle_pass_progress(season_id);

-- Enable RLS
ALTER TABLE public.battle_pass_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own battle pass progress
CREATE POLICY "Users can view own battle pass progress"
  ON public.battle_pass_progress FOR SELECT
  USING (user_id = current_setting('request.headers', true)::json->>'x-firebase-uid'
    OR current_setting('request.headers', true)::json->>'x-firebase-uid' IS NULL);

-- Users can upsert their own progress (for initial creation)
CREATE POLICY "Users can create own battle pass progress"
  ON public.battle_pass_progress FOR INSERT
  WITH CHECK (user_id = current_setting('request.headers', true)::json->>'x-firebase-uid'
    OR current_setting('request.headers', true)::json->>'x-firebase-uid' IS NULL);

-- Users can update their own progress
CREATE POLICY "Users can update own battle pass progress"
  ON public.battle_pass_progress FOR UPDATE
  USING (user_id = current_setting('request.headers', true)::json->>'x-firebase-uid'
    OR current_setting('request.headers', true)::json->>'x-firebase-uid' IS NULL);

-- RPC: Add XP to battle pass (called from gameplay)
CREATE OR REPLACE FUNCTION public.add_battle_pass_xp(
  p_user_id text,
  p_season_id text,
  p_xp_amount integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_progress battle_pass_progress%rowtype;
  v_new_total_xp integer;
  v_new_tier integer;
  v_season_xp_per_tier integer := 1000;
  v_season_xp_curve text := 'custom';
  v_season_total_tiers integer := 50;
BEGIN
  -- Get or create progress record
  INSERT INTO public.battle_pass_progress (
    user_id, season_id, current_tier, current_xp, total_xp_earned,
    is_premium, claimed_free_tiers, claimed_premium_tiers, last_updated, weekly_progress
  )
  VALUES (
    p_user_id, p_season_id, 0, 0, 0,
    false, '{}'::int[], '{}'::int[], timezone('utc', now()), '[]'::jsonb
  )
  ON CONFLICT (user_id, season_id) DO NOTHING
  RETURNING * INTO v_progress;

  IF v_progress IS NULL THEN
    SELECT * INTO v_progress FROM public.battle_pass_progress
    WHERE user_id = p_user_id AND season_id = p_season_id;
  END IF;

  -- Calculate new total XP
  v_new_total_xp := COALESCE(v_progress.total_xp_earned, 0) + GREATEST(p_xp_amount, 0);

  -- Calculate new tier based on XP curve
  -- For custom curve: base_xp * tier * (1 + (tier - 1) * 0.02)
  v_new_tier := 0;
  DECLARE
    v_accumulated integer := 0;
    v_tier_xp integer;
    v_tier integer := 1;
  BEGIN
    WHILE v_tier <= v_season_total_tiers LOOP
      v_tier_xp := FLOOR(v_season_xp_per_tier * v_tier * (1 + (v_tier - 1) * 0.02));
      IF v_accumulated + v_tier_xp > v_new_total_xp THEN
        EXIT;
      END IF;
      v_accumulated := v_accumulated + v_tier_xp;
      v_new_tier := v_tier;
      v_tier := v_tier + 1;
    END LOOP;
  END;

  -- Update progress
  UPDATE public.battle_pass_progress
  SET
    current_tier = LEAST(v_new_tier, v_season_total_tiers),
    total_xp_earned = v_new_total_xp,
    last_updated = timezone('utc', now())
  WHERE user_id = p_user_id AND season_id = p_season_id;

  RETURN jsonb_build_object(
    'success', true,
    'new_tier', LEAST(v_new_tier, v_season_total_tiers),
    'total_xp', v_new_total_xp,
    'tier_up', v_new_tier > v_progress.current_tier
  );
END;
$$;

-- RPC: Claim battle pass reward
CREATE OR REPLACE FUNCTION public.claim_battle_pass_reward(
  p_user_id text,
  p_season_id text,
  p_tier integer,
  p_is_premium boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_progress battle_pass_progress%rowtype;
  v_new_claimed_free integer[];
  v_new_claimed_premium integer[];
  v_reward_claimed boolean := false;
BEGIN
  -- Get current progress
  SELECT * INTO v_progress FROM public.battle_pass_progress
  WHERE user_id = p_user_id AND season_id = p_season_id;

  IF v_progress IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No progress found');
  END IF;

  -- Check if tier is reached
  IF v_progress.current_tier < p_tier THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tier not reached');
  END IF;

  -- Check premium status for premium rewards
  IF p_is_premium AND NOT v_progress.is_premium THEN
    RETURN jsonb_build_object('success', false, 'error', 'Premium required');
  END IF;

  -- Check if already claimed
  IF p_is_premium THEN
    IF p_tier = ANY(v_progress.claimed_premium_tiers) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Already claimed');
    END IF;
  ELSE
    IF p_tier = ANY(v_progress.claimed_free_tiers) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Already claimed');
    END IF;
  END IF;

  -- Update claimed tiers
  IF p_is_premium THEN
    v_new_claimed_premium := v_progress.claimed_premium_tiers || p_tier;
    v_new_claimed_free := v_progress.claimed_free_tiers;
  ELSE
    v_new_claimed_free := v_progress.claimed_free_tiers || p_tier;
    v_new_claimed_premium := v_progress.claimed_premium_tiers;
  END IF;

  UPDATE public.battle_pass_progress
  SET
    claimed_free_tiers = v_new_claimed_free,
    claimed_premium_tiers = v_new_claimed_premium,
    last_updated = timezone('utc', now())
  WHERE user_id = p_user_id AND season_id = p_season_id;

  RETURN jsonb_build_object(
    'success', true,
    'tier', p_tier,
    'is_premium', p_is_premium
  );
END;
$$;

-- RPC: Purchase premium battle pass
CREATE OR REPLACE FUNCTION public.purchase_battle_pass_premium(
  p_user_id text,
  p_season_id text,
  p_honey_cost integer DEFAULT 950
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_progress battle_pass_progress%rowtype;
  v_profile profiles%rowtype;
BEGIN
  -- Check if user has profile with honey (would need honey column)
  -- For now, just check profile exists
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;

  IF v_profile IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  -- Get current progress
  SELECT * INTO v_progress FROM public.battle_pass_progress
  WHERE user_id = p_user_id AND season_id = p_season_id;

  IF v_progress IS NULL THEN
    -- Create new progress with premium
    INSERT INTO public.battle_pass_progress (
      user_id, season_id, current_tier, current_xp, total_xp_earned,
      is_premium, claimed_free_tiers, claimed_premium_tiers, last_updated, weekly_progress
    )
    VALUES (
      p_user_id, p_season_id, 0, 0, 0,
      true, '{}'::int[], '{}'::int[], timezone('utc', now()), '[]'::jsonb
    )
    RETURNING * INTO v_progress;
  ELSE
    -- Update existing progress
    IF v_progress.is_premium THEN
      RETURN jsonb_build_object('success', false, 'error', 'Already premium');
    END IF;

    UPDATE public.battle_pass_progress
    SET
      is_premium = true,
      last_updated = timezone('utc', now())
    WHERE user_id = p_user_id AND season_id = p_season_id;
  END IF;

  -- TODO: Deduct honey from user profile when honey column exists

  RETURN jsonb_build_object(
    'success', true,
    'is_premium', true
  );
END;
$$;

-- RPC: Get battle pass progress (for client-side fetching)
CREATE OR REPLACE FUNCTION public.get_battle_pass_progress(
  p_user_id text,
  p_season_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_progress battle_pass_progress%rowtype;
BEGIN
  SELECT * INTO v_progress FROM public.battle_pass_progress
  WHERE user_id = p_user_id AND season_id = p_season_id;

  IF v_progress IS NULL THEN
    RETURN jsonb_build_object(
      'exists', false,
      'current_tier', 0,
      'current_xp', 0,
      'total_xp_earned', 0,
      'is_premium', false,
      'claimed_free_tiers', '[]'::jsonb,
      'claimed_premium_tiers', '[]'::jsonb,
      'last_updated', timezone('utc', now()),
      'weekly_progress', '[]'::jsonb
    );
  END IF;

  RETURN jsonb_build_object(
    'exists', true,
    'current_tier', v_progress.current_tier,
    'current_xp', v_progress.current_xp,
    'total_xp_earned', v_progress.total_xp_earned,
    'is_premium', v_progress.is_premium,
    'claimed_free_tiers', v_progress.claimed_free_tiers,
    'claimed_premium_tiers', v_progress.claimed_premium_tiers,
    'last_updated', v_progress.last_updated,
    'weekly_progress', v_progress.weekly_progress
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.add_battle_pass_xp(text, text, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_battle_pass_reward(text, text, integer, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_battle_pass_premium(text, text, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_battle_pass_progress(text, text) TO anon, authenticated;
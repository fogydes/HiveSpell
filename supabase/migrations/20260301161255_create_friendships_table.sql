
-- Create friendships table
CREATE TABLE public.friendships (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,

  -- Prevent duplicate friendships (one direction)
  CONSTRAINT unique_friendship UNIQUE (requester_id, addressee_id),
  -- Prevent self-friending
  CONSTRAINT no_self_friend CHECK (requester_id != addressee_id)
);

-- Index for fast lookups
CREATE INDEX idx_friendships_requester ON public.friendships(requester_id);
CREATE INDEX idx_friendships_addressee ON public.friendships(addressee_id);
CREATE INDEX idx_friendships_status ON public.friendships(status);

-- Enable RLS
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view friendships they are part of
CREATE POLICY "Users can view own friendships"
  ON public.friendships FOR SELECT
  USING (requester_id = current_setting('request.headers', true)::json->>'x-firebase-uid'
    OR addressee_id = current_setting('request.headers', true)::json->>'x-firebase-uid'
    OR current_setting('request.headers', true)::json->>'x-firebase-uid' IS NULL);

-- Users can create friend requests as themselves
CREATE POLICY "Users can send friend requests"
  ON public.friendships FOR INSERT
  WITH CHECK (requester_id = current_setting('request.headers', true)::json->>'x-firebase-uid'
    OR current_setting('request.headers', true)::json->>'x-firebase-uid' IS NULL);

-- Users can update friendships addressed to them (accept/decline)
CREATE POLICY "Addressee can respond to requests"
  ON public.friendships FOR UPDATE
  USING (addressee_id = current_setting('request.headers', true)::json->>'x-firebase-uid'
    OR current_setting('request.headers', true)::json->>'x-firebase-uid' IS NULL);

-- Users can delete friendships they are part of (unfriend)
CREATE POLICY "Users can remove friendships"
  ON public.friendships FOR DELETE
  USING (requester_id = current_setting('request.headers', true)::json->>'x-firebase-uid'
    OR addressee_id = current_setting('request.headers', true)::json->>'x-firebase-uid'
    OR current_setting('request.headers', true)::json->>'x-firebase-uid' IS NULL);
;

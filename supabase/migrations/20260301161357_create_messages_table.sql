
-- Create messages table for DMs
CREATE TABLE public.messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  read boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,

  CONSTRAINT no_self_message CHECK (sender_id != receiver_id)
);

-- Indexes
CREATE INDEX idx_messages_sender ON public.messages(sender_id);
CREATE INDEX idx_messages_receiver ON public.messages(receiver_id);
CREATE INDEX idx_messages_conversation ON public.messages(sender_id, receiver_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages they sent or received
CREATE POLICY "Users can view own messages"
  ON public.messages FOR SELECT
  USING (sender_id = current_setting('request.headers', true)::json->>'x-firebase-uid'
    OR receiver_id = current_setting('request.headers', true)::json->>'x-firebase-uid'
    OR current_setting('request.headers', true)::json->>'x-firebase-uid' IS NULL);

-- Users can send messages as themselves
CREATE POLICY "Users can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (sender_id = current_setting('request.headers', true)::json->>'x-firebase-uid'
    OR current_setting('request.headers', true)::json->>'x-firebase-uid' IS NULL);

-- Receiver can mark messages as read
CREATE POLICY "Receiver can update messages"
  ON public.messages FOR UPDATE
  USING (receiver_id = current_setting('request.headers', true)::json->>'x-firebase-uid'
    OR current_setting('request.headers', true)::json->>'x-firebase-uid' IS NULL);

-- Enable Realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
;

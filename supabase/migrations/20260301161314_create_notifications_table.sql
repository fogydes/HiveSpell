
-- Create notifications table
CREATE TABLE public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('friend_request', 'friend_accepted', 'system')),
  title text NOT NULL,
  message text,
  data jsonb DEFAULT '{}'::jsonb,
  read boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

-- Indexes
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(user_id, read);
CREATE INDEX idx_notifications_created ON public.notifications(created_at DESC);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = current_setting('request.headers', true)::json->>'x-firebase-uid'
    OR current_setting('request.headers', true)::json->>'x-firebase-uid' IS NULL);

-- Anyone can insert notifications (friend requests create them for other users)
CREATE POLICY "Users can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- Users can mark their own notifications as read
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = current_setting('request.headers', true)::json->>'x-firebase-uid'
    OR current_setting('request.headers', true)::json->>'x-firebase-uid' IS NULL);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  USING (user_id = current_setting('request.headers', true)::json->>'x-firebase-uid'
    OR current_setting('request.headers', true)::json->>'x-firebase-uid' IS NULL);

-- Enable Realtime for notifications (live updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
;

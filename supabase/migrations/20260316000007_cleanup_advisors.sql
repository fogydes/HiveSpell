-- 1. Drop temporary debug functions
DROP FUNCTION IF EXISTS public.debug_auth();
DROP FUNCTION IF EXISTS public.get_my_uid();
DROP FUNCTION IF EXISTS public.get_firebase_uid();

-- 2. Combine multiple permissive UPDATE policies on messages table
DROP POLICY IF EXISTS "Receiver can update messages" ON public.messages;
DROP POLICY IF EXISTS "Sender can update messages" ON public.messages;

CREATE POLICY "Users can update their messages" ON public.messages FOR UPDATE
USING (
  receiver_id = (select auth.jwt()->>'sub') OR 
  sender_id = (select auth.jwt()->>'sub')
);

-- 3. Drop unused indexes to save space and improve write performance
DROP INDEX IF EXISTS public.idx_messages_sender;
DROP INDEX IF EXISTS public.idx_notifications_user;
DROP INDEX IF EXISTS public.idx_notifications_created;

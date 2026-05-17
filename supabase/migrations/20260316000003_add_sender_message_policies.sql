-- Add missing policies for message senders to edit and delete their own messages
CREATE POLICY "Sender can update messages" ON public.messages FOR UPDATE
USING (sender_id = (select current_setting('request.headers', true)::json->>'x-firebase-uid'));

CREATE POLICY "Sender can delete messages" ON public.messages FOR DELETE
USING (sender_id = (select current_setting('request.headers', true)::json->>'x-firebase-uid'));

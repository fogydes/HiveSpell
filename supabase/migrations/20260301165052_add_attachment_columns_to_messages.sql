
-- Add attachment support to messages
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS attachment_type text CHECK (attachment_type IN ('image', 'file', 'voice')),
  ADD COLUMN IF NOT EXISTS attachment_name text;
;

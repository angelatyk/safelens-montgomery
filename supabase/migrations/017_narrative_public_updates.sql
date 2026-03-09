-- Migration 017: Threaded Public Updates
-- This table stores every public-facing update as an immutable record to preserve history.

CREATE TABLE public.narrative_public_updates (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  narrative_id uuid REFERENCES public.narratives(id) ON DELETE CASCADE NOT NULL,
  user_id      uuid REFERENCES public.users(id),
  content      text NOT NULL,
  created_at   timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.narrative_public_updates ENABLE ROW LEVEL SECURITY;

-- Residents can read all public updates
CREATE POLICY "Everyone can read public updates" ON public.narrative_public_updates
  FOR SELECT USING (true);

-- Authenticated users (officials) can insert
CREATE POLICY "Authenticated users can post updates" ON public.narrative_public_updates
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Migration complete. The narrative UI should now pull from this table 
-- instead of the legacy 'official_update' column on the narratives table.

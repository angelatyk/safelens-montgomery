-- Migration 014: Add official_status, official_update to narratives + narrative_comments table

-- 1. Add official_status and official_update to narratives
ALTER TABLE public.narratives
  ADD COLUMN official_status text DEFAULT 'unreviewed' NOT NULL,
  ADD COLUMN official_update text,
  ADD CONSTRAINT narratives_official_status_check
    CHECK (official_status IN ('unreviewed', 'acknowledged', 'verified', 'dispatched', 'resolved'));

-- 2. New narrative_comments table
CREATE TABLE public.narrative_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  narrative_id uuid REFERENCES public.narratives(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.users(id),
  content text NOT NULL,
  is_official boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.narrative_comments ENABLE ROW LEVEL SECURITY;

-- Officials see all comments, residents only see public (non-official) comments
CREATE POLICY "Residents see public comments" ON narrative_comments
  FOR SELECT USING (
    is_official = false OR
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'official'
  );

-- Anyone authenticated can insert
CREATE POLICY "Authenticated users can comment" ON narrative_comments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
-- Migration 011: Rename incident_feedback to narrative_feedback and add narrative_id FK

-- Rename incident_feedback to narrative_feedback
ALTER TABLE public.incident_feedback RENAME TO narrative_feedback;

-- Add narrative_id as primary FK
ALTER TABLE public.narrative_feedback
  ADD COLUMN narrative_id uuid REFERENCES public.narratives(id) ON DELETE CASCADE;

-- Make incident_id nullable (keep for backwards compat)
ALTER TABLE public.narrative_feedback
  ALTER COLUMN incident_id DROP NOT NULL;

-- Ensure at least one target is always set
ALTER TABLE public.narrative_feedback
  ADD CONSTRAINT feedback_target_check
    CHECK (incident_id IS NOT NULL OR narrative_id IS NOT NULL);

-- Update RLS policies
DROP POLICY IF EXISTS "Anyone can insert feedback" ON public.narrative_feedback;
DROP POLICY IF EXISTS "Anyone can view feedback counts" ON public.narrative_feedback;
DROP POLICY IF EXISTS "Officials can delete feedback" ON public.narrative_feedback;

CREATE POLICY "Anyone can insert feedback" ON public.narrative_feedback
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view feedback counts" ON public.narrative_feedback
  FOR SELECT USING (true);

CREATE POLICY "Officials can delete feedback" ON public.narrative_feedback
  FOR DELETE
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'official');
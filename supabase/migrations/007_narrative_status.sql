-- Update narratives table to include status and verification fields
ALTER TABLE public.narratives
  ADD COLUMN status text DEFAULT 'pending' NOT NULL,
  ADD COLUMN verified_by uuid REFERENCES public.users(id),
  ADD COLUMN verified_at timestamp with time zone,
  ADD COLUMN official_notes text,
  ADD COLUMN resident_report_id uuid REFERENCES public.resident_reports(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS narratives_status_idx ON public.narratives(status);

-- Update RLS policies for narratives (if they exist)
-- Residents should only see 'active' narratives
-- Officials should see all narratives
DROP POLICY IF EXISTS "Residents can view active narratives" ON narratives;
CREATE POLICY "Residents can view active narratives" ON narratives
  FOR SELECT
  USING (status = 'active' OR (SELECT role FROM users WHERE id = auth.uid()) = 'official');

-- Source Reputation and Incident Feedback already exist in 005_feedback_loop.sql
-- Ensuring they are properly set up with initial data if needed
INSERT INTO source_reputation (source_name, accuracy_score)
VALUES ('City of Montgomery', 100), ('SafeLens AI', 80)
ON CONFLICT (source_name) DO NOTHING;

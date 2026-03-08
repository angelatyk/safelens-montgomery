-- Update RLS for narratives to show both pending and active to everyone
DROP POLICY IF EXISTS "Residents can view active narratives" ON narratives;
DROP POLICY IF EXISTS "Residents can view all narratives" ON narratives;

CREATE POLICY "Anyone can view narratives" ON narratives
  FOR SELECT
  USING (true);

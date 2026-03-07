-- 1. Make sure users table has role column
ALTER TABLE users ADD COLUMN IF NOT EXISTS role text DEFAULT 'resident'
  CHECK (role IN ('resident', 'official', 'dispatcher'));

-- 2. Auto-create a users row for every new signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (new.id, new.email, 'resident')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


  -- 3. Only run after demo accounts created
  -- Email: demo-resident@safelens.demo / Password: SafeLens2026!
  -- Email: demo-official@safelens.demo / Password: SafeLens2026!
  -- Insert demo users with correct roles
INSERT INTO public.users (id, email, role) VALUES
  ('<resident-uuid-here>', 'demo-resident@safelens.demo', 'resident'),
  ('<official-uuid-here>', 'demo-official@safelens.demo', 'official')
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;
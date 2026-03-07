ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS avatar_url text;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, role, display_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    'resident',
    COALESCE(
      new.raw_user_meta_data->>'full_name',    -- Google, GitHub
      new.raw_user_meta_data->>'name',          -- fallback
      split_part(new.email, '@', 1)             -- last resort: use email prefix
    ),
    COALESCE(
      new.raw_user_meta_data->>'avatar_url',    -- GitHub
      new.raw_user_meta_data->>'picture'        -- Google
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
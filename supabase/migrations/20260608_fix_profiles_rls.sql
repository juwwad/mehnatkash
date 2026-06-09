-- Allow any authenticated user to read profiles (needed for professional listings)
-- The existing policy only allows users to read their OWN profile which breaks search/discovery

DO $$
BEGIN
  -- Drop the restrictive policy if it exists
  DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

  -- Re-create as: authenticated users can read all profiles (for listings), 
  -- and keep admin access
  CREATE POLICY "Authenticated users can view profiles" ON public.profiles
    FOR SELECT TO authenticated
    USING (true);
END
$$;

-- Also allow upsert (the UPDATE policy needs USING clause compatible with upsert)
-- Existing update policy should already handle this, but make sure it exists:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile" ON public.profiles
      FOR UPDATE TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END
$$;

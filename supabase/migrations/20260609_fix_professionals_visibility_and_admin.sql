-- =============================================================
-- FIX 1: Professionals visibility
-- Remove the is_verified gate so new sign-ups appear on the home
-- screen and search. Admin can still verify/reject from the panel.
-- =============================================================

DROP POLICY IF EXISTS "Authenticated users can view professionals" ON public.professionals;
DROP POLICY IF EXISTS "Anon can view verified professionals" ON public.professionals;

-- Authenticated users see ALL professionals (admin can filter/approve)
CREATE POLICY "Authenticated users can view professionals"
  ON public.professionals FOR SELECT TO authenticated
  USING (true);

-- Anon users see only available professionals (via the public view)
CREATE POLICY "Anon can view available professionals"
  ON public.professionals FOR SELECT TO anon
  USING (is_available = true);

-- =============================================================
-- FIX 2: Admin role assignment helper
--
-- HOW TO CREATE YOUR FIRST ADMIN:
--
--   1. Sign up normally through the app with your admin email.
--   2. In Supabase Dashboard → SQL Editor, run:
--
--      SELECT assign_admin_role('your-admin@email.com');
--
--   3. Log out and log back in. The Admin button appears on the
--      home screen header and /admin is now accessible.
-- =============================================================

CREATE OR REPLACE FUNCTION public.assign_admin_role(admin_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Look up the user ID from auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = lower(trim(admin_email))
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN 'ERROR: No user found with email ' || admin_email || '. Sign up first.';
  END IF;

  -- Insert admin role (ignore if already exists)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN 'SUCCESS: ' || admin_email || ' is now an admin (user_id: ' || v_user_id || ')';
END;
$$;

-- Grant execute to authenticated users so the SQL editor can call it
-- (only admins/service-role can actually run SQL editor queries in Supabase)
REVOKE ALL ON FUNCTION public.assign_admin_role(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_admin_role(TEXT) TO service_role;

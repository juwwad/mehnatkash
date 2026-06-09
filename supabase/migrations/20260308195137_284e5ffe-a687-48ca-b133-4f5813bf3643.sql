-- Allow anon users to see verified professionals (without GPS) and authenticated users to see all
DROP POLICY IF EXISTS "Authenticated users can view verified professionals" ON public.professionals;

-- Authenticated users: full access to verified professionals + own profile + admin sees all
CREATE POLICY "Authenticated users can view professionals"
  ON public.professionals FOR SELECT TO authenticated
  USING (is_verified = true OR user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Anonymous users: can see verified professionals (GPS is excluded via a view)
CREATE POLICY "Anon can view verified professionals"
  ON public.professionals FOR SELECT TO anon
  USING (is_verified = true);

-- Create a public-safe view that excludes GPS coordinates for anon/public use
CREATE OR REPLACE VIEW public.professionals_public
WITH (security_invoker = on) AS
  SELECT id, user_id, profile_id, service_id, hourly_rate, is_available, is_verified, 
         rating, review_count, verification_status, skills, bio, location_city, created_at, updated_at
  FROM public.professionals;
-- Note: location_lat and location_lng are excluded
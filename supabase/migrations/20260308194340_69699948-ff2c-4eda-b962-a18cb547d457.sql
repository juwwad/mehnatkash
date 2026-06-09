-- Restrict professionals SELECT to authenticated users only (prevents anon GPS access)
DROP POLICY IF EXISTS "Anyone can view verified professionals" ON public.professionals;
CREATE POLICY "Authenticated users can view verified professionals"
  ON public.professionals FOR SELECT TO authenticated
  USING (is_verified = true OR user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Fix 1: Professional self-verify - replace UPDATE policy with field-restricted ones
DROP POLICY IF EXISTS "Users can update own professional profile" ON public.professionals;

-- Professionals can update own row but cannot change verification fields
CREATE POLICY "Professionals update own non-sensitive fields"
ON public.professionals FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND is_verified IS NOT DISTINCT FROM (SELECT p.is_verified FROM public.professionals p WHERE p.user_id = auth.uid())
  AND verification_status IS NOT DISTINCT FROM (SELECT p.verification_status FROM public.professionals p WHERE p.user_id = auth.uid())
);

-- Admins can update any field
CREATE POLICY "Admins can update all professional fields"
ON public.professionals FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Fix 2: Make chat-images bucket private and fix storage policies
UPDATE storage.buckets SET public = false WHERE id = 'chat-images';

DROP POLICY IF EXISTS "Anyone can view chat images" ON storage.objects;

CREATE POLICY "Chat participants can view images"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-images'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.conversations
    WHERE customer_id = auth.uid()
      OR professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
  )
);

-- Fix 3: Add RLS policy on push_config so only service role can access it (no anon/authenticated)
CREATE POLICY "No public access to push_config"
ON public.push_config FOR ALL TO authenticated
USING (false);

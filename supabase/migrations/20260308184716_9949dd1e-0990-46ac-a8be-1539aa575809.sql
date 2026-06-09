
-- Fix 1: Tighten ratings INSERT policy to validate booking ownership, completion, and professional match
DROP POLICY IF EXISTS "Customers can rate completed bookings" ON public.ratings;

CREATE POLICY "Customers can rate completed bookings" ON public.ratings
  FOR INSERT TO authenticated
  WITH CHECK (
    customer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND b.customer_id = auth.uid()
        AND b.status = 'completed'
        AND b.professional_id = (
          SELECT prof.user_id FROM public.professionals prof WHERE prof.id = ratings.professional_id
        )
    )
  );

-- Fix 2: Tighten chat-images upload policy to conversation participants only
DROP POLICY IF EXISTS "Authenticated users can upload chat images" ON storage.objects;

CREATE POLICY "Conversation participants can upload images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-images'
    AND (storage.foldername(name))[1] IN (
      SELECT c.id::text FROM public.conversations c
      WHERE c.customer_id = auth.uid()
        OR c.professional_id IN (
          SELECT p.id FROM public.professionals p WHERE p.user_id = auth.uid()
        )
    )
  );

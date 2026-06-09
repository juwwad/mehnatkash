
-- 1. Fix conversations UPDATE policy: add WITH CHECK to prevent redirecting chats
DROP POLICY IF EXISTS "Participants can update conversations" ON public.conversations;
CREATE POLICY "Participants can update conversations"
  ON public.conversations FOR UPDATE TO authenticated
  USING (
    customer_id = auth.uid()
    OR professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
  )
  WITH CHECK (
    customer_id = (SELECT c.customer_id FROM conversations c WHERE c.id = conversations.id)
    AND professional_id = (SELECT c.professional_id FROM conversations c WHERE c.id = conversations.id)
    AND booking_id IS NOT DISTINCT FROM (SELECT c.booking_id FROM conversations c WHERE c.id = conversations.id)
  );

-- 2. Fix professionals can manipulate payment: tighten WITH CHECK
DROP POLICY IF EXISTS "Professionals can update assigned bookings" ON public.bookings;
CREATE POLICY "Professionals can update assigned bookings"
  ON public.bookings FOR UPDATE TO authenticated
  USING (
    professional_id IN (SELECT p.id FROM professionals p WHERE p.user_id = auth.uid())
  )
  WITH CHECK (
    professional_id IN (SELECT p.id FROM professionals p WHERE p.user_id = auth.uid())
    AND customer_id = (SELECT b.customer_id FROM bookings b WHERE b.id = bookings.id)
    AND professional_id = (SELECT b.professional_id FROM bookings b WHERE b.id = bookings.id)
    AND payment_status = (SELECT b.payment_status FROM bookings b WHERE b.id = bookings.id)
    AND price IS NOT DISTINCT FROM (SELECT b.price FROM bookings b WHERE b.id = bookings.id)
    AND completed_at IS NOT DISTINCT FROM (SELECT b.completed_at FROM bookings b WHERE b.id = bookings.id)
    AND service_id IS NOT DISTINCT FROM (SELECT b.service_id FROM bookings b WHERE b.id = bookings.id)
  );

-- 3. Fix public role policies -> restrict to authenticated
DROP POLICY IF EXISTS "Admins can update bookings" ON public.bookings;
CREATE POLICY "Admins can update bookings"
  ON public.bookings FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Customers can update own bookings" ON public.bookings;
CREATE POLICY "Customers can update own bookings"
  ON public.bookings FOR UPDATE TO authenticated
  USING (customer_id = auth.uid())
  WITH CHECK (
    customer_id = auth.uid()
    AND payment_status = (SELECT b.payment_status FROM bookings b WHERE b.id = bookings.id)
    AND price IS NOT DISTINCT FROM (SELECT b.price FROM bookings b WHERE b.id = bookings.id)
    AND professional_id = (SELECT b.professional_id FROM bookings b WHERE b.id = bookings.id)
    AND completed_at IS NOT DISTINCT FROM (SELECT b.completed_at FROM bookings b WHERE b.id = bookings.id)
  );

DROP POLICY IF EXISTS "Recipients can mark messages read" ON public.chat_messages;
CREATE POLICY "Recipients can mark messages read"
  ON public.chat_messages FOR UPDATE TO authenticated
  USING (
    sender_id <> auth.uid()
    AND conversation_id IN (
      SELECT c.id FROM conversations c
      WHERE c.customer_id = auth.uid()
        OR c.professional_id IN (SELECT p.id FROM professionals p WHERE p.user_id = auth.uid())
    )
  )
  WITH CHECK (
    sender_id <> auth.uid()
    AND conversation_id IN (
      SELECT c.id FROM conversations c
      WHERE c.customer_id = auth.uid()
        OR c.professional_id IN (SELECT p.id FROM professionals p WHERE p.user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Senders can update own messages" ON public.chat_messages;
CREATE POLICY "Senders can update own messages"
  ON public.chat_messages FOR UPDATE TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- 4. Fix ratings public exposure: restrict SELECT to authenticated and hide customer_id via a view
DROP POLICY IF EXISTS "Anyone can view ratings" ON public.ratings;
CREATE POLICY "Authenticated users can view ratings"
  ON public.ratings FOR SELECT TO authenticated
  USING (true);

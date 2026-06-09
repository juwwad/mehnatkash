
-- Fix 1: chat_messages UPDATE policy - restrict to message sender only for content changes,
-- and allow conversation participants to update is_read only
DROP POLICY IF EXISTS "Users can update own messages" ON public.chat_messages;

-- Senders can update their own messages (content, image_url)
CREATE POLICY "Senders can update own messages"
ON public.chat_messages
FOR UPDATE
USING (sender_id = auth.uid())
WITH CHECK (sender_id = auth.uid());

-- Recipients can mark messages as read (only is_read column via a trigger guard)
CREATE POLICY "Recipients can mark messages read"
ON public.chat_messages
FOR UPDATE
USING (
  sender_id != auth.uid()
  AND conversation_id IN (
    SELECT c.id FROM conversations c
    WHERE c.customer_id = auth.uid()
    OR c.professional_id IN (
      SELECT p.id FROM professionals p WHERE p.user_id = auth.uid()
    )
  )
)
WITH CHECK (
  sender_id != auth.uid()
  AND conversation_id IN (
    SELECT c.id FROM conversations c
    WHERE c.customer_id = auth.uid()
    OR c.professional_id IN (
      SELECT p.id FROM professionals p WHERE p.user_id = auth.uid()
    )
  )
);

-- Add trigger to prevent recipients from modifying anything except is_read
CREATE OR REPLACE FUNCTION public.guard_chat_message_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If the updater is not the sender, only allow is_read changes
  IF OLD.sender_id != auth.uid() THEN
    IF NEW.content IS DISTINCT FROM OLD.content
      OR NEW.image_url IS DISTINCT FROM OLD.image_url
      OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
      OR NEW.conversation_id IS DISTINCT FROM OLD.conversation_id
    THEN
      RAISE EXCEPTION 'Recipients can only update is_read';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_chat_message_update_trigger ON public.chat_messages;
CREATE TRIGGER guard_chat_message_update_trigger
  BEFORE UPDATE ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_chat_message_update();

-- Fix 2: bookings UPDATE policy - restrict what customers vs professionals can modify
DROP POLICY IF EXISTS "Parties can update bookings" ON public.bookings;

-- Admins can update anything
CREATE POLICY "Admins can update bookings"
ON public.bookings
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Customers can only update description and cancel (set status to 'cancelled')
CREATE POLICY "Customers can update own bookings"
ON public.bookings
FOR UPDATE
USING (customer_id = auth.uid())
WITH CHECK (
  customer_id = auth.uid()
  -- Customers cannot change payment_status, price, or professional_id
  AND payment_status = (SELECT b.payment_status FROM bookings b WHERE b.id = bookings.id)
  AND price IS NOT DISTINCT FROM (SELECT b.price FROM bookings b WHERE b.id = bookings.id)
  AND professional_id = (SELECT b.professional_id FROM bookings b WHERE b.id = bookings.id)
  AND completed_at IS NOT DISTINCT FROM (SELECT b.completed_at FROM bookings b WHERE b.id = bookings.id)
);

-- Professionals can update status, price, completed_at on their bookings
CREATE POLICY "Professionals can update assigned bookings"
ON public.bookings
FOR UPDATE
USING (
  professional_id IN (
    SELECT p.id FROM professionals p WHERE p.user_id = auth.uid()
  )
)
WITH CHECK (
  professional_id IN (
    SELECT p.id FROM professionals p WHERE p.user_id = auth.uid()
  )
  -- Professionals cannot change customer_id or professional_id
  AND customer_id = (SELECT b.customer_id FROM bookings b WHERE b.id = bookings.id)
  AND professional_id = (SELECT b.professional_id FROM bookings b WHERE b.id = bookings.id)
);

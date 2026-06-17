-- =====================================================================
-- FIX 1: Rating workflow regression
-- The previous trigger fix only allowed customers to transition status
-- to 'cancelled'. But RatingModal.tsx sets status: "rated" after a job
-- is completed — that transition was being silently blocked. Allow it.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.enforce_booking_transitions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  is_admin boolean;
  is_customer boolean;
  is_professional boolean;
BEGIN
  is_admin := has_role(auth.uid(), 'admin'::app_role);
  is_customer := (OLD.customer_id = auth.uid());
  is_professional := EXISTS (
    SELECT 1 FROM professionals p WHERE p.id = OLD.professional_id AND p.user_id = auth.uid()
  );

  IF is_admin THEN
    RETURN NEW;
  END IF;

  IF is_customer THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NOT (
        (NEW.status = 'cancelled' AND OLD.status IN ('requested', 'confirmed')) OR
        (NEW.status = 'rated' AND OLD.status = 'completed')
      ) THEN
        RAISE EXCEPTION 'Invalid status transition from % to % for customer', OLD.status, NEW.status;
      END IF;
    END IF;
    IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
      RAISE EXCEPTION 'Customers cannot change payment status';
    END IF;
    IF NEW.completed_at IS DISTINCT FROM OLD.completed_at THEN
      RAISE EXCEPTION 'Customers cannot change completed_at';
    END IF;
    IF NEW.price IS DISTINCT FROM OLD.price
      OR NEW.professional_id IS DISTINCT FROM OLD.professional_id
      OR NEW.service_id IS DISTINCT FROM OLD.service_id THEN
      RAISE EXCEPTION 'Customers cannot change price, professional, or service';
    END IF;
  END IF;

  IF is_professional THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NOT (
        (OLD.status = 'requested' AND NEW.status IN ('confirmed', 'cancelled')) OR
        (OLD.status = 'confirmed' AND NEW.status IN ('in_progress', 'cancelled')) OR
        (OLD.status = 'in_progress' AND NEW.status IN ('completed', 'cancelled'))
      ) THEN
        RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
      END IF;
    END IF;

    IF NEW.completed_at IS DISTINCT FROM OLD.completed_at AND NEW.status != 'completed' THEN
      RAISE EXCEPTION 'completed_at can only be set when marking a booking completed';
    END IF;

    IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
      IF NOT (OLD.payment_status = 'unpaid' AND NEW.payment_status = 'paid') THEN
        RAISE EXCEPTION 'Invalid payment status transition';
      END IF;
    END IF;

    IF NEW.customer_id IS DISTINCT FROM OLD.customer_id
      OR NEW.professional_id IS DISTINCT FROM OLD.professional_id
      OR NEW.service_id IS DISTINCT FROM OLD.service_id
      OR NEW.price IS DISTINCT FROM OLD.price THEN
      RAISE EXCEPTION 'Professionals cannot change customer, professional, service, or price';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- =====================================================================
-- FIX 2: Allow professionals to create the booking's conversation too
-- Previously only customer_id = auth.uid() could INSERT a conversation,
-- meaning a professional clicking "Chat" on an old booking (created
-- before this feature existed) would fail. The app derives customer_id/
-- professional_id straight from the booking row, never from auth.uid(),
-- so this is safe to widen.
-- =====================================================================

DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
CREATE POLICY "Users can create conversations"
  ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (
    customer_id = auth.uid()
    OR professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
  );

-- =====================================================================
-- FIX 3: Re-assert realtime is enabled for chat (idempotent / safe to
-- re-run even if already added)
-- =====================================================================

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;

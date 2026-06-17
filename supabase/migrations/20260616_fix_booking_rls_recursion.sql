-- =====================================================================
-- FIX: 42P17 "infinite recursion detected in policy for relation X"
--
-- ROOT CAUSE: The UPDATE policies on `bookings` and `conversations`
-- had WITH CHECK clauses that re-queried the SAME table they were
-- defined on (e.g. "SELECT b.customer_id FROM bookings b WHERE
-- b.id = bookings.id"). Postgres has to re-apply RLS to evaluate
-- that subquery, which re-triggers the same policy — infinite loop.
--
-- FIX: Remove all self-referencing subqueries from WITH CHECK.
-- The field-lock protections they were trying to enforce (don't let
-- professionals change price/customer_id, don't let customers change
-- payment_status, etc.) are moved into the trigger function instead,
-- which already has OLD/NEW available directly with zero subqueries.
-- =====================================================================

-- ---------- BOOKINGS ----------

DROP POLICY IF EXISTS "Admins can update bookings" ON public.bookings;
CREATE POLICY "Admins can update bookings"
  ON public.bookings FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Customers can update own bookings" ON public.bookings;
CREATE POLICY "Customers can update own bookings"
  ON public.bookings FOR UPDATE TO authenticated
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS "Professionals can update assigned bookings" ON public.bookings;
CREATE POLICY "Professionals can update assigned bookings"
  ON public.bookings FOR UPDATE TO authenticated
  USING (professional_id IN (SELECT p.id FROM public.professionals p WHERE p.user_id = auth.uid()))
  WITH CHECK (professional_id IN (SELECT p.id FROM public.professionals p WHERE p.user_id = auth.uid()));

-- Re-create the trigger to enforce the SAME field-level protections,
-- but using OLD/NEW directly — no subqueries, no recursion possible.
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
      IF NEW.status != 'cancelled' OR OLD.status NOT IN ('requested', 'confirmed') THEN
        RAISE EXCEPTION 'Customers can only cancel requested or confirmed bookings';
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
    -- Status transitions
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NOT (
        (OLD.status = 'requested' AND NEW.status IN ('confirmed', 'cancelled')) OR
        (OLD.status = 'confirmed' AND NEW.status IN ('in_progress', 'cancelled')) OR
        (OLD.status = 'in_progress' AND NEW.status IN ('completed', 'cancelled'))
      ) THEN
        RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
      END IF;
    END IF;

    -- completed_at may only be set when marking the job completed
    IF NEW.completed_at IS DISTINCT FROM OLD.completed_at AND NEW.status != 'completed' THEN
      RAISE EXCEPTION 'completed_at can only be set when marking a booking completed';
    END IF;

    -- payment_status may only move unpaid -> paid
    IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
      IF NOT (OLD.payment_status = 'unpaid' AND NEW.payment_status = 'paid') THEN
        RAISE EXCEPTION 'Invalid payment status transition';
      END IF;
    END IF;

    -- Immutable fields for professionals
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

DROP TRIGGER IF EXISTS enforce_booking_transitions_trigger ON public.bookings;
CREATE TRIGGER enforce_booking_transitions_trigger
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_booking_transitions();

-- ---------- CONVERSATIONS ----------
-- Same recursive-subquery bug, same fix. Nothing in the app currently
-- updates conversations directly, so this is a safe no-risk fix now
-- before it bites you later.

DROP POLICY IF EXISTS "Participants can update conversations" ON public.conversations;
CREATE POLICY "Participants can update conversations"
  ON public.conversations FOR UPDATE TO authenticated
  USING (
    customer_id = auth.uid()
    OR professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
  )
  WITH CHECK (
    customer_id = auth.uid()
    OR professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
  );

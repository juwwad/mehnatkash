
-- Enforce booking status transitions and field restrictions per role
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
  -- Check caller role
  is_admin := has_role(auth.uid(), 'admin'::app_role);
  is_customer := (OLD.customer_id = auth.uid());
  is_professional := EXISTS (
    SELECT 1 FROM professionals p WHERE p.id = OLD.professional_id AND p.user_id = auth.uid()
  );

  -- Admins can do anything
  IF is_admin THEN
    RETURN NEW;
  END IF;

  -- Customers: can only set status to 'cancelled' (from 'requested' or 'confirmed')
  IF is_customer THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NEW.status != 'cancelled' OR OLD.status NOT IN ('requested', 'confirmed') THEN
        RAISE EXCEPTION 'Customers can only cancel requested or confirmed bookings';
      END IF;
    END IF;
    -- Customers cannot change payment_status or completed_at
    IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
      RAISE EXCEPTION 'Customers cannot change payment status';
    END IF;
    IF NEW.completed_at IS DISTINCT FROM OLD.completed_at THEN
      RAISE EXCEPTION 'Customers cannot change completed_at';
    END IF;
  END IF;

  -- Professionals: enforce valid status transitions
  IF is_professional THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      -- Allowed transitions for professionals
      IF NOT (
        (OLD.status = 'requested' AND NEW.status IN ('confirmed', 'cancelled')) OR
        (OLD.status = 'confirmed' AND NEW.status IN ('in_progress', 'cancelled')) OR
        (OLD.status = 'in_progress' AND NEW.status IN ('completed', 'cancelled'))
      ) THEN
        RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
      END IF;
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

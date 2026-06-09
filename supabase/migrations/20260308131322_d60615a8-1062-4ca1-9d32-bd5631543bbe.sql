
ALTER TABLE public.bookings 
ADD COLUMN payment_status text NOT NULL DEFAULT 'unpaid';

COMMENT ON COLUMN public.bookings.payment_status IS 'Payment status: unpaid, paid';

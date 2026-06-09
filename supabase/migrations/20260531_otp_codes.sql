-- Create OTP codes table
CREATE TABLE public.otp_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now() + interval '10 minutes',
    verified_at TIMESTAMP WITH TIME ZONE,
    attempts INTEGER DEFAULT 0,
    CONSTRAINT otp_not_expired CHECK (expires_at > now()),
    CONSTRAINT otp_max_attempts CHECK (attempts < 5)
);

-- Enable RLS on otp_codes
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- Allow service role to insert OTP codes
CREATE POLICY "Service role can manage OTP codes"
  ON public.otp_codes
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_otp_email_code ON public.otp_codes(email, code);
CREATE INDEX idx_otp_expires ON public.otp_codes(expires_at);

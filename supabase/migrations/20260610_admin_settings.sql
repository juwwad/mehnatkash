-- Create admin_settings table for platform configuration
CREATE TABLE public.admin_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    description TEXT,
    setting_type TEXT CHECK (setting_type IN ('string', 'number', 'boolean', 'json')) DEFAULT 'string',
    is_sensitive BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on admin_settings
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write admin settings
CREATE POLICY "Admins can manage admin settings" ON public.admin_settings
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- Service role can read settings (for backend operations)
CREATE POLICY "Service role can manage settings" ON public.admin_settings
    FOR ALL TO service_role
    USING (true);

-- Unauthenticated users can read non-sensitive settings
CREATE POLICY "Anyone can read public settings" ON public.admin_settings
    FOR SELECT
    USING (is_sensitive = false);

-- Insert default settings
INSERT INTO public.admin_settings (setting_key, setting_value, description, setting_type, is_sensitive) VALUES
('platform_name', 'MehnatKash', 'Platform name displayed across the app', 'string', false),
('commission_rate', '15', 'Commission percentage taken from completed bookings (0-100)', 'number', false),
('base_hourly_rate', '500', 'Default base hourly rate for new professionals (PKR)', 'number', false),
('min_rating_to_show', '0', 'Minimum rating to display professional on home (0-5)', 'number', false),
('auto_approve_professionals', 'false', 'Automatically approve new professional sign-ups', 'boolean', false),
('require_email_verification', 'false', 'Require email verification for sign-ups', 'boolean', false),
('maintenance_mode', 'false', 'Enable maintenance mode (blocks user access)', 'boolean', false),
('support_email', 'support@mehnatkash.com', 'Support email address', 'string', true),
('support_phone', '+923091234567', 'Support phone number', 'string', false),
('max_booking_distance_km', '50', 'Maximum distance for service delivery (km)', 'number', false),
('booking_timeout_minutes', '15', 'Time before booking expires if not accepted (minutes)', 'number', false),
('enable_push_notifications', 'true', 'Enable push notifications', 'boolean', false)
ON CONFLICT (setting_key) DO NOTHING;

-- Create function to update admin_settings updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_admin_settings_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Create trigger for updated_at
CREATE TRIGGER on_admin_settings_update
    BEFORE UPDATE ON public.admin_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_admin_settings_timestamp();

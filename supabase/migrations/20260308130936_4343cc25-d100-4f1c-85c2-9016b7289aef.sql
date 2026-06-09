
-- Use extensions for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.seed_test_professionals()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  test_users uuid[] := ARRAY[
    'a1000000-0000-0000-0000-000000000001'::uuid,
    'a1000000-0000-0000-0000-000000000002'::uuid,
    'a1000000-0000-0000-0000-000000000003'::uuid,
    'a1000000-0000-0000-0000-000000000004'::uuid,
    'a1000000-0000-0000-0000-000000000005'::uuid,
    'a1000000-0000-0000-0000-000000000006'::uuid,
    'a1000000-0000-0000-0000-000000000007'::uuid,
    'a1000000-0000-0000-0000-000000000008'::uuid
  ];
  test_names text[] := ARRAY['Ahmed Khan','Bilal Shah','Farhan Ali','Hassan Afridi','Imran Yousafzai','Junaid Mehsud','Kamran Wazir','Luqman Babar'];
  test_phones text[] := ARRAY['03001234567','03009876543','03451234567','03339876543','03211234567','03129876543','03001112233','03452223344'];
  test_emails text[] := ARRAY['ahmed@test.local','bilal@test.local','farhan@test.local','hassan@test.local','imran@test.local','junaid@test.local','kamran@test.local','luqman@test.local'];
  i int;
  uid uuid;
  pid uuid;
  sid uuid;
  stypes text[] := ARRAY['plumber','electrician','carpenter','painter','plumber','plumber','electrician','carpenter'];
  rates int[] := ARRAY[800,700,600,500,900,650,750,550];
  lats numeric[] := ARRAY[34.0120,34.0250,34.0050,34.0350,34.0180,34.0400,33.9980,34.0280];
  lngs numeric[] := ARRAY[71.5785,71.5400,71.5100,71.5600,71.5950,71.5300,71.5500,71.5150];
  avails boolean[] := ARRAY[true,true,true,false,true,true,true,true];
  rat numeric[] := ARRAY[4.7,4.5,4.8,4.2,4.9,4.3,4.6,4.4];
  rcounts int[] := ARRAY[23,18,31,12,45,9,27,15];
  bios text[] := ARRAY['Expert plumber with 10 years experience','Licensed electrician','Fine woodworking and furniture repair','Interior and exterior painting specialist','AC installation and repair','Affordable plumbing solutions','Solar panel installations','Custom furniture and renovation'];
BEGIN
  -- Insert services if missing
  INSERT INTO public.services (name, type, description, is_active) VALUES
    ('Carpenter', 'carpenter', 'Carpentry services', true),
    ('Painter', 'painter', 'Painting services', true),
    ('AC Technician', 'ac_technician', 'AC repair', true)
  ON CONFLICT DO NOTHING;

  FOR i IN 1..8 LOOP
    uid := test_users[i];
    
    -- Create auth user using extensions schema
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      test_emails[i],
      extensions.crypt('testpass123', extensions.gen_salt('bf')),
      now(), now(), now(), '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb
    )
    ON CONFLICT (id) DO NOTHING;

    -- Create profile
    INSERT INTO public.profiles (user_id, full_name, phone, user_type)
    VALUES (uid, test_names[i], test_phones[i], 'professional')
    ON CONFLICT DO NOTHING;

    SELECT id INTO pid FROM public.profiles WHERE user_id = uid LIMIT 1;
    SELECT id INTO sid FROM public.services WHERE type = stypes[i] LIMIT 1;

    INSERT INTO public.professionals (user_id, profile_id, service_id, hourly_rate, location_lat, location_lng, location_city, is_available, is_verified, rating, review_count, bio)
    VALUES (uid, pid, sid, rates[i], lats[i], lngs[i], 'Peshawar', avails[i], true, rat[i], rcounts[i], bios[i])
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;

SELECT public.seed_test_professionals();
DROP FUNCTION public.seed_test_professionals();

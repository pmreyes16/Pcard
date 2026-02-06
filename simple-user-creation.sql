-- Simple User Creation Script
-- Run this in Supabase SQL Editor to create a test user

-- Create the test user directly (preferred method)
-- This creates a user with confirmed email
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'pmreyes16@yahoo.com',
  crypt('testpassword123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{}'
) ON CONFLICT (email) DO NOTHING;

-- Get the user ID we just created
DO $$
DECLARE
    user_uuid uuid;
BEGIN
    SELECT id INTO user_uuid FROM auth.users WHERE email = 'pmreyes16@yahoo.com';
    
    -- Create user profile if it doesn't exist
    INSERT INTO user_profiles (id, email, created_at, updated_at)
    VALUES (user_uuid, 'pmreyes16@yahoo.com', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE 'User created with ID: %', user_uuid;
END $$;

-- Verify the user was created
SELECT 
    u.email,
    u.email_confirmed_at,
    u.created_at,
    up.id as profile_id
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.id
WHERE u.email = 'pmreyes16@yahoo.com';
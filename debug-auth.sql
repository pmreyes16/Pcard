-- Debug Authentication Issues
-- Run these queries in Supabase SQL Editor to check authentication setup

-- STEP 1: Create a test user for pmreyes16@yahoo.com
-- Go to Supabase Dashboard > Authentication > Users > Add User
-- Email: pmreyes16@yahoo.com
-- Password: testpassword123
-- Email Confirm: true (check this box)
-- Click "Create user"

-- OR use this function to create a user programmatically:
CREATE OR REPLACE FUNCTION create_test_user(user_email text, user_password text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id uuid;
  result json;
BEGIN
  -- Insert into auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    user_email,
    crypt(user_password, gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  ) RETURNING id INTO user_id;

  -- Create user profile
  INSERT INTO user_profiles (id, email, created_at, updated_at)
  VALUES (user_id, user_email, NOW(), NOW());

  result := json_build_object(
    'success', true,
    'user_id', user_id,
    'email', user_email,
    'message', 'User created successfully'
  );
  
  RETURN result;
EXCEPTION
  WHEN unique_violation THEN
    result := json_build_object(
      'success', false,
      'message', 'User with this email already exists'
    );
    RETURN result;
  WHEN OTHERS THEN
    result := json_build_object(
      'success', false,
      'message', 'Error creating user: ' || SQLERRM
    );
    RETURN result;
END;
$$;

-- Use the function to create the superadmin user
SELECT create_test_user('pmreyes16@yahoo.com', 'testpassword123');

-- Also create a regular test user if needed
-- SELECT create_test_user('test@example.com', 'testpassword123');

-- 1. Check if auth is properly configured
SELECT 
  raw_app_meta_data,
  raw_user_meta_data,
  email,
  email_confirmed_at,
  created_at,
  last_sign_in_at
FROM auth.users
ORDER BY created_at DESC;

-- 2. Check if there are any users
SELECT COUNT(*) as total_users FROM auth.users;

-- 3. Check user profiles table
SELECT 
  up.*,
  au.email,
  au.email_confirmed_at
FROM user_profiles up
LEFT JOIN auth.users au ON up.id = au.id
ORDER BY up.created_at DESC;

-- 4. Create a test user (if needed)
-- Note: This should be done through the Supabase dashboard or auth signup
-- INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, created_at, updated_at)
-- VALUES ('test@example.com', crypt('testpassword', gen_salt('bf')), NOW(), NOW(), NOW());

-- 5. Check RLS policies on user_profiles
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'user_profiles';

-- 6. Check RLS policies on business_cards
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'business_cards';

-- 7. Test if RLS is working properly
-- This should only return cards for the current user
SELECT * FROM business_cards LIMIT 5;
-- Create SuperAdmin User Script
-- Run this script in Supabase SQL Editor

-- First, ensure the create_test_user function exists
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

-- Create the superadmin user
SELECT create_test_user('pmreyes16@yahoo.com', 'testpassword123');

-- Verify the user was created
SELECT 
  u.email,
  u.email_confirmed_at,
  u.created_at,
  up.id as profile_id
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.id
WHERE u.email = 'pmreyes16@yahoo.com';

-- Show message about login
DO $$
BEGIN
  RAISE NOTICE 'SuperAdmin user created successfully!';
  RAISE NOTICE 'Email: pmreyes16@yahoo.com';
  RAISE NOTICE 'Password: testpassword123';
  RAISE NOTICE 'This user can now create new users through the User Management tab in the dashboard.';
END $$;
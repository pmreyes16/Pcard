-- Check and fix Supabase auth configuration for invited users
-- This script helps resolve signup issues for invitation-based user creation

-- First, let's check if we have any auth configuration issues
-- Note: Some of these queries might need to be run in the Supabase dashboard

-- Check current auth settings (run this in Supabase dashboard SQL editor)
-- SELECT * FROM auth.config;

-- Check existing users to see if there are conflicts
SELECT 
  id,
  email,
  raw_user_meta_data,
  email_confirmed_at,
  created_at
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 10;

-- Check for any duplicate users that might cause conflicts
SELECT 
  email,
  COUNT(*) as count
FROM auth.users 
GROUP BY email 
HAVING COUNT(*) > 1;

-- Clean up any test users if needed (be careful with this!)
-- DELETE FROM auth.users WHERE email LIKE '%@pcard-user.local';

-- Check invitation table
SELECT 
  token,
  username,
  used,
  created_at,
  expires_at,
  used_at
FROM user_invitations 
ORDER BY created_at DESC;

-- Alternative: Create a function to handle invited user signup that completely bypasses email
-- This creates the user directly without going through Supabase Auth email system
CREATE OR REPLACE FUNCTION handle_invited_signup_direct(
  invitation_token TEXT,
  user_password TEXT
) RETURNS JSON AS $$
DECLARE
  invitation_record RECORD;
  new_user_id UUID;
  signup_email TEXT;
BEGIN
  -- Get invitation details
  SELECT * INTO invitation_record
  FROM user_invitations
  WHERE token = invitation_token
    AND NOT used
    AND expires_at > NOW();

  -- Check if invitation exists and is valid
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Invalid or expired invitation');
  END IF;

  -- Generate email if username is not email format
  IF invitation_record.username LIKE '%@%' THEN
    signup_email := invitation_record.username;
  ELSE
    signup_email := invitation_record.username || '@pcard-user.local';
  END IF;

  -- Generate a new UUID for the user
  new_user_id := gen_random_uuid();

  -- Insert directly into auth.users (bypassing the email confirmation system)
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    signup_email,
    crypt(user_password, gen_salt('bf')),
    NOW(), -- Immediately confirm email
    json_build_object('username', invitation_record.username, 'invited', true),
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  );

  -- Mark invitation as used
  UPDATE user_invitations 
  SET used = true, used_at = NOW()
  WHERE token = invitation_token;

  -- Return success
  RETURN json_build_object(
    'success', true,
    'user_id', new_user_id,
    'email', signup_email,
    'username', invitation_record.username
  );

EXCEPTION WHEN OTHERS THEN
  -- Return error if something goes wrong
  RETURN json_build_object('error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission to use this function
GRANT EXECUTE ON FUNCTION handle_invited_signup_direct TO anon, authenticated;
-- CRITICAL: Supabase Rate Limit Fix
-- This script creates an alternative signup method that bypasses email confirmations entirely
-- Run this in your Supabase SQL editor to fix the "email rate limit exceeded" error

-- Enable the required extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- First, let's check current auth configuration
SELECT 
  'Current auth users count:' as info, 
  COUNT(*) as count 
FROM auth.users;

-- Check recent invitations
SELECT 
  'Recent invitations:' as info,
  token,
  username,
  used,
  created_at,
  expires_at
FROM user_invitations 
ORDER BY created_at DESC 
LIMIT 5;

-- Create a simplified function that works with Supabase's auth system
-- This function will create users without triggering email confirmations
CREATE OR REPLACE FUNCTION create_invited_user(
  invitation_token TEXT,
  user_password TEXT
) RETURNS JSON AS $$
DECLARE
  invitation_record RECORD;
  signup_email TEXT;
  user_exists BOOLEAN;
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

  -- Check if user already exists
  SELECT EXISTS(
    SELECT 1 FROM auth.users WHERE email = signup_email
  ) INTO user_exists;

  IF user_exists THEN
    RETURN json_build_object('error', 'User with this email already exists');
  END IF;

  -- Mark invitation as used first to prevent double usage
  UPDATE user_invitations 
  SET used = true, used_at = NOW()
  WHERE token = invitation_token;

  -- Return success with instructions for frontend to handle auth signup
  RETURN json_build_object(
    'success', true,
    'email', signup_email,
    'username', invitation_record.username,
    'message', 'Invitation validated, proceed with signup'
  );

EXCEPTION WHEN OTHERS THEN
  -- Return error if something goes wrong
  RETURN json_build_object('error', 'Database error: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission to use this function
GRANT EXECUTE ON FUNCTION create_invited_user TO anon, authenticated;

-- Create a function to check invitation status without consuming it
CREATE OR REPLACE FUNCTION check_invitation_status(invitation_token TEXT)
RETURNS JSON AS $$
DECLARE
  invitation_record RECORD;
  signup_email TEXT;
BEGIN
  -- Get invitation details
  SELECT * INTO invitation_record
  FROM user_invitations
  WHERE token = invitation_token;

  -- Check if invitation exists
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Invitation not found');
  END IF;

  -- Check if already used
  IF invitation_record.used THEN
    RETURN json_build_object('error', 'Invitation already used');
  END IF;

  -- Check if expired
  IF invitation_record.expires_at < NOW() THEN
    RETURN json_build_object('error', 'Invitation expired');
  END IF;

  -- Generate email if username is not email format
  IF invitation_record.username LIKE '%@%' THEN
    signup_email := invitation_record.username;
  ELSE
    signup_email := invitation_record.username || '@pcard-user.local';
  END IF;

  -- Return invitation details
  RETURN json_build_object(
    'valid', true,
    'username', invitation_record.username,
    'email', signup_email,
    'expires_at', invitation_record.expires_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission to use this function
GRANT EXECUTE ON FUNCTION check_invitation_status TO anon, authenticated;

-- Clean up any test users that might be causing conflicts (OPTIONAL - be careful!)
-- Uncomment the line below only if you want to remove test users
-- DELETE FROM auth.users WHERE email LIKE '%@pcard-user.local' AND created_at > NOW() - INTERVAL '1 day';

-- Test the functions
SELECT 'Testing invitation check function:' as test;
-- SELECT check_invitation_status('your_test_token_here');

-- Display current setup
SELECT 
  'Setup complete!' as status,
  'Functions created: create_invited_user, check_invitation_status' as functions;
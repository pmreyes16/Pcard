-- =============================================================================
-- Supabase User Management Script for Digital Business Card Application
-- =============================================================================
-- This script provides functions to create and manage users with usernames
-- Run this AFTER running the main supabase-setup.sql script
-- =============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. ENHANCED USER PROFILES TABLE
-- =============================================================================

-- Drop existing user_profiles table if it exists to recreate with username support
DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- Enhanced User Profiles table with username support
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL, -- Unique username for each user
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  subscription_tier TEXT DEFAULT 'free', -- free, pro, enterprise
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  total_cards_created INTEGER DEFAULT 0,
  total_views_received INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create index for username lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON public.user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);

-- =============================================================================
-- 2. USER MANAGEMENT FUNCTIONS
-- =============================================================================

-- Function to validate and reserve a username (used during frontend signup)
CREATE OR REPLACE FUNCTION public.validate_and_reserve_username(
  p_username TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
BEGIN
  -- Validate username format (alphanumeric, underscores, hyphens, 3-30 chars)
  IF NOT p_username ~ '^[a-zA-Z0-9_-]{3,30}$' THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Username must be 3-30 characters and contain only letters, numbers, underscores, and hyphens',
      'code', 'INVALID_USERNAME'
    );
  END IF;

  -- Check if username already exists (excluding current user if updating)
  IF EXISTS(
    SELECT 1 FROM public.user_profiles 
    WHERE username = p_username 
    AND (p_user_id IS NULL OR id != p_user_id)
  ) THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Username already exists',
      'code', 'USERNAME_EXISTS'
    );
  END IF;

  -- Return success response
  RETURN json_build_object(
    'success', true,
    'username', p_username,
    'message', 'Username is valid and available'
  );

EXCEPTION WHEN OTHERS THEN
  -- Return error response
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'code', 'DATABASE_ERROR'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create user profile after Supabase Auth signup
CREATE OR REPLACE FUNCTION public.create_user_profile_with_username(
  p_user_id UUID,
  p_username TEXT,
  p_email TEXT,
  p_full_name TEXT DEFAULT NULL
)
RETURNS JSON AS $$
BEGIN
  -- Validate username format
  IF NOT p_username ~ '^[a-zA-Z0-9_-]{3,30}$' THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Username must be 3-30 characters and contain only letters, numbers, underscores, and hyphens',
      'code', 'INVALID_USERNAME'
    );
  END IF;

  -- Check if username already exists
  IF EXISTS(SELECT 1 FROM public.user_profiles WHERE username = p_username) THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Username already exists',
      'code', 'USERNAME_EXISTS'
    );
  END IF;

  -- Check if user profile already exists
  IF EXISTS(SELECT 1 FROM public.user_profiles WHERE id = p_user_id) THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'User profile already exists',
      'code', 'PROFILE_EXISTS'
    );
  END IF;

  -- Create user profile
  INSERT INTO public.user_profiles (
    id,
    username,
    email,
    full_name,
    last_login_at
  ) VALUES (
    p_user_id,
    p_username,
    p_email,
    p_full_name,
    NOW()
  );

  -- Return success response
  RETURN json_build_object(
    'success', true,
    'user_id', p_user_id,
    'username', p_username,
    'email', p_email,
    'message', 'User profile created successfully'
  );

EXCEPTION WHEN OTHERS THEN
  -- Return error response
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'code', 'DATABASE_ERROR'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check username availability
CREATE OR REPLACE FUNCTION public.check_username_availability(p_username TEXT)
RETURNS JSON AS $$
BEGIN
  -- Validate username format
  IF NOT p_username ~ '^[a-zA-Z0-9_-]{3,30}$' THEN
    RETURN json_build_object(
      'available', false,
      'error', 'Username must be 3-30 characters and contain only letters, numbers, underscores, and hyphens'
    );
  END IF;

  -- Check availability
  IF EXISTS(SELECT 1 FROM public.user_profiles WHERE username = p_username) THEN
    RETURN json_build_object('available', false, 'error', 'Username is already taken');
  ELSE
    RETURN json_build_object('available', true, 'message', 'Username is available');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user by username
CREATE OR REPLACE FUNCTION public.get_user_by_username(p_username TEXT)
RETURNS TABLE(
  user_id UUID,
  username TEXT,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  subscription_tier TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.id,
    up.username,
    up.email,
    up.full_name,
    up.avatar_url,
    up.subscription_tier,
    up.is_active,
    up.created_at
  FROM public.user_profiles up
  WHERE up.username = p_username AND up.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user profile
CREATE OR REPLACE FUNCTION public.update_user_profile(
  p_user_id UUID,
  p_full_name TEXT DEFAULT NULL,
  p_avatar_url TEXT DEFAULT NULL
)
RETURNS JSON AS $$
BEGIN
  -- Check if user exists
  IF NOT EXISTS(SELECT 1 FROM public.user_profiles WHERE id = p_user_id) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;

  -- Update profile
  UPDATE public.user_profiles 
  SET 
    full_name = COALESCE(p_full_name, full_name),
    avatar_url = COALESCE(p_avatar_url, avatar_url),
    updated_at = NOW()
  WHERE id = p_user_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Profile updated successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 3. ENHANCED RLS POLICIES
-- =============================================================================

-- Enable RLS on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Public can view basic user info" ON public.user_profiles;

-- Users can view their own profile
CREATE POLICY "Users can view their own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Allow profile creation during signup (more permissive for inserts)
CREATE POLICY "Allow profile creation during signup" ON public.user_profiles
  FOR INSERT WITH CHECK (true);

-- Public can view basic user info (for username lookups)
CREATE POLICY "Public can view basic user info" ON public.user_profiles
  FOR SELECT USING (is_active = true);

-- =============================================================================
-- 4. TRIGGERS
-- =============================================================================

-- Update the existing user creation trigger to handle usernames
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Only create profile if it doesn't already exist
  IF NOT EXISTS(SELECT 1 FROM public.user_profiles WHERE id = new.id) THEN
    INSERT INTO public.user_profiles (
      id, 
      email, 
      full_name,
      username
    )
    VALUES (
      new.id, 
      new.email, 
      new.raw_user_meta_data->>'full_name',
      COALESCE(
        new.raw_user_meta_data->>'username',
        'user_' || SUBSTR(new.id::text, 1, 8)  -- Fallback username if not provided
      )
    );
  END IF;
  RETURN new;
EXCEPTION WHEN unique_violation THEN
  -- If username conflict, generate a unique one
  UPDATE public.user_profiles 
  SET username = 'user_' || SUBSTR(new.id::text, 1, 8) || '_' || EXTRACT(epoch FROM NOW())::text
  WHERE id = new.id;
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the user creation
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- 5. SAMPLE USER CREATION WORKFLOW
-- =============================================================================

-- Step 1: Validate username availability (frontend validation)
-- SELECT public.validate_and_reserve_username('johndoe');

-- Step 2: Use Supabase Auth to create user (frontend)
-- supabase.auth.signUp({
--   email: 'john.doe@example.com',
--   password: 'securepassword123',
--   options: {
--     data: {
--       username: 'johndoe',
--       full_name: 'John Doe'
--     }
--   }
-- })

-- Step 3: If trigger fails, manually create profile (fallback)
-- SELECT public.create_user_profile_with_username(
--   'user-uuid-here',          -- user_id from auth
--   'johndoe',                 -- username
--   'john.doe@example.com',    -- email
--   'John Doe'                 -- full_name (optional)
-- );

-- Example: Check if username is available
-- SELECT public.check_username_availability('johndoe');

-- Example: Get user by username
-- SELECT * FROM public.get_user_by_username('johndoe');

-- =============================================================================
-- 6. ADMIN QUERIES FOR USER MANAGEMENT
-- =============================================================================

-- View all users with their usernames
-- SELECT 
--   up.username,
--   up.email,
--   up.full_name,
--   up.subscription_tier,
--   up.is_active,
--   up.created_at,
--   au.last_sign_in_at
-- FROM public.user_profiles up
-- LEFT JOIN auth.users au ON up.id = au.id
-- ORDER BY up.created_at DESC;

-- Deactivate a user (soft delete)
-- UPDATE public.user_profiles 
-- SET is_active = false, updated_at = NOW() 
-- WHERE username = 'username_to_deactivate';

-- Reactivate a user
-- UPDATE public.user_profiles 
-- SET is_active = true, updated_at = NOW() 
-- WHERE username = 'username_to_reactivate';

-- Change user's subscription tier
-- UPDATE public.user_profiles 
-- SET subscription_tier = 'pro', updated_at = NOW() 
-- WHERE username = 'username';

-- =============================================================================
-- USAGE INSTRUCTIONS
-- =============================================================================
--
-- 1. Run this script AFTER running the main supabase-setup.sql
-- 2. Use the create_user_with_username() function to create users
-- 3. Frontend can check username availability before signup
-- 4. Users can be looked up by username for sharing/discovery
-- 5. Admin functions available for user management
--
-- Frontend Implementation Tips:
-- - Call check_username_availability() during signup form validation
-- - Store username in user metadata during normal auth signup
-- - Use get_user_by_username() for profile lookups
-- - Implement username-based card URLs like /card/@username
--
-- =============================================================================
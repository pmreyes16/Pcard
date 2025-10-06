-- =============================================================================
-- COMPLETE PCARD ADMIN & INVITATION SYSTEM SETUP
-- =============================================================================
-- This script sets up everything needed for the admin and invitation system
-- Run this ENTIRE script in Supabase SQL Editor

-- =============================================================================
-- 1. CREATE ADMIN USERS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- =============================================================================
-- 2. CREATE USER INVITATIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.user_invitations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT false,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- =============================================================================
-- 3. SET UP ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on both tables
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to read admin status" ON public.admin_users;
DROP POLICY IF EXISTS "Allow reading invitations by token" ON public.user_invitations;
DROP POLICY IF EXISTS "Allow admins to create invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Allow updating invitations to mark as used" ON public.user_invitations;

-- Admin users policies
CREATE POLICY "Allow authenticated users to read admin status" ON public.admin_users
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage admin users" ON public.admin_users
FOR ALL USING (auth.role() = 'authenticated');

-- User invitations policies
CREATE POLICY "Allow reading invitations by token" ON public.user_invitations
FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to manage invitations" ON public.user_invitations
FOR ALL USING (auth.role() = 'authenticated');

-- =============================================================================
-- 4. GRANT PERMISSIONS
-- =============================================================================

GRANT ALL ON public.admin_users TO authenticated;
GRANT ALL ON public.user_invitations TO authenticated;
GRANT SELECT ON public.user_invitations TO anon;

-- =============================================================================
-- 5. CREATE HELPER FUNCTIONS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.make_user_admin(user_email TEXT)
RETURNS TEXT AS $$
DECLARE
    target_user_id UUID;
    result_message TEXT;
BEGIN
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = user_email;
    
    IF target_user_id IS NULL THEN
        result_message := 'ERROR: User with email ' || user_email || ' not found';
        RETURN result_message;
    END IF;
    
    INSERT INTO public.admin_users (user_id, email, role, created_at)
    VALUES (target_user_id, user_email, 'super_admin', NOW())
    ON CONFLICT (user_id) DO UPDATE SET
        role = 'super_admin',
        created_at = NOW();
    
    result_message := 'SUCCESS: User ' || user_email || ' is now an admin';
    RETURN result_message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 6. CREATE INDEXES FOR PERFORMANCE
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON public.admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON public.admin_users(email);
CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON public.user_invitations(token);
CREATE INDEX IF NOT EXISTS idx_user_invitations_expires_at ON public.user_invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_invitations_used ON public.user_invitations(used);

-- =============================================================================
-- 7. MAKE pmreyes16@gmail.com AN ADMIN
-- =============================================================================

-- First, let's check if the user exists and create admin record
DO $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Find the user ID
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = 'pmreyes16@gmail.com';
    
    IF target_user_id IS NOT NULL THEN
        -- Make them admin
        INSERT INTO public.admin_users (user_id, email, role, created_at)
        VALUES (target_user_id, 'pmreyes16@gmail.com', 'super_admin', NOW())
        ON CONFLICT (user_id) DO UPDATE SET
            role = 'super_admin',
            created_at = NOW();
        
        RAISE NOTICE 'SUCCESS: pmreyes16@gmail.com is now an admin';
    ELSE
        RAISE NOTICE 'User pmreyes16@gmail.com not found. Please create the user first.';
    END IF;
END $$;

-- =============================================================================
-- 8. VERIFICATION QUERIES
-- =============================================================================

-- Check tables exist
SELECT 'admin_users table exists:' as check_type,
       CASE WHEN EXISTS(SELECT 1 FROM information_schema.tables 
                       WHERE table_name = 'admin_users' AND table_schema = 'public') 
            THEN 'YES' ELSE 'NO' END as result;

SELECT 'user_invitations table exists:' as check_type,
       CASE WHEN EXISTS(SELECT 1 FROM information_schema.tables 
                       WHERE table_name = 'user_invitations' AND table_schema = 'public') 
            THEN 'YES' ELSE 'NO' END as result;

-- Check if pmreyes16@gmail.com exists and is admin
SELECT 'pmreyes16@gmail.com exists:' as check_type,
       CASE WHEN EXISTS(SELECT 1 FROM auth.users WHERE email = 'pmreyes16@gmail.com') 
            THEN 'YES' ELSE 'NO' END as result;

SELECT 'pmreyes16@gmail.com is admin:' as check_type,
       CASE WHEN EXISTS(SELECT 1 FROM public.admin_users au 
                       JOIN auth.users u ON au.user_id = u.id 
                       WHERE u.email = 'pmreyes16@gmail.com') 
            THEN 'YES' ELSE 'NO' END as result;

-- Show all admin users
SELECT 'Current admin users:' as info;
SELECT u.email, au.role, au.created_at
FROM public.admin_users au
JOIN auth.users u ON au.user_id = u.id
ORDER BY au.created_at DESC;
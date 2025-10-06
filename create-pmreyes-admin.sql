-- =============================================================================
-- CREATE ADMIN USER: pmreyes16@gmail.com
-- =============================================================================
-- This script will create the admin user with your specific credentials
-- Run this in Supabase SQL Editor

-- First, ensure the admin system is set up
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Allow authenticated users to read admin status" ON public.admin_users
FOR SELECT USING (auth.role() = 'authenticated');

GRANT ALL ON public.admin_users TO authenticated;

-- Create the helper function
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
-- MANUAL STEPS FOR pmreyes16@gmail.com
-- =============================================================================

/*
STEP 1: Create the user manually in Supabase Dashboard
1. Go to Supabase Dashboard > Authentication > Users
2. Click "Create User"
3. Fill in:
   Email: pmreyes16@gmail.com
   Password: M@ch0gwapito
   Confirm Password: M@ch0gwapito
4. Click "Create User"

STEP 2: After creating the user, run this command:
*/

SELECT public.make_user_admin('pmreyes16@gmail.com');

/*
STEP 3: Verify the admin user was created:
*/

SELECT 
    u.id as user_id,
    u.email,
    au.role,
    au.created_at as admin_since
FROM auth.users u
JOIN public.admin_users au ON u.id = au.user_id
WHERE u.email = 'pmreyes16@gmail.com';

-- =============================================================================
-- BACKUP: Direct Insert (if the function doesn't work)
-- =============================================================================

/*
If the function above doesn't work, you can try this direct insert after creating the user:
*/

INSERT INTO public.admin_users (user_id, email, role, created_at)
SELECT id, 'pmreyes16@gmail.com', 'super_admin', NOW()
FROM auth.users 
WHERE email = 'pmreyes16@gmail.com'
AND NOT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.users.id
);

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Check if user exists in auth.users
SELECT 'User exists in auth.users:' as check_type, 
       CASE WHEN EXISTS(SELECT 1 FROM auth.users WHERE email = 'pmreyes16@gmail.com') 
            THEN 'YES' ELSE 'NO' END as result;

-- Check if user is in admin_users table
SELECT 'User is admin:' as check_type,
       CASE WHEN EXISTS(SELECT 1 FROM public.admin_users au 
                       JOIN auth.users u ON au.user_id = u.id 
                       WHERE u.email = 'pmreyes16@gmail.com') 
            THEN 'YES' ELSE 'NO' END as result;

-- Show all admin users
SELECT 'All admin users:' as info;
SELECT u.email, au.role, au.created_at
FROM public.admin_users au
JOIN auth.users u ON au.user_id = u.id
ORDER BY au.created_at DESC;
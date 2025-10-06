-- =============================================================================
-- STEP 1: CREATE ADMIN TABLES AND FUNCTIONS
-- =============================================================================
-- Run this first to set up the admin system

-- First, let's create a proper admin roles table for better admin management
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS on admin_users table
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Policy: Only authenticated users can read admin status (for admin checks)
CREATE POLICY "Allow authenticated users to read admin status" ON public.admin_users
FOR SELECT USING (auth.role() = 'authenticated');

-- Policy: Only existing admins can manage admin users
CREATE POLICY "Allow admins to manage admin users" ON public.admin_users
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  )
);

-- Grant permissions
GRANT ALL ON public.admin_users TO authenticated;

-- Function to check if a user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.admin_users au
        JOIN auth.users u ON au.user_id = u.id
        WHERE u.email = user_email
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to make an existing user an admin
CREATE OR REPLACE FUNCTION public.make_user_admin(user_email TEXT, admin_role TEXT DEFAULT 'admin')
RETURNS BOOLEAN AS $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Find the user ID by email
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = user_email;
    
    IF target_user_id IS NULL THEN
        RAISE NOTICE 'User with email % not found', user_email;
        RETURN FALSE;
    END IF;
    
    -- Add to admin_users table
    INSERT INTO public.admin_users (user_id, email, role, created_at)
    VALUES (target_user_id, user_email, admin_role, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
        role = admin_role,
        created_at = NOW();
    
    RAISE NOTICE 'User % is now an admin with role %', user_email, admin_role;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- STEP 2: MANUAL ADMIN USER CREATION
-- =============================================================================
-- Since Supabase restricts direct auth.users insertion, follow these steps:

/*
MANUAL STEPS TO CREATE ADMIN USER:

1. Go to Supabase Dashboard > Authentication > Users
2. Click "Create User"
3. Fill in:
   - Email: admin@pcard.com (or your preferred admin email)
   - Password: AdminPass123! (or your preferred password)
   - Confirm Password: AdminPass123!
4. Click "Create User"
5. Copy the User ID from the created user
6. Come back here and run the query below with the User ID

AFTER CREATING THE USER MANUALLY, RUN THIS:
(Replace 'PASTE_USER_ID_HERE' with the actual User ID)
*/

-- Replace 'PASTE_USER_ID_HERE' with the User ID from Supabase Dashboard
-- SELECT public.make_user_admin('admin@pcard.com', 'super_admin');

-- OR if you have the User ID, use this direct insert:
-- INSERT INTO public.admin_users (user_id, email, role, created_at)
-- VALUES (
--     'PASTE_USER_ID_HERE', -- Replace with actual User ID
--     'admin@pcard.com',     -- Replace with actual email
--     'super_admin',
--     NOW()
-- );

-- =============================================================================
-- USAGE EXAMPLES
-- =============================================================================

-- Check if a user is admin:
-- SELECT public.is_admin('admin@pcard.com');

-- Make an existing user an admin:
-- SELECT public.make_user_admin('someone@example.com', 'admin');

-- View all admin users:
-- SELECT au.*, u.email, u.created_at as user_created_at 
-- FROM public.admin_users au 
-- JOIN auth.users u ON au.user_id = u.id;

-- =============================================================================
-- CLEANUP (if needed)
-- =============================================================================

-- To remove admin status from a user:
-- DELETE FROM public.admin_users WHERE email = 'user@example.com';

-- To completely remove the admin system:
-- DROP TABLE IF EXISTS public.admin_users CASCADE;
-- DROP FUNCTION IF EXISTS public.is_admin(TEXT);
-- DROP FUNCTION IF EXISTS public.make_user_admin(TEXT, TEXT);
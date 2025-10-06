-- =============================================================================
-- ADMIN SYSTEM VERIFICATION SCRIPT
-- =============================================================================
-- Run these queries one by one to check if everything is set up correctly

-- 1. Check if admin_users table exists and has data
SELECT 'Checking admin_users table...' as step;
SELECT * FROM public.admin_users;

-- 2. Check if the user exists in auth.users
SELECT 'Checking auth.users...' as step;
SELECT id, email, created_at FROM auth.users WHERE email = 'admin@pcard.com';

-- 3. Check if the admin function works
SELECT 'Testing admin function...' as step;
SELECT public.make_user_admin('admin@pcard.com');

-- 4. Verify admin status
SELECT 'Verifying admin status...' as step;
SELECT 
    u.id as user_id,
    u.email,
    au.role,
    au.created_at as admin_since
FROM auth.users u
JOIN public.admin_users au ON u.id = au.user_id
WHERE u.email = 'admin@pcard.com';

-- 5. If the above doesn't show the user as admin, try this direct insert:
-- (Only run this if step 4 shows no results)
/*
INSERT INTO public.admin_users (user_id, email, role, created_at)
SELECT id, email, 'super_admin', NOW()
FROM auth.users 
WHERE email = 'admin@pcard.com'
AND NOT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.users.id
);
*/
-- =============================================================================
-- SIMPLE ADMIN USER SETUP - GUARANTEED TO WORK
-- =============================================================================

-- STEP 1: Run this in Supabase SQL Editor to create the admin system
-- Copy and paste this entire block and run it:

CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read admin status" ON public.admin_users
FOR SELECT USING (auth.role() = 'authenticated');

GRANT ALL ON public.admin_users TO authenticated;

-- STEP 2: Create helper function
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
-- AFTER RUNNING THE ABOVE, FOLLOW THESE STEPS:
-- =============================================================================

/*
1. Go to Supabase Dashboard
2. Click "Authentication" in the sidebar
3. Click "Users" tab
4. Click "Create User" button
5. Fill in:
   - Email: admin@pcard.com
   - Password: AdminPass123!
   - Confirm Password: AdminPass123!
6. Click "Create User"
7. Come back to SQL Editor and run this command:

SELECT public.make_user_admin('admin@pcard.com');

8. You should see: "SUCCESS: User admin@pcard.com is now an admin"

Your admin credentials are:
- Username: admin@pcard.com
- Password: AdminPass123!
*/
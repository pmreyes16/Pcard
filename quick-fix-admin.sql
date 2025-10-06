-- QUICK FIX: Run this in Supabase SQL Editor to fix the admin system
-- This will create the missing tables and make pmreyes16@gmail.com an admin

-- 1. Create admin_users table
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 2. Create user_invitations table
CREATE TABLE IF NOT EXISTS public.user_invitations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT false,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 3. Enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- 4. Create policies (drop existing ones first)
DROP POLICY IF EXISTS "Allow authenticated users to read admin status" ON public.admin_users;
DROP POLICY IF EXISTS "Allow authenticated users to manage admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Allow reading invitations by token" ON public.user_invitations;
DROP POLICY IF EXISTS "Allow authenticated users to manage invitations" ON public.user_invitations;

CREATE POLICY "Allow authenticated users to read admin status" ON public.admin_users
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage admin users" ON public.admin_users
FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow reading invitations by token" ON public.user_invitations
FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to manage invitations" ON public.user_invitations
FOR ALL USING (auth.role() = 'authenticated');

-- 5. Grant permissions
GRANT ALL ON public.admin_users TO authenticated;
GRANT ALL ON public.user_invitations TO authenticated;
GRANT SELECT ON public.user_invitations TO anon;

-- 6. Make pmreyes16@gmail.com an admin
INSERT INTO public.admin_users (user_id, email, role, created_at)
SELECT 'e6c893ee-d039-4ba6-b8d6-d9dd0a91b0a1', 'pmreyes16@gmail.com', 'super_admin', NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = 'e6c893ee-d039-4ba6-b8d6-d9dd0a91b0a1'
);

-- 7. Verify setup
SELECT 'Setup complete! pmreyes16@gmail.com should now be admin.' AS status;
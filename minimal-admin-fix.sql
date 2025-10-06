-- MINIMAL FIX: Just create the admin_users table with basic setup

-- Create admin_users table
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID,
  email TEXT,
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert your admin record directly
INSERT INTO public.admin_users (user_id, email, role)
VALUES ('e6c893ee-d039-4ba6-b8d6-d9dd0a91b0a1', 'pmreyes16@gmail.com', 'super_admin')
ON CONFLICT DO NOTHING;

-- Grant basic permissions
GRANT ALL ON public.admin_users TO authenticated;

-- Check if it worked
SELECT * FROM public.admin_users WHERE email = 'pmreyes16@gmail.com';
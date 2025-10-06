-- User Invitations System
-- Add this to your existing Supabase setup

-- User Invitations table
CREATE TABLE IF NOT EXISTS public.user_invitations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  password TEXT NOT NULL, -- In production, consider hashing this
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT false,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL -- Optional: track who created the invitation
);

-- Index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON public.user_invitations(token);
CREATE INDEX IF NOT EXISTS idx_user_invitations_expires_at ON public.user_invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_invitations_used ON public.user_invitations(used);

-- RLS Policies for user_invitations table
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Allow reading invitations by token for validation (public access needed for invite flow)
CREATE POLICY "Allow reading invitations by token" ON public.user_invitations
FOR SELECT USING (true); -- Public read access for invitation validation

-- Policy: Allow admins to insert invitations
CREATE POLICY "Allow admins to create invitations" ON public.user_invitations
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' 
  -- Add additional admin checks here if needed
);

-- Policy: Allow updating invitations to mark as used
CREATE POLICY "Allow updating invitations to mark as used" ON public.user_invitations
FOR UPDATE USING (true) WITH CHECK (true); -- Allow updates for marking as used

-- Policy: Allow admins to view all invitations
CREATE POLICY "Allow admins to view invitations" ON public.user_invitations
FOR SELECT USING (
  auth.role() = 'authenticated'
  -- Add additional admin checks here if needed
);

-- Grant necessary permissions
GRANT ALL ON public.user_invitations TO authenticated;
GRANT SELECT ON public.user_invitations TO anon; -- Allow anonymous access for invitation validation
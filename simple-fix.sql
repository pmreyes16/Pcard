-- Simple fix for RLS and basic operations
-- Run this to fix the 404 errors without custom functions

-- Ensure RLS is enabled on business_cards
ALTER TABLE public.business_cards ENABLE ROW LEVEL SECURITY;

-- Drop and recreate simple RLS policies
DROP POLICY IF EXISTS "Users can view their own cards" ON public.business_cards;
DROP POLICY IF EXISTS "Users can create their own cards" ON public.business_cards;
DROP POLICY IF EXISTS "Users can update their own cards" ON public.business_cards;
DROP POLICY IF EXISTS "Users can delete their own cards" ON public.business_cards;
DROP POLICY IF EXISTS "Public cards are viewable by everyone" ON public.business_cards;

-- Simple RLS policies
CREATE POLICY "Users can manage their own cards" ON public.business_cards
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Public cards are viewable" ON public.business_cards
    FOR SELECT USING (is_public = true);

-- Grant basic permissions
GRANT ALL ON public.business_cards TO authenticated;
GRANT SELECT ON public.business_cards TO anon;

-- Storage bucket policies
DROP POLICY IF EXISTS "Users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view files" ON storage.objects;

CREATE POLICY "Authenticated users can upload" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'business-cards' AND
        auth.role() = 'authenticated'
    );

CREATE POLICY "Anyone can view files" ON storage.objects
    FOR SELECT USING (bucket_id = 'business-cards');

-- Ensure bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'business-cards',
    'business-cards',
    true,
    10485760,
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/heic']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/heic'];
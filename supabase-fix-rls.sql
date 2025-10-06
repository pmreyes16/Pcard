-- =============================================================================
-- FIX SCRIPT FOR SUPABASE RLS AND STORAGE ISSUES
-- =============================================================================
-- Run this script to fix the 406 and 400 errors you're experiencing
-- =============================================================================

-- First, let's fix the business_cards table RLS policies
-- Drop existing policies that might be causing issues
DROP POLICY IF EXISTS "Users can view their own cards" ON public.business_cards;
DROP POLICY IF EXISTS "Users can create their own cards" ON public.business_cards;
DROP POLICY IF EXISTS "Users can update their own cards" ON public.business_cards;
DROP POLICY IF EXISTS "Users can delete their own cards" ON public.business_cards;
DROP POLICY IF EXISTS "Public cards are viewable by everyone" ON public.business_cards;

-- Recreate business_cards policies with better logic
CREATE POLICY "Enable read access for own cards" ON public.business_cards
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Enable insert for authenticated users" ON public.business_cards
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for users based on user_id" ON public.business_cards
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable delete for users based on user_id" ON public.business_cards
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Enable read access for public cards" ON public.business_cards
    FOR SELECT USING (is_public = true);

-- Fix storage bucket policies
-- First, remove existing storage policies that might conflict
DROP POLICY IF EXISTS "Users can upload their own business card assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can view business card assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own business card assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own business card assets" ON storage.objects;

-- Create proper storage policies
CREATE POLICY "Enable upload for authenticated users" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'business-cards' AND
        auth.role() = 'authenticated'
    );

CREATE POLICY "Enable read access for all users" ON storage.objects
    FOR SELECT USING (bucket_id = 'business-cards');

CREATE POLICY "Enable update for own files" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'business-cards' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Enable delete for own files" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'business-cards' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Ensure storage bucket exists and is properly configured
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'business-cards',
    'business-cards',
    true,
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/heic']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/heic'];

-- Fix user_profiles policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow profile creation during signup" ON public.user_profiles;
DROP POLICY IF EXISTS "Public can view basic user info" ON public.user_profiles;

-- Only recreate if user_profiles table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
        -- Recreate user_profiles policies
        CREATE POLICY "Enable read access for own profile" ON public.user_profiles
            FOR SELECT USING (auth.uid() = id);

        CREATE POLICY "Enable update for own profile" ON public.user_profiles
            FOR UPDATE USING (auth.uid() = id)
            WITH CHECK (auth.uid() = id);

        CREATE POLICY "Enable insert for authenticated users" ON public.user_profiles
            FOR INSERT WITH CHECK (auth.uid() = id);

        CREATE POLICY "Enable read access for public profiles" ON public.user_profiles
            FOR SELECT USING (is_active = true);
    END IF;
END $$;

-- Add helpful utility function to check user permissions
CREATE OR REPLACE FUNCTION public.check_user_permissions()
RETURNS TABLE(
    user_id UUID,
    user_email TEXT,
    can_insert_cards BOOLEAN,
    can_upload_files BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        auth.uid() as user_id,
        (SELECT email FROM auth.users WHERE id = auth.uid()) as user_email,
        (auth.uid() IS NOT NULL) as can_insert_cards,
        (auth.role() = 'authenticated') as can_upload_files;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test query to verify setup
-- SELECT * FROM public.check_user_permissions();

-- =============================================================================
-- GRANT NECESSARY PERMISSIONS
-- =============================================================================

-- Grant usage on public schema
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant permissions on business_cards table
GRANT ALL ON public.business_cards TO authenticated;
GRANT SELECT ON public.business_cards TO anon;

-- Grant permissions on user_profiles table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
        GRANT ALL ON public.user_profiles TO authenticated;
        GRANT SELECT ON public.user_profiles TO anon;
    END IF;
END $$;

-- Grant permissions on storage
GRANT ALL ON storage.objects TO authenticated;
GRANT SELECT ON storage.objects TO anon;

-- Ensure unique constraint on business_cards.user_id for proper upserts
DO $$
BEGIN
    -- First check if the table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'business_cards' AND table_schema = 'public') THEN
        -- Drop existing constraint if it exists
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'business_cards_user_id_unique' 
            AND table_name = 'business_cards'
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE public.business_cards DROP CONSTRAINT business_cards_user_id_unique;
        END IF;
        
        -- Check if constraint already exists with different name
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_type = 'UNIQUE'
            AND table_name = 'business_cards'
            AND table_schema = 'public'
        ) THEN
            -- Create unique constraint on user_id (one card per user)
            ALTER TABLE public.business_cards 
            ADD CONSTRAINT business_cards_user_id_unique UNIQUE (user_id);
            RAISE NOTICE 'Added unique constraint on user_id';
        ELSE
            RAISE NOTICE 'Unique constraint already exists on business_cards';
        END IF;
    ELSE
        RAISE NOTICE 'business_cards table does not exist';
    END IF;
EXCEPTION WHEN duplicate_table THEN
    -- Constraint already exists, ignore
    RAISE NOTICE 'Constraint already exists';
EXCEPTION WHEN others THEN
    -- Log the error but continue
    RAISE NOTICE 'Could not add unique constraint: %', SQLERRM;
END $$;

-- Alternative approach: Use INSERT ... ON CONFLICT instead of upsert
-- Create a helper function for safe card creation/update
CREATE OR REPLACE FUNCTION public.save_business_card(
    p_user_id UUID,
    p_data JSONB
)
RETURNS JSON AS $$
DECLARE
    result_data JSON;
BEGIN
    -- Try to update existing record first
    UPDATE public.business_cards 
    SET 
        full_name = COALESCE(p_data->>'full_name', full_name),
        email = COALESCE(p_data->>'email', email),
        mobile_phone = COALESCE(p_data->>'mobile_phone', mobile_phone),
        company = COALESCE(p_data->>'company', company),
        job_title = COALESCE(p_data->>'job_title', job_title),
        address = COALESCE(p_data->>'address', address),
        website = COALESCE(p_data->>'website', website),
        linkedin_url = COALESCE(p_data->>'linkedin_url', linkedin_url),
        twitter_url = COALESCE(p_data->>'twitter_url', twitter_url),
        instagram_url = COALESCE(p_data->>'instagram_url', instagram_url),
        facebook_url = COALESCE(p_data->>'facebook_url', facebook_url),
        profile_picture_url = COALESCE(p_data->>'profile_picture_url', profile_picture_url),
        bio = COALESCE(p_data->>'bio', bio),
        theme_color = COALESCE(p_data->>'theme_color', theme_color),
        is_public = COALESCE((p_data->>'is_public')::boolean, is_public),
        slug = COALESCE(p_data->>'slug', slug),
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- If no rows were updated, insert a new record
    IF NOT FOUND THEN
        INSERT INTO public.business_cards (
            user_id, full_name, email, mobile_phone, company, job_title,
            address, website, linkedin_url, twitter_url, instagram_url,
            facebook_url, profile_picture_url, bio, theme_color, is_public, slug,
            created_at, updated_at
        ) VALUES (
            p_user_id,
            p_data->>'full_name',
            p_data->>'email',
            p_data->>'mobile_phone',
            p_data->>'company',
            p_data->>'job_title',
            p_data->>'address',
            p_data->>'website',
            p_data->>'linkedin_url',
            p_data->>'twitter_url',
            p_data->>'instagram_url',
            p_data->>'facebook_url',
            p_data->>'profile_picture_url',
            p_data->>'bio',
            COALESCE(p_data->>'theme_color', '#3B82F6'),
            COALESCE((p_data->>'is_public')::boolean, true),
            p_data->>'slug',
            NOW(),
            NOW()
        );
    END IF;
    
    -- Return the updated/inserted record
    SELECT json_build_object(
        'success', true,
        'message', 'Business card saved successfully'
    ) INTO result_data;
    
    RETURN result_data;
EXCEPTION WHEN others THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- HELPFUL DEBUG QUERIES
-- =============================================================================

-- Check current user and permissions
-- SELECT auth.uid(), auth.role();

-- Check if business_cards table exists and has data
-- SELECT COUNT(*) FROM public.business_cards;

-- Check storage bucket configuration
-- SELECT * FROM storage.buckets WHERE id = 'business-cards';

-- Check RLS policies
-- SELECT schemaname, tablename, policyname, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename IN ('business_cards', 'user_profiles');

-- =============================================================================
-- NOTES
-- =============================================================================
-- After running this script:
-- 1. The 406 errors should be resolved
-- 2. File uploads should work (including HEIC files)
-- 3. RLS policies will be properly configured
-- 4. You can test with: SELECT * FROM public.check_user_permissions();
-- =============================================================================
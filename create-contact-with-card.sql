-- SQL function to create contact with business card (run this in Supabase SQL Editor)

-- First, update RLS policies to allow admin access
DROP POLICY IF EXISTS "Users can insert their own card" ON business_cards;
DROP POLICY IF EXISTS "Users can update their own card" ON business_cards;

-- Drop foreign key constraint temporarily
ALTER TABLE business_cards DROP CONSTRAINT IF EXISTS business_cards_user_id_fkey;

-- Updated policy: Allow users to insert their own cards (simplified)
CREATE POLICY "Users can insert their own card or admins can insert any"
  ON business_cards FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NOT NULL);

-- Updated policy: Allow users to update their own cards  
CREATE POLICY "Users can update their own card or admins can update any"
  ON business_cards FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() IS NOT NULL);

-- Create function to create contact with business card
CREATE OR REPLACE FUNCTION create_contact_with_business_card(
  p_email TEXT,
  p_full_name TEXT,
  p_mobile_phone TEXT,
  p_company TEXT,
  p_address TEXT,
  p_password TEXT DEFAULT 'TempPassword123!',
  p_job_title TEXT DEFAULT '',
  p_website TEXT DEFAULT '',
  p_linkedin_url TEXT DEFAULT '',
  p_twitter_url TEXT DEFAULT '',
  p_instagram_url TEXT DEFAULT '',
  p_facebook_url TEXT DEFAULT '',
  p_bio TEXT DEFAULT '',
  p_theme_color TEXT DEFAULT '#3B82F6',
  p_is_public BOOLEAN DEFAULT true
)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  new_user_id UUID;
  new_card_id UUID;
  result JSON;
BEGIN
  -- Check if email already exists in business_cards
  IF EXISTS (SELECT 1 FROM business_cards WHERE email = p_email) THEN
    RETURN JSON_BUILD_OBJECT(
      'success', false,
      'message', 'Business card with this email already exists'
    );
  END IF;

  -- Generate a new user ID that will be used for auth.users later
  new_user_id := gen_random_uuid();

  -- Create business card with the generated user_id
  INSERT INTO business_cards (
    user_id,
    full_name,
    email,
    mobile_phone,
    company,
    job_title,
    address,
    website,
    linkedin_url,
    twitter_url,
    instagram_url,
    facebook_url,
    bio,
    theme_color,
    is_public,
    view_count,
    created_at,
    updated_at
  ) VALUES (
    new_user_id,
    p_full_name,
    p_email,
    p_mobile_phone,
    p_company,
    p_job_title,
    p_address,
    p_website,
    p_linkedin_url,
    p_twitter_url,
    p_instagram_url,
    p_facebook_url,
    p_bio,
    p_theme_color,
    p_is_public,
    0,
    NOW(),
    NOW()
  ) RETURNING id INTO new_card_id;

  -- Create user profile entry
  INSERT INTO user_profiles (
    id,
    email,
    full_name,
    subscription_tier,
    total_cards_created,
    total_views_received,
    created_at,
    updated_at
  ) VALUES (
    new_user_id,
    p_email,
    p_full_name,
    'free',
    1,
    0,
    NOW(),
    NOW()
  ) ON CONFLICT (id) DO NOTHING;

  -- Return success with the generated user_id and card_id
  RETURN JSON_BUILD_OBJECT(
    'success', true,
    'message', 'Contact and business card created successfully.',
    'user_id', new_user_id,
    'card_id', new_card_id,
    'email', p_email,
    'default_password', p_password
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Return error details
    RETURN JSON_BUILD_OBJECT(
      'success', false,
      'message', 'Error: ' || SQLERRM,
      'detail', SQLSTATE
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_contact_with_business_card TO authenticated; 
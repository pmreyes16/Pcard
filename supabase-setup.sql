-- =============================================================================
-- Supabase Setup Script for Digital Business Card Application
-- =============================================================================
-- Run this script in your Supabase SQL Editor to set up all necessary tables,
-- storage buckets, and Row Level Security (RLS) policies
-- =============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. STORAGE BUCKETS
-- =============================================================================

-- Create storage bucket for business card assets (profile pictures, logos, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'business-cards',
  'business-cards',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
);

-- =============================================================================
-- 2. TABLES
-- =============================================================================

-- Business Cards table
CREATE TABLE IF NOT EXISTS public.business_cards (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  mobile_phone TEXT,
  company TEXT,
  job_title TEXT,
  address TEXT,
  website TEXT,
  linkedin_url TEXT,
  twitter_url TEXT,
  instagram_url TEXT,
  facebook_url TEXT,
  profile_picture_url TEXT,
  company_logo_url TEXT,
  bio TEXT,
  theme_color TEXT DEFAULT '#3B82F6',
  is_public BOOLEAN DEFAULT true,
  slug TEXT UNIQUE, -- For public URLs like /card/john-doe
  qr_code_url TEXT,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Card Views table (analytics)
CREATE TABLE IF NOT EXISTS public.card_views (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  card_id UUID REFERENCES public.business_cards(id) ON DELETE CASCADE NOT NULL,
  viewer_ip TEXT,
  viewer_user_agent TEXT,
  referrer TEXT,
  country TEXT,
  city TEXT,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Card Contacts table (for people who save/contact the card owner)
CREATE TABLE IF NOT EXISTS public.card_contacts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  card_id UUID REFERENCES public.business_cards(id) ON DELETE CASCADE NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  message TEXT,
  is_saved BOOLEAN DEFAULT false,
  contacted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- User Profiles table (extended user information)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  subscription_tier TEXT DEFAULT 'free', -- free, pro, enterprise
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  total_cards_created INTEGER DEFAULT 0,
  total_views_received INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Card Templates table (predefined templates)
CREATE TABLE IF NOT EXISTS public.card_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  preview_image_url TEXT,
  template_data JSONB NOT NULL, -- Stores template configuration
  is_premium BOOLEAN DEFAULT false,
  category TEXT DEFAULT 'business',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Card Shares table (track sharing actions)
CREATE TABLE IF NOT EXISTS public.card_shares (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  card_id UUID REFERENCES public.business_cards(id) ON DELETE CASCADE NOT NULL,
  share_method TEXT NOT NULL, -- 'email', 'sms', 'social', 'qr', 'link'
  shared_to TEXT, -- email or phone number if applicable
  shared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- =============================================================================
-- 3. INDEXES FOR PERFORMANCE
-- =============================================================================

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_business_cards_user_id ON public.business_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_business_cards_slug ON public.business_cards(slug);
CREATE INDEX IF NOT EXISTS idx_business_cards_is_public ON public.business_cards(is_public);
CREATE INDEX IF NOT EXISTS idx_card_views_card_id ON public.card_views(card_id);
CREATE INDEX IF NOT EXISTS idx_card_views_viewed_at ON public.card_views(viewed_at);
CREATE INDEX IF NOT EXISTS idx_card_contacts_card_id ON public.card_contacts(card_id);
CREATE INDEX IF NOT EXISTS idx_card_shares_card_id ON public.card_shares(card_id);

-- =============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.business_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_shares ENABLE ROW LEVEL SECURITY;

-- Business Cards policies
CREATE POLICY "Users can view their own cards" ON public.business_cards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own cards" ON public.business_cards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cards" ON public.business_cards
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cards" ON public.business_cards
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Public cards are viewable by everyone" ON public.business_cards
  FOR SELECT USING (is_public = true);

-- Card Views policies (anyone can insert, users can view their card's analytics)
CREATE POLICY "Anyone can record card views" ON public.card_views
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Card owners can view their analytics" ON public.card_views
  FOR SELECT USING (
    card_id IN (
      SELECT id FROM public.business_cards WHERE user_id = auth.uid()
    )
  );

-- Card Contacts policies
CREATE POLICY "Anyone can contact card owners" ON public.card_contacts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Card owners can view their contacts" ON public.card_contacts
  FOR SELECT USING (
    card_id IN (
      SELECT id FROM public.business_cards WHERE user_id = auth.uid()
    )
  );

-- User Profiles policies
CREATE POLICY "Users can view their own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Card Templates policies (everyone can read, only admins can modify)
CREATE POLICY "Everyone can view card templates" ON public.card_templates
  FOR SELECT USING (true);

-- Card Shares policies
CREATE POLICY "Users can track shares of their own cards" ON public.card_shares
  FOR ALL USING (
    card_id IN (
      SELECT id FROM public.business_cards WHERE user_id = auth.uid()
    )
  );

-- =============================================================================
-- 5. STORAGE POLICIES
-- =============================================================================

-- Storage policies for business-cards bucket
CREATE POLICY "Users can upload their own business card assets" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'business-cards' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view business card assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'business-cards');

CREATE POLICY "Users can update their own business card assets" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'business-cards' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own business card assets" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'business-cards' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- =============================================================================
-- 6. FUNCTIONS AND TRIGGERS
-- =============================================================================

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE OR REPLACE TRIGGER update_business_cards_updated_at
  BEFORE UPDATE ON public.business_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate unique slug
CREATE OR REPLACE FUNCTION public.generate_unique_slug(input_name TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Create base slug from name
  base_slug := lower(regexp_replace(input_name, '[^a-zA-Z0-9\s]', '', 'g'));
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  
  final_slug := base_slug;
  
  -- Check if slug exists and increment if needed
  WHILE EXISTS(SELECT 1 FROM public.business_cards WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter::text;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Function to increment view count
CREATE OR REPLACE FUNCTION public.increment_card_views(card_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.business_cards 
  SET view_count = view_count + 1 
  WHERE id = card_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 7. SAMPLE DATA (OPTIONAL)
-- =============================================================================

-- Insert some sample card templates
INSERT INTO public.card_templates (name, description, preview_image_url, template_data, category) VALUES
('Modern Professional', 'Clean and modern design perfect for professionals', '/templates/modern-professional.png', '{"theme": "modern", "colors": {"primary": "#3B82F6", "secondary": "#1F2937"}, "layout": "vertical"}', 'business'),
('Creative Designer', 'Bold and creative template for designers and artists', '/templates/creative-designer.png', '{"theme": "creative", "colors": {"primary": "#8B5CF6", "secondary": "#EC4899"}, "layout": "horizontal"}', 'creative'),
('Corporate Executive', 'Professional template for corporate executives', '/templates/corporate-executive.png', '{"theme": "corporate", "colors": {"primary": "#1F2937", "secondary": "#6B7280"}, "layout": "vertical"}', 'business'),
('Startup Founder', 'Dynamic template perfect for entrepreneurs', '/templates/startup-founder.png', '{"theme": "startup", "colors": {"primary": "#10B981", "secondary": "#059669"}, "layout": "horizontal"}', 'startup');

-- =============================================================================
-- SETUP COMPLETE!
-- =============================================================================
-- 
-- After running this script:
-- 1. Your database schema is ready
-- 2. Storage bucket is configured for file uploads
-- 3. RLS policies ensure data security
-- 4. Automatic triggers handle user creation and timestamps
-- 5. Sample templates are available
--
-- Next steps:
-- 1. Update your environment variables with the Supabase URL and anon key
-- 2. Test the connection from your application
-- 3. Start building your business card features!
-- =============================================================================
# Supabase Setup Instructions

## 1. Create a Supabase Project
1. Go to https://supabase.com and create a free account
2. Create a new project
3. Wait for the project to finish setting up

## 2. Get Your API Keys
1. Go to Project Settings > API
2. Copy the `Project URL` and `anon public` key
3. Create a `.env` file in your project root:
```
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## 3. Create the Database Table
Run this SQL in the Supabase SQL Editor:

```sql
-- Create business_cards table
CREATE TABLE business_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  mobile_phone TEXT NOT NULL,
  company TEXT NOT NULL,
  address TEXT NOT NULL,
  profile_picture_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE business_cards ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read all cards
CREATE POLICY "Public cards are viewable by everyone"
  ON business_cards FOR SELECT
  USING (true);

-- Policy: Users can insert their own card
CREATE POLICY "Users can insert their own card"
  ON business_cards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own card
CREATE POLICY "Users can update their own card"
  ON business_cards FOR UPDATE
  USING (auth.uid() = user_id);
```

## 4. Create Storage Bucket
1. Go to Storage in Supabase dashboard
2. Create a new bucket called `business-cards`
3. Make it public
4. Set the following policy:

```sql
-- Allow authenticated users to upload
CREATE POLICY "Users can upload their profile pictures"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'business-cards' AND auth.role() = 'authenticated');

-- Allow public access to view
CREATE POLICY "Public access to profile pictures"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'business-cards');
```

## 5. Install Dependencies
```bash
npm install @supabase/supabase-js
```

## 6. Run the Application
```bash
npm run dev
```

Your digital business card platform is now ready!

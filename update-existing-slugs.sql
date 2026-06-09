-- Update existing business cards with unique random slugs
-- This script regenerates all existing card slugs to include a 24-character random string for security
-- Run this in your Supabase SQL Editor to update all existing cards

-- Step 1: Create a function to generate random alphanumeric strings with dashes and underscores
CREATE OR REPLACE FUNCTION generate_random_slug_suffix(length INT DEFAULT 24)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(length), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Step 2: Update all existing business cards to have new slug format
-- Format: {name}-{random_24_chars}
UPDATE business_cards
SET slug = CONCAT(
  LOWER(REGEXP_REPLACE(REGEXP_REPLACE(full_name, '[^a-z0-9\s]', '', 'gi'), '\s+', '-', 'g')),
  '-',
  SUBSTR(md5(RANDOM()::text || NOW()::text || id::text), 1, 24)
)
WHERE slug IS NULL 
   OR slug = '' 
   OR LENGTH(slug) < 20; -- Update cards with old/empty slugs

-- Verify: Check updated cards
SELECT id, full_name, slug, created_at FROM business_cards ORDER BY updated_at DESC LIMIT 10;

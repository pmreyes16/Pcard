import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

function generateRandomString(length = 24) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789-_';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateSlug(fullName) {
  const baseSlug = fullName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .trim();
  
  const randomString = generateRandomString(24);
  return `${baseSlug}-${randomString}`;
}

async function updateExistingCards() {
  console.log('🔄 Starting to update existing business cards with unique slugs...\n');

  try {
    // Fetch all business cards
    const { data: cards, error: fetchError } = await supabase
      .from('business_cards')
      .select('id, full_name, slug')
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('❌ Error fetching cards:', fetchError);
      process.exit(1);
    }

    console.log(`Found ${cards.length} total cards\n`);

    let updatedCount = 0;
    const updates = [];

    for (const card of cards) {
      // Check if card needs update (empty slug or old format without random suffix)
      const needsUpdate = !card.slug || card.slug.length < 30 || !card.slug.includes('-');
      
      if (needsUpdate) {
        const newSlug = generateSlug(card.full_name);
        updates.push({
          id: card.id,
          oldSlug: card.slug,
          newSlug: newSlug,
          fullName: card.full_name
        });
      }
    }

    if (updates.length === 0) {
      console.log('✅ All cards already have unique slugs! Nothing to update.');
      return;
    }

    console.log(`Found ${updates.length} cards to update:\n`);

    // Update cards one by one
    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('business_cards')
        .update({ slug: update.newSlug })
        .eq('id', update.id);

      if (updateError) {
        console.error(`❌ Error updating card ${update.id} (${update.fullName}):`, updateError);
      } else {
        updatedCount++;
        console.log(`✅ ${update.fullName}`);
        console.log(`   Old: ${update.oldSlug}`);
        console.log(`   New: ${update.newSlug}\n`);
      }
    }

    console.log(`\n🎉 Successfully updated ${updatedCount}/${updates.length} cards!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

updateExistingCards();

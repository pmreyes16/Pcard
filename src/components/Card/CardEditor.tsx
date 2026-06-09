import React, { useState, useEffect } from 'react';
import { supabase, BusinessCard } from '../../lib/supabase';
import ProfilePictureUpload from './ProfilePictureUpload';
import CardPreview from './CardPreview';

interface CardEditorProps {
  userId: string;
  cardToEdit?: any;
  onCardEditComplete?: () => void;
}

export default function CardEditor({ userId, cardToEdit, onCardEditComplete }: CardEditorProps) {
  const [card, setCard] = useState<Partial<BusinessCard>>({});
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    if (cardToEdit) {
      // Edit mode - load the card to edit
      setCard(cardToEdit);
      setIsEditMode(true);
    } else {
      // Create mode - start with blank form
      loadCard();
      setIsEditMode(false);
    }
  }, [cardToEdit, userId]);

  const loadCard = async () => {
    try {
      // Always start with a blank form for creating new cards
      setCard({
        theme_color: '#3B82F6',
        is_public: true
      });
    } catch (error) {
      console.error('Unexpected error loading card:', error);
    }
  };

  const generateRandomString = (length: number = 24) => {
    // Use URL-safe characters: alphanumeric plus - and _
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789-_';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const generateSlug = (name: string) => {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .trim();
    
    // Add random string to slug for security (makes it 24 chars of random data)
    const randomString = generateRandomString(24);
    return `${baseSlug}-${randomString}`;
  };

  const regenerateSlug = async () => {
    if (!card.full_name) return;
    
    const newSlug = generateSlug(card.full_name);
    setCard({ ...card, slug: newSlug });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaved(false);

    try {
      // Validate required fields
      if (!card.full_name || !card.email) {
        alert('Please fill in all required fields (Full Name and Email).');
        setLoading(false);
        return;
      }

      // Generate slug if it doesn't exist
      let cardData = { ...card, user_id: userId, updated_at: new Date().toISOString() };
      
      if ((!cardData.slug || cardData.slug === '') && cardData.full_name) {
        const finalSlug = generateSlug(cardData.full_name);
        cardData.slug = finalSlug;
        console.log('Generated slug for', cardData.full_name, ':', finalSlug);
      }

      console.log('Attempting to save card data:', cardData);

      let saveError = null;

      if (isEditMode && cardToEdit?.id) {
        // Update existing card
        console.log('Updating card:', cardToEdit.id);
        const { error } = await supabase
          .from('business_cards')
          .update(cardData)
          .eq('id', cardToEdit.id);
        saveError = error;
      } else {
        // Create new card
        console.log('Creating new card');
        const { error } = await supabase
          .from('business_cards')
          .insert({
            ...cardData,
            created_at: new Date().toISOString()
          });
        saveError = error;
      }

      if (saveError) {
        console.error('Save error:', saveError);
        console.error('Error details:', {
          message: saveError.message,
          details: saveError.details,
          hint: saveError.hint,
          code: saveError.code
        });
        alert('Error saving card: ' + saveError.message);
      } else {
        setSaved(true);
        console.log('Card saved successfully!');
        
        if (isEditMode) {
          // After edit, call the completion callback
          if (onCardEditComplete) {
            onCardEditComplete();
          }
        } else {
          // After create, clear the form for next card
          setCard({
            theme_color: '#3B82F6',
            is_public: true
          });
        }
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      alert('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePictureUpload = async (url: string) => {
    setCard(prev => ({ ...prev, profile_picture_url: url }));
    
    // Trigger auto-save after profile picture upload
    const userId = supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        try {
          const cardData = {
            ...card,
            profile_picture_url: url,
            updated_at: new Date().toISOString()
          };

          // Always insert a new card
          const { error: saveError } = await supabase
            .from('business_cards')
            .insert({
              ...cardData,
              user_id: user.id,
              created_at: new Date().toISOString()
            });

          if (saveError) {
            console.error('Auto-save error:', saveError);
          } else {
            console.log('Auto-saved after profile picture upload');
          }
        } catch (error) {
          console.error('Auto-save error:', error);
        }
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8">
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-800">
          {isEditMode ? '✏️ Edit Card' : '📝 Create New Card'}
        </h2>
        <form onSubmit={handleSave} className="space-y-4 sm:space-y-6">
          
          {/* Profile Picture */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Profile Picture</label>
            <ProfilePictureUpload
              currentUrl={card.profile_picture_url}
              onUploadSuccess={handleProfilePictureUpload}
              userId={userId}
            />
          </div>

          {/* Basic Information */}
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 border-b pb-2">Basic Information</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={card.full_name || ''}
                  onChange={(e) => setCard({ ...card, full_name: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                <input
                  type="text"
                  value={card.job_title || ''}
                  onChange={(e) => setCard({ ...card, job_title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
              <input
                type="text"
                value={card.company || ''}
                onChange={(e) => setCard({ ...card, company: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
              <textarea
                value={card.bio || ''}
                onChange={(e) => setCard({ ...card, bio: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Tell people about yourself..."
              />
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Contact Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={card.email || ''}
                  onChange={(e) => setCard({ ...card, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Phone</label>
                <input
                  type="tel"
                  value={card.mobile_phone || ''}
                  onChange={(e) => setCard({ ...card, mobile_phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
              <input
                type="url"
                value={card.website || ''}
                onChange={(e) => setCard({ ...card, website: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea
                value={card.address || ''}
                onChange={(e) => setCard({ ...card, address: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
                placeholder="Street address, city, country..."
              />
            </div>
          </div>

          {/* Social Media */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Social Media</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn</label>
                <input
                  type="url"
                  value={card.linkedin_url || ''}
                  onChange={(e) => setCard({ ...card, linkedin_url: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://linkedin.com/in/username"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">X (formerly Twitter)</label>
                <input
                  type="url"
                  value={card.twitter_url || ''}
                  onChange={(e) => setCard({ ...card, twitter_url: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://x.com/username"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
                <input
                  type="url"
                  value={card.instagram_url || ''}
                  onChange={(e) => setCard({ ...card, instagram_url: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://instagram.com/username"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Facebook</label>
                <input
                  type="url"
                  value={card.facebook_url || ''}
                  onChange={(e) => setCard({ ...card, facebook_url: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://facebook.com/username"
                />
              </div>
            </div>
          </div>

          {/* Card Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Card Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Theme Color</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={card.theme_color || '#3B82F6'}
                    onChange={(e) => setCard({ ...card, theme_color: e.target.value })}
                    className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={card.theme_color || '#3B82F6'}
                    onChange={(e) => setCard({ ...card, theme_color: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="#3B82F6"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Public Visibility</label>
                <div className="flex items-center space-x-2 mt-2">
                  <input
                    type="checkbox"
                    checked={card.is_public !== false}
                    onChange={(e) => setCard({ ...card, is_public: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Make card publicly viewable</span>
                </div>
              </div>
            </div>
          </div>

          {/* Public URL Section */}
          {card.full_name && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Public URL</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Your public card URL:</label>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-600">
                    {window.location.origin}/{card.slug || generateSlug(card.full_name)}
                  </div>
                  <button
                    type="button"
                    onClick={regenerateSlug}
                    className="px-3 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors text-xs"
                    title="Regenerate URL from current name"
                  >
                    🔄 Update URL
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  This URL is automatically generated from your Full Name. Click "Update URL" to regenerate it if you've changed your name.
                </p>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
          >
            {loading ? 'Saving...' : 'Save Card'}
          </button>
          
          {saved && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-center">
              Card saved successfully! 🎉
            </div>
          )}
        </form>
      </div>
      
      <div className="flex items-start justify-center">
        <div className="sticky top-6">
          <CardPreview card={card} />
        </div>
      </div>
    </div>
  );
}

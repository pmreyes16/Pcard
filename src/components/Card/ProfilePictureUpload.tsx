import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface ProfilePictureUploadProps {
  currentUrl?: string;
  onUploadSuccess: (url: string) => void;
  userId: string;
}

export default function ProfilePictureUpload({ currentUrl, onUploadSuccess, userId }: ProfilePictureUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentUrl || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update preview when currentUrl changes
  useEffect(() => {
    if (currentUrl) {
      setPreview(currentUrl);
      console.log('Profile picture URL loaded:', currentUrl);
    }
  }, [currentUrl]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please upload a valid image file (JPEG, PNG, WebP, or GIF)');
      return;
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    
    // Convert HEIC to JPEG if needed
    let fileToUpload = file;
    let fileExt = file.name.split('.').pop()?.toLowerCase();
    
    if (fileExt === 'heic' || file.type === 'image/heic') {
      try {
        // For HEIC files, we'll convert them or show a helpful message
        alert('HEIC files are not supported. Please convert to JPEG or PNG first.');
        setUploading(false);
        return;
      } catch (error) {
        console.error('HEIC conversion failed:', error);
        setUploading(false);
        return;
      }
    }

    // Ensure we have a valid extension
    if (!fileExt || !['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(fileExt)) {
      fileExt = 'jpg'; // Default to jpg
    }

    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `profile-pictures/${fileName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('business-cards')
        .upload(filePath, fileToUpload, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        alert('Upload failed: ' + uploadError.message);
        setUploading(false);
        return;
      }

      const { data } = supabase.storage.from('business-cards').getPublicUrl(filePath);
      const publicUrl = data.publicUrl;
      
      console.log('Upload successful, public URL:', publicUrl);
      
      // Immediately save the profile picture URL to the database
      try {
        // First try to update existing record
        const { data: existingCard, error: fetchError } = await supabase
          .from('business_cards')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        if (fetchError && fetchError.code !== 'PGRST116') {
          console.error('Error checking existing card:', fetchError);
        }

        let saveError = null;
        
        if (existingCard) {
          // Update existing record
          const { error } = await supabase
            .from('business_cards')
            .update({ 
              profile_picture_url: publicUrl,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);
          saveError = error;
        } else {
          // Insert new record with minimal required fields
          const { error } = await supabase
            .from('business_cards')
            .insert({
              user_id: userId,
              profile_picture_url: publicUrl,
              full_name: 'Your Name', // Default placeholder
              email: 'your.email@example.com', // Default placeholder
              theme_color: '#3B82F6',
              is_public: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          saveError = error;
        }

        if (saveError) {
          console.error('Error saving profile picture URL:', saveError);
        } else {
          console.log('Profile picture URL saved to database successfully');
        }
      } catch (dbError) {
        console.error('Database error:', dbError);
      }

      setPreview(publicUrl);
      onUploadSuccess(publicUrl);
      console.log('Upload process completed');
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-3 sm:space-y-4">
      <div className="relative">
        <img
          src={preview || 'https://d64gsuwffb70l.cloudfront.net/68dfdf1e98fe75cad01b712c_1759502163667_544acd21.webp'}
          alt="Profile"
          className="w-32 h-32 sm:w-40 sm:h-40 lg:w-56 lg:h-56 rounded-none object-cover border-4 border-blue-500"
        />
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm sm:text-base"
      >
        {uploading ? 'Uploading...' : 'Upload Photo'}
      </button>
      <p className="text-xs text-gray-500 text-center px-2">
        Supported formats: JPEG, PNG, WebP, GIF (max 10MB)
      </p>
    </div>
  );
}

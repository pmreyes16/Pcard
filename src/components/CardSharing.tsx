import React, { useState, useEffect } from 'react';
import { supabase, BusinessCard } from '../lib/supabase';

interface CardSharingProps {
  userId: string;
  refreshKey?: number;
}

export default function CardSharing({ userId, refreshKey }: CardSharingProps) {
  const [card, setCard] = useState<BusinessCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copied, setCopied] = useState<string>('');

  useEffect(() => {
    loadCard();
  }, [userId, refreshKey]); // Add refreshKey as dependency

  const loadCard = async () => {
    const { data } = await supabase
      .from('business_cards')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (data) {
      setCard(data);
      if (data.slug) {
        generateQRCode(data.slug);
      }
    }
    setLoading(false);
  };

  const generateQRCode = (slug: string) => {
    const publicUrl = `${window.location.origin}/card/${slug}`;
    // Using QR Server API for QR code generation
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(publicUrl)}`;
    setQrCodeUrl(qrUrl);
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(''), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const trackShare = async (method: string, sharedTo?: string) => {
    if (!card) return;
    
    await supabase
      .from('card_shares')
      .insert({
        card_id: card.id,
        share_method: method,
        shared_to: sharedTo
      });
  };

  const shareViaEmail = () => {
    if (!card?.slug) return;
    
    const publicUrl = `${window.location.origin}/card/${card.slug}`;
    const subject = `Check out ${card.full_name}'s Business Card`;
    const body = `Hi there!\n\nI'd like to share my digital business card with you: ${publicUrl}\n\nBest regards,\n${card.full_name}`;
    
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl);
    
    trackShare('email');
  };

  const shareViaSMS = () => {
    if (!card?.slug) return;
    
    const publicUrl = `${window.location.origin}/card/${card.slug}`;
    const message = `Check out my digital business card: ${publicUrl} - ${card.full_name}`;
    
    const smsUrl = `sms:?body=${encodeURIComponent(message)}`;
    window.open(smsUrl);
    
    trackShare('sms');
  };

  const shareOnSocial = (platform: string) => {
    if (!card?.slug) return;
    
    const publicUrl = `${window.location.origin}/card/${card.slug}`;
    const text = `Check out ${card.full_name}'s digital business card`;
    
    let shareUrl = '';
    
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(publicUrl)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(publicUrl)}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(publicUrl)}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodeURIComponent(`${text} ${publicUrl}`)}`;
        break;
    }
    
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
      trackShare('social', platform);
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeUrl) return;
    
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `${card?.full_name}_QR_Code.png`;
    link.click();
    
    trackShare('qr');
  };

  const webShare = async () => {
    if (!card?.slug) return;
    
    const publicUrl = `${window.location.origin}/card/${card.slug}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${card.full_name}'s Business Card`,
          text: `Check out ${card.full_name}'s digital business card`,
          url: publicUrl
        });
        trackShare('native');
      } catch (err) {
        console.error('Error sharing:', err);
      }
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!card || !card.slug) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 text-center">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Sharing Not Available</h2>
        <p className="text-gray-600">Create and save your business card first to enable sharing features.</p>
      </div>
    );
  }

  const publicUrl = `${window.location.origin}/card/${card.slug}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2 sm:mb-0">Share Your Card</h2>
          <button
            onClick={loadCard}
            className="px-3 py-1 text-xs sm:text-sm bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors self-start sm:self-auto"
            title="Refresh sharing data"
          >
            🔄 Refresh
          </button>
        </div>
        <p className="text-sm sm:text-base text-gray-600">Share your digital business card in multiple ways</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* QR Code Section */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-4 flex items-center space-x-2">
            <span>📱</span>
            <span>QR Code</span>
          </h3>
          
          <div className="text-center">
            {qrCodeUrl && (
              <div className="mb-4">
                <img 
                  src={qrCodeUrl} 
                  alt="QR Code"
                  className="mx-auto rounded-lg shadow-md"
                />
              </div>
            )}
            
            <p className="text-xs sm:text-sm text-gray-600 mb-4">
              People can scan this QR code to instantly view your business card
            </p>
            
            <button
              onClick={downloadQRCode}
              className="bg-blue-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
            >
              Download QR Code
            </button>
          </div>
        </div>

        {/* Direct Link Section */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-4 flex items-center space-x-2">
            <span>🔗</span>
            <span>Direct Link</span>
          </h3>
          
          <div className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Your Public URL:
              </label>
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                <input
                  type="text"
                  value={publicUrl}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-xs sm:text-sm"
                />
                <button
                  onClick={() => copyToClipboard(publicUrl, 'url')}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors text-xs sm:text-sm whitespace-nowrap"
                >
                  {copied === 'url' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>
            
            {/* Native Share (if supported) */}
            {navigator.share && (
              <button
                onClick={webShare}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
              >
                <span>📤</span>
                <span>Share</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sharing Options */}
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-4 flex items-center space-x-2">
          <span>🌐</span>
          <span>Share Options</span>
        </h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {/* Email */}
          <button
            onClick={shareViaEmail}
            className="flex flex-col items-center space-y-1 sm:space-y-2 p-3 sm:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span className="text-xl sm:text-2xl">📧</span>
            <span className="text-xs sm:text-sm font-medium text-gray-700">Email</span>
          </button>

          {/* SMS */}
          <button
            onClick={shareViaSMS}
            className="flex flex-col items-center space-y-1 sm:space-y-2 p-3 sm:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span className="text-xl sm:text-2xl">💬</span>
            <span className="text-xs sm:text-sm font-medium text-gray-700">SMS</span>
          </button>

          {/* WhatsApp */}
          <button
            onClick={() => shareOnSocial('whatsapp')}
            className="flex flex-col items-center space-y-1 sm:space-y-2 p-3 sm:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span className="text-2xl">📱</span>
            <span className="text-sm font-medium text-gray-700">WhatsApp</span>
          </button>

          {/* Twitter */}
          <button
            onClick={() => shareOnSocial('twitter')}
            className="flex flex-col items-center space-y-2 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span className="text-2xl">🐦</span>
            <span className="text-sm font-medium text-gray-700">Twitter</span>
          </button>

          {/* LinkedIn */}
          <button
            onClick={() => shareOnSocial('linkedin')}
            className="flex flex-col items-center space-y-2 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span className="text-2xl">💼</span>
            <span className="text-sm font-medium text-gray-700">LinkedIn</span>
          </button>

          {/* Facebook */}
          <button
            onClick={() => shareOnSocial('facebook')}
            className="flex flex-col items-center space-y-2 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span className="text-2xl">👥</span>
            <span className="text-sm font-medium text-gray-700">Facebook</span>
          </button>

          {/* Copy Link */}
          <button
            onClick={() => copyToClipboard(publicUrl, 'link')}
            className="flex flex-col items-center space-y-2 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span className="text-2xl">{copied === 'link' ? '✅' : '🔗'}</span>
            <span className="text-sm font-medium text-gray-700">
              {copied === 'link' ? 'Copied!' : 'Copy Link'}
            </span>
          </button>

          {/* Print */}
          <button
            onClick={() => {
              window.open(publicUrl, '_blank');
              trackShare('print');
            }}
            className="flex flex-col items-center space-y-2 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span className="text-2xl">🖨️</span>
            <span className="text-sm font-medium text-gray-700">Print</span>
          </button>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h4 className="text-lg font-semibold text-blue-900 mb-2">💡 Sharing Tips</h4>
        <ul className="text-blue-800 text-sm space-y-1">
          <li>• Use the QR code for in-person networking events</li>
          <li>• Add your public URL to your email signature</li>
          <li>• Share on social media to increase visibility</li>
          <li>• Include the link in your business presentations</li>
          <li>• Print the QR code on business materials</li>
        </ul>
      </div>
    </div>
  );
}
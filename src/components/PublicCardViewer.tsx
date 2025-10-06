import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, BusinessCard } from '../lib/supabase';

export default function PublicCardViewer() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [card, setCard] = useState<BusinessCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactData, setContactData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);

  useEffect(() => {
    if (slug) {
      loadCard();
    }
  }, [slug]);

  useEffect(() => {
    if (slug && card) {
      recordView();
    }
  }, [slug, card]);

  const loadCard = async () => {
    if (!slug) return;
    
    try {
      console.log('Loading card for slug:', slug);
      const { data, error } = await supabase
        .from('business_cards')
        .select('*')
        .eq('slug', slug)
        .eq('is_public', true)
        .single();

      if (error) {
        console.log('Card not found for slug:', slug, 'Error:', error.message);
        if (error.code === 'PGRST116') {
          console.log('No matching card found in database');
        }
        navigate('/404');
        return;
      }

      if (!data) {
        console.log('No card data found for slug:', slug);
        navigate('/404');
        return;
      }

      console.log('Card loaded successfully:', data.full_name);
      setCard(data);
      setLoading(false);
    } catch (err) {
      console.error('Error loading card:', err);
      navigate('/404');
    }
  };

  const recordView = async () => {
    if (!slug || !card) return;

    try {
      // Record the view
      await supabase
        .from('card_views')
        .insert({
          card_id: card.id,
          viewer_ip: '', // We can't easily get IP on client side
          viewer_user_agent: navigator.userAgent,
          referrer: document.referrer || ''
        });

      // Increment view count - only if the increment function exists
      try {
        await supabase.rpc('increment_card_views', { card_uuid: card.id });
      } catch (rpcError) {
        console.log('RPC function not available, skipping view count increment');
      }
    } catch (error) {
      console.log('Error recording view:', error);
    }
  };

  const handleContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!card) return;

    setContactSubmitting(true);
    
    const { error } = await supabase
      .from('card_contacts')
      .insert({
        card_id: card.id,
        contact_name: contactData.name,
        contact_email: contactData.email,
        contact_phone: contactData.phone,
        message: contactData.message
      });

    if (!error) {
      setContactSuccess(true);
      setContactData({ name: '', email: '', phone: '', message: '' });
      setTimeout(() => {
        setShowContactForm(false);
        setContactSuccess(false);
      }, 3000);
    }

    setContactSubmitting(false);
  };

  const downloadVCard = () => {
    if (!card) return;

    const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${card.full_name}
${card.job_title ? `TITLE:${card.job_title}` : ''}
${card.company ? `ORG:${card.company}` : ''}
EMAIL:${card.email}
${card.mobile_phone ? `TEL:${card.mobile_phone}` : ''}
${card.address ? `ADR:;;${card.address};;;;` : ''}
${card.website ? `URL:${card.website}` : ''}
${card.bio ? `NOTE:${card.bio}` : ''}
END:VCARD`;

    const blob = new Blob([vcard], { type: 'text/vcard' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${card.full_name.replace(/\s+/g, '_')}_contact.vcf`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading card...</p>
        </div>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Card Not Found</h1>
          <p className="text-gray-600">The business card you're looking for doesn't exist or is private.</p>
        </div>
      </div>
    );
  }

  const themeColor = card.theme_color || '#3B82F6';
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 59, g: 130, b: 246 };
  };
  
  const rgb = hexToRgb(themeColor);

  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Business Card Display */}
        <div className="mb-6 sm:mb-8">
          <div 
            className="rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 lg:p-12 text-white max-w-2xl mx-auto"
            style={{
              background: `linear-gradient(135deg, rgb(${rgb.r}, ${rgb.g}, ${rgb.b}) 0%, rgb(${Math.max(0, rgb.r - 40)}, ${Math.max(0, rgb.g - 40)}, ${Math.max(0, rgb.b - 40)}) 100%)`
            }}
          >
            <div className="flex flex-col items-center space-y-6 sm:space-y-8">
              {/* Profile Picture */}
              {card.profile_picture_url && (
                <img
                  src={card.profile_picture_url}
                  alt={card.full_name}
                  className="w-40 h-40 sm:w-48 sm:h-48 lg:w-56 lg:h-56 rounded-none object-cover border-4 border-white shadow-lg"
                />
              )}
              
              {/* Name and Title */}
              <div className="text-center space-y-2 sm:space-y-3">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">{card.full_name}</h1>
                {card.job_title && (
                  <p className="text-white/90 text-lg sm:text-xl font-medium">{card.job_title}</p>
                )}
                {card.company && (
                  <p className="text-white/80 text-base sm:text-lg">{card.company}</p>
                )}
              </div>

              {/* Bio */}
              {card.bio && (
                <div className="text-center max-w-md px-4">
                  <p className="text-white/90 leading-relaxed text-sm sm:text-base">{card.bio}</p>
                </div>
              )}

              {/* Contact Information */}
              <div className="w-full max-w-md space-y-3 sm:space-y-4 px-4">
                <a 
                  href={`mailto:${card.email}`}
                  className="flex items-center space-x-4 bg-white/10 rounded-lg p-3 hover:bg-white/20 transition-colors"
                >
                  <span className="text-white/90 text-xl">📧</span>
                  <span className="text-white/90">{card.email}</span>
                </a>
                
                {card.mobile_phone && (
                  <a 
                    href={`tel:${card.mobile_phone}`}
                    className="flex items-center space-x-4 bg-white/10 rounded-lg p-3 hover:bg-white/20 transition-colors"
                  >
                    <span className="text-white/90 text-xl">📱</span>
                    <span className="text-white/90">{card.mobile_phone}</span>
                  </a>
                )}
                
                {card.website && (
                  <a 
                    href={card.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-4 bg-white/10 rounded-lg p-3 hover:bg-white/20 transition-colors"
                  >
                    <span className="text-white/90 text-xl">🌐</span>
                    <span className="text-white/90 truncate">{card.website}</span>
                  </a>
                )}
                
                {card.address && (
                  <div className="flex items-center space-x-4 bg-white/10 rounded-lg p-3">
                    <span className="text-white/90 text-xl">📍</span>
                    <span className="text-white/90 text-sm leading-relaxed">{card.address}</span>
                  </div>
                )}
              </div>

              {/* Social Media Links */}
              {(card.linkedin_url || card.twitter_url || card.instagram_url || card.facebook_url) && (
                <div className="w-full pt-6 border-t border-white/20">
                  <div className="flex justify-center space-x-6">
                    {card.linkedin_url && (
                      <a href={card.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-white/90 hover:text-white transition-colors">
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                      </a>
                    )}
                    
                    {card.twitter_url && (
                      <a href={card.twitter_url} target="_blank" rel="noopener noreferrer" className="text-white/90 hover:text-white transition-colors">
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                        </svg>
                      </a>
                    )}
                    
                    {card.instagram_url && (
                      <a href={card.instagram_url} target="_blank" rel="noopener noreferrer" className="text-white/90 hover:text-white transition-colors">
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987 6.62 0 11.987-5.367 11.987-11.987C24.014 5.367 18.637.001 12.017.001zM8.449 16.988c-1.297 0-2.448-.49-3.323-1.297C4.198 14.826 3.72 13.675 3.72 12.378c0-1.297.478-2.448 1.406-3.323.928-.875 2.026-1.297 3.323-1.297 1.297 0 2.448.422 3.323 1.297.875.875 1.297 2.026 1.297 3.323 0 1.297-.422 2.448-1.297 3.323-.875.807-2.026 1.287-3.323 1.287zm7.83-9.404h-1.34c-.04-.835-.656-1.505-1.444-1.505-.835 0-1.505.67-1.505 1.505v.478c0 .835.67 1.505 1.505 1.505.835 0 1.444-.67 1.444-1.505h1.34c.067 1.549-1.078 2.794-2.627 2.794-1.549 0-2.794-1.245-2.794-2.794v-.478c0-1.549 1.245-2.794 2.794-2.794 1.549.001 2.694 1.246 2.627 2.794z"/>
                        </svg>
                      </a>
                    )}
                    
                    {card.facebook_url && (
                      <a href={card.facebook_url} target="_blank" rel="noopener noreferrer" className="text-white/90 hover:text-white transition-colors">
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          <button
            onClick={downloadVCard}
            className="bg-white text-gray-800 px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-shadow font-medium flex items-center space-x-2"
          >
            <span>📱</span>
            <span>Save Contact</span>
          </button>
          
          <button
            onClick={() => setShowContactForm(true)}
            style={{ backgroundColor: themeColor }}
            className="text-white px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-shadow font-medium flex items-center space-x-2"
          >
            <span>💬</span>
            <span>Send Message</span>
          </button>
          
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: `${card.full_name}'s Business Card`,
                  text: `Check out ${card.full_name}'s digital business card`,
                  url: window.location.href
                });
              } else {
                navigator.clipboard.writeText(window.location.href);
                alert('Link copied to clipboard!');
              }
            }}
            className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-shadow font-medium flex items-center space-x-2"
          >
            <span>🔗</span>
            <span>Share</span>
          </button>
        </div>

        {/* View Counter */}
        <div className="text-center text-gray-500 text-sm">
          👀 {card.view_count} views
        </div>

        {/* Contact Form Modal */}
        {showContactForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full">
              <h3 className="text-xl font-bold mb-4">Contact {card.full_name}</h3>
              
              {contactSuccess ? (
                <div className="text-center py-8">
                  <div className="text-green-600 text-4xl mb-4">✅</div>
                  <p className="text-green-600 font-medium">Message sent successfully!</p>
                  <p className="text-gray-600 text-sm mt-2">We'll make sure {card.full_name} receives your message.</p>
                </div>
              ) : (
                <form onSubmit={handleContact} className="space-y-4">
                  <input
                    type="text"
                    placeholder="Your Name *"
                    value={contactData.name}
                    onChange={(e) => setContactData({ ...contactData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  
                  <input
                    type="email"
                    placeholder="Your Email *"
                    value={contactData.email}
                    onChange={(e) => setContactData({ ...contactData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  
                  <input
                    type="tel"
                    placeholder="Your Phone (optional)"
                    value={contactData.phone}
                    onChange={(e) => setContactData({ ...contactData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  
                  <textarea
                    placeholder="Your Message *"
                    value={contactData.message}
                    onChange={(e) => setContactData({ ...contactData, message: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={4}
                    required
                  />
                  
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowContactForm(false)}
                      className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                    
                    <button
                      type="submit"
                      disabled={contactSubmitting}
                      style={{ backgroundColor: themeColor }}
                      className="flex-1 text-white py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {contactSubmitting ? 'Sending...' : 'Send Message'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { supabase, BusinessCard } from '../lib/supabase';
import CardPreview from './Card/CardPreview';

interface PublicCardProps {
  userId: string;
}

export default function PublicCard({ userId }: PublicCardProps) {
  const [card, setCard] = useState<BusinessCard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCard();
  }, [userId]);

  const loadCard = async () => {
    const { data, error } = await supabase
      .from('business_cards')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (data) setCard(data);
    setLoading(false);
  };

  const downloadVCard = () => {
    if (!card) return;
    
    const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${card.full_name}
EMAIL:${card.email}
TEL:${card.mobile_phone}
ORG:${card.company}
ADR:;;${card.address}
END:VCARD`;
    
    const blob = new Blob([vcard], { type: 'text/vcard' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${card.full_name.replace(/\s+/g, '_')}.vcf`;
    a.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Card Not Found</h2>
          <p className="text-gray-600">This business card doesn't exist or hasn't been created yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <CardPreview card={card} />
        </div>
        
        <div className="flex justify-center">
          <button
            onClick={downloadVCard}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg"
          >
            Download Contact
          </button>
        </div>
      </div>
    </div>
  );
}

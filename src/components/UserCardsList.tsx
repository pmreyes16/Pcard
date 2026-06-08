import React, { useState, useEffect } from 'react';
import { supabase, BusinessCard } from '../lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface UserCardsListProps {
  userId?: string;
  isAdmin?: boolean;
  onEditCard?: (card: any) => void;
}

export default function UserCardsList({ userId, isAdmin = false, onEditCard }: UserCardsListProps) {
  const [cards, setCards] = useState<BusinessCard[]>([]);
  const [allCards, setAllCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [debugInfo, setDebugInfo] = useState('');
  const [reassigningCardId, setReassigningCardId] = useState<string | null>(null);

  useEffect(() => {
    loadCards();
  }, [userId]);

  const loadCards = async () => {
    try {
      setLoading(true);
      
      // First, get ALL cards to debug
      const { data: allCardsData, error: allError } = await supabase
        .from('business_cards')
        .select('id, user_id, full_name, slug, is_public, email, company')
        .order('created_at', { ascending: false });

      if (allCardsData) {
        console.log('All cards in database:', allCardsData);
        setAllCards(allCardsData);
        const matchingCards = allCardsData.filter(c => c.user_id === userId);
        console.log(`Cards matching userId ${userId}:`, matchingCards);
      }

      // Load all cards - no filtering
      const { data, error } = await supabase
        .from('business_cards')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading cards:', error);
        setDebugInfo(`Error: ${error.message}`);
        return;
      }

      console.log('Cards loaded:', data);
      setCards(data || []);
      setDebugInfo(`All cards: ${data?.length || 0} (Your cards: ${allCardsData?.filter(c => c.user_id === userId).length || 0})`);
    } catch (error) {
      console.error('Unexpected error loading cards:', error);
      setDebugInfo(`Unexpected error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredCards = cards.filter(card =>
    card.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (card.company && card.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (card.email && card.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const previewCard = (slug: string | null) => {
    if (slug) {
      window.open(`/${slug}`, '_blank', 'width=900,height=1000');
    }
  };

  const reassignCardToUser = async (cardId: string) => {
    if (!userId) return;
    
    try {
      setReassigningCardId(cardId);
      const { error } = await supabase
        .from('business_cards')
        .update({ user_id: userId })
        .eq('id', cardId);

      if (error) {
        console.error('Error reassigning card:', error);
        alert('Error reassigning card: ' + error.message);
      } else {
        alert('Card successfully reassigned to your account!');
        loadCards();
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      alert('Unexpected error: ' + error);
    } finally {
      setReassigningCardId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h3 className="text-xl font-semibold text-gray-800">
            All Business Cards
            {cards.length > 0 && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({cards.length} total)
              </span>
            )}
          </h3>
          
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded transition-colors text-sm font-medium ${
                viewMode === 'grid'
                  ? 'bg-blue-600 text-white'
                  : 'bg-transparent text-gray-600 hover:text-gray-800'
              }`}
              title="Grid view"
            >
              ⊞ Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded transition-colors text-sm font-medium ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'bg-transparent text-gray-600 hover:text-gray-800'
              }`}
              title="List view"
            >
              ≡ List
            </button>
          </div>
        </div>
        
        {/* Search */}
        <Input
          type="text"
          placeholder="Search by name, company, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mb-4"
        />

        {/* Debug Info - Visible Panel */}
        {debugInfo && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            <strong>Debug:</strong> {debugInfo}
          </div>
        )}
      </div>

      {filteredCards.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">
            {cards.length === 0 
              ? 'No business cards found' 
              : 'No cards match your search'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        // Grid View
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCards.map((card) => (
            <div
              key={card.id}
              className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
            >
              {/* Card Header with theme color */}
              <div
                className="h-20 w-full"
                style={{ backgroundColor: card.theme_color || '#3B82F6' }}
              />
              
              {/* Card Content */}
              <div className="p-4">
                <div className="mb-3">
                  <h4 className="text-lg font-semibold text-gray-800">
                    {card.full_name}
                  </h4>
                  {card.job_title && (
                    <p className="text-sm text-gray-600">{card.job_title}</p>
                  )}
                  {card.company && (
                    <p className="text-sm text-gray-500">{card.company}</p>
                  )}
                </div>

                {/* Contact Info */}
                <div className="space-y-1 mb-4 text-sm text-gray-600">
                  {card.email && (
                    <p className="truncate">📧 {card.email}</p>
                  )}
                  {card.mobile_phone && (
                    <p>📱 {card.mobile_phone}</p>
                  )}
                  {card.website && (
                    <p className="truncate">🌐 {card.website}</p>
                  )}
                </div>

                {/* Status & Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${
                      card.is_public
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {card.is_public ? '🔓 Public' : '🔒 Private'}
                    </span>
                    {card.user_id !== userId && userId && (
                      <span className="text-xs font-semibold px-2 py-1 rounded bg-orange-100 text-orange-800">
                        ⚠️ Not Yours
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {card.user_id !== userId && userId && (
                      <Button
                        onClick={() => reassignCardToUser(card.id)}
                        disabled={reassigningCardId === card.id}
                        size="sm"
                        className="text-white bg-orange-600 hover:bg-orange-700 text-xs"
                      >
                        {reassigningCardId === card.id ? '...' : '📌 Assign'}
                      </Button>
                    )}
                    <Button
                      onClick={() => previewCard(card.slug)}
                      variant="outline"
                      size="sm"
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      👁️ Preview
                    </Button>
                  </div>
                </div>

                {/* Slug Info */}
                {card.slug && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      URL: <span className="font-mono text-gray-700">/{card.slug}</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // List View
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-200">
            {filteredCards.map((card) => (
              <div
                key={card.id}
                className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between gap-4"
              >
                {/* Left Side - Card Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    {/* Profile Picture */}
                    <div className="w-12 h-12 rounded-lg flex-shrink-0 overflow-hidden bg-gray-200 border border-gray-300">
                      {card.profile_picture_url ? (
                        <img
                          src={card.profile_picture_url}
                          alt={card.full_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center text-white font-bold text-xs"
                          style={{ backgroundColor: card.theme_color || '#3B82F6' }}
                        >
                          {card.full_name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    
                    {/* Card Details */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-base font-semibold text-gray-800">
                        {card.full_name}
                      </h4>
                      <div className="text-sm text-gray-600 space-y-0.5">
                        {card.job_title && <p>{card.job_title}</p>}
                        {card.company && (
                          <p className="text-gray-500">{card.company}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side - Contact & Actions */}
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 flex-shrink-0">
                  {/* Contact Info */}
                  <div className="text-right sm:text-left text-sm text-gray-600 hidden sm:block">
                    {card.email && <p>{card.email}</p>}
                    {card.mobile_phone && <p>{card.mobile_phone}</p>}
                  </div>

                  {/* Status & Buttons */}
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-1 rounded whitespace-nowrap ${
                      card.is_public
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {card.is_public ? '🔓 Public' : '🔒 Private'}
                    </span>
                    {card.user_id !== userId && userId && (
                      <>
                        <span className="text-xs font-semibold px-2 py-1 rounded bg-orange-100 text-orange-800 whitespace-nowrap">
                          ⚠️ Not Yours
                        </span>
                        <Button
                          onClick={() => reassignCardToUser(card.id)}
                          disabled={reassigningCardId === card.id}
                          size="sm"
                          className="text-white bg-orange-600 hover:bg-orange-700 text-xs"
                        >
                          {reassigningCardId === card.id ? '...' : '📌 Assign'}
                        </Button>
                      </>
                    )}
                    {onEditCard && (
                      <Button
                        onClick={() => onEditCard(card)}
                        variant="outline"
                        size="sm"
                        className="text-green-600 hover:text-green-700 hover:bg-green-50 whitespace-nowrap"
                      >
                        ✏️ Edit
                      </Button>
                    )}
                    <Button
                      onClick={() => previewCard(card.slug)}
                      variant="outline"
                      size="sm"
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 whitespace-nowrap"
                    >
                      👁️ Preview
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

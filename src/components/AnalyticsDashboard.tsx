import React, { useState, useEffect } from 'react';
import { supabase, BusinessCard, CardView, CardContact } from '../lib/supabase';

interface AnalyticsDashboardProps {
  userId: string;
}

interface AnalyticsData {
  totalViews: number;
  totalContacts: number;
  recentViews: CardView[];
  recentContacts: CardContact[];
  viewsLastWeek: number;
  viewsLastMonth: number;
  topReferrers: { referrer: string; count: number }[];
}

export default function AnalyticsDashboard({ userId }: AnalyticsDashboardProps) {
  const [card, setCard] = useState<BusinessCard | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d'); // 7d, 30d, 90d

  useEffect(() => {
    loadAnalytics();
  }, [userId, timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);

    // Load user's business card
    const { data: cardData } = await supabase
      .from('business_cards')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!cardData) {
      setLoading(false);
      return;
    }

    setCard(cardData);

    // Calculate date range
    const now = new Date();
    const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

    // Load analytics data
    const [viewsResult, contactsResult, recentViewsResult, recentContactsResult] = await Promise.all([
      // Total views for the card
      supabase
        .from('card_views')
        .select('*', { count: 'exact' })
        .eq('card_id', cardData.id)
        .gte('viewed_at', startDate.toISOString()),
      
      // Total contacts
      supabase
        .from('card_contacts')
        .select('*', { count: 'exact' })
        .eq('card_id', cardData.id)
        .gte('contacted_at', startDate.toISOString()),
      
      // Recent views (last 10)
      supabase
        .from('card_views')
        .select('*')
        .eq('card_id', cardData.id)
        .order('viewed_at', { ascending: false })
        .limit(10),
      
      // Recent contacts (last 10)
      supabase
        .from('card_contacts')
        .select('*')
        .eq('card_id', cardData.id)
        .order('contacted_at', { ascending: false })
        .limit(10)
    ]);

    // Calculate weekly and monthly views
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [weeklyViews, monthlyViews] = await Promise.all([
      supabase
        .from('card_views')
        .select('*', { count: 'exact' })
        .eq('card_id', cardData.id)
        .gte('viewed_at', weekAgo.toISOString()),
      
      supabase
        .from('card_views')
        .select('*', { count: 'exact' })
        .eq('card_id', cardData.id)
        .gte('viewed_at', monthAgo.toISOString())
    ]);

    // Calculate top referrers
    const referrerCounts: { [key: string]: number } = {};
    if (viewsResult.data) {
      viewsResult.data.forEach(view => {
        const referrer = view.referrer || 'Direct';
        referrerCounts[referrer] = (referrerCounts[referrer] || 0) + 1;
      });
    }

    const topReferrers = Object.entries(referrerCounts)
      .map(([referrer, count]) => ({ referrer, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    setAnalytics({
      totalViews: viewsResult.count || 0,
      totalContacts: contactsResult.count || 0,
      recentViews: recentViewsResult.data || [],
      recentContacts: recentContactsResult.data || [],
      viewsLastWeek: weeklyViews.count || 0,
      viewsLastMonth: monthlyViews.count || 0,
      topReferrers
    });

    setLoading(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const copyPublicUrl = () => {
    if (card?.slug) {
      const url = `${window.location.origin}/card/${card.slug}`;
      navigator.clipboard.writeText(url);
      alert('Public URL copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 text-center">
        <h2 className="text-xl font-bold text-gray-800 mb-4">No Business Card Found</h2>
        <p className="text-gray-600">Create your business card first to view analytics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="mb-4 lg:mb-0">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Analytics Dashboard</h2>
            <p className="text-sm sm:text-base text-gray-600">Track your business card performance</p>
          </div>
          
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
            {card.slug && (
              <button
                onClick={copyPublicUrl}
                className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 text-sm sm:text-base"
              >
                <span>🔗</span>
                <span className="hidden sm:inline">Copy Public URL</span>
                <span className="sm:hidden">Copy URL</span>
              </button>
            )}
            
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-xs sm:text-sm">Total Views</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-800">{card.view_count}</p>
            </div>
            <div className="text-blue-600 text-xl sm:text-2xl">👀</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-xs sm:text-sm">Views ({timeRange})</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-800">{analytics?.totalViews || 0}</p>
            </div>
            <div className="text-green-600 text-xl sm:text-2xl">📈</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-xs sm:text-sm">Contacts</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-800">{analytics?.totalContacts || 0}</p>
            </div>
            <div className="text-purple-600 text-xl sm:text-2xl">💬</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-xs sm:text-sm">Conversion Rate</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-800">
                {analytics?.totalViews ? Math.round((analytics.totalContacts / analytics.totalViews) * 100) : 0}%
              </p>
            </div>
            <div className="text-orange-600 text-xl sm:text-2xl">🎯</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Views */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Recent Views</h3>
          
          {analytics?.recentViews && analytics.recentViews.length > 0 ? (
            <div className="space-y-3">
              {analytics.recentViews.map((view) => (
                <div key={view.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">
                      {view.referrer ? `From: ${view.referrer}` : 'Direct visit'}
                    </p>
                    <p className="text-xs text-gray-500">{formatDate(view.viewed_at)}</p>
                  </div>
                  <div className="text-gray-400">👁️</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 text-center py-8">No views yet</p>
          )}
        </div>

        {/* Recent Contacts */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Recent Contacts</h3>
          
          {analytics?.recentContacts && analytics.recentContacts.length > 0 ? (
            <div className="space-y-3">
              {analytics.recentContacts.map((contact) => (
                <div key={contact.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-gray-800">{contact.contact_name}</p>
                    <p className="text-xs text-gray-500">{formatDate(contact.contacted_at)}</p>
                  </div>
                  <p className="text-sm text-gray-600">{contact.contact_email}</p>
                  {contact.message && (
                    <p className="text-sm text-gray-700 mt-2 bg-white p-2 rounded border-l-2 border-blue-500">
                      "{contact.message}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 text-center py-8">No contacts yet</p>
          )}
        </div>
      </div>

      {/* Top Referrers */}
      {analytics?.topReferrers && analytics.topReferrers.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Top Traffic Sources</h3>
          <div className="space-y-3">
            {analytics.topReferrers.map((ref, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">
                    {ref.referrer === 'Direct' ? '🔗' : '🌐'}
                  </span>
                  <span className="font-medium text-gray-800">
                    {ref.referrer === 'Direct' ? 'Direct visits' : ref.referrer}
                  </span>
                </div>
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  {ref.count} views
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
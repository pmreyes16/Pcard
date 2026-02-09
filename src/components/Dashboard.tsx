import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import CardEditor from './Card/CardEditor';
import AnalyticsDashboard from './AnalyticsDashboard';
import CardSharing from './CardSharing';
import UserManagement from './Auth/UserManagement';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('editor');
  const [refreshSharing, setRefreshSharing] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  // Define superadmin emails as fallback (you can modify this list)
  const superAdminEmails = [
    'pmreyes16@yahoo.com',
    'pmreyes16@gmail.com',
    'admin@pcard.com',
    'superadmin@pcard.com'
  ];

  useEffect(() => {
    checkUser();
  }, []);

  // Refresh sharing component when switching to sharing tab
  useEffect(() => {
    if (activeTab === 'sharing') {
      setRefreshSharing(prev => prev + 1);
    }
  }, [activeTab]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    
    if (user) {
      console.log('Current user:', user.email, 'User ID:', user.id);
      
      // Primary check: Database admin_users table
      try {
        const { data: adminData, error: adminError } = await supabase
          .from('admin_users')
          .select('role')
          .eq('user_id', user.id)
          .single();
        
        console.log('Admin check result:', adminData, 'Error:', adminError);
        
        if (adminData) {
          setIsAdmin(true);
          console.log('User is admin with role:', adminData.role);
        } else {
          // Fallback: Check by email in superadmin list
          if (user.email && superAdminEmails.includes(user.email.toLowerCase())) {
            setIsAdmin(true);
            console.log('User is admin by email pattern (fallback)');
          } else {
            console.log('User is not admin');
          }
        }
      } catch (error) {
        console.error('Database admin check failed, using email fallback:', error);
        // If database check fails completely, use email fallback
        if (user.email && superAdminEmails.includes(user.email.toLowerCase())) {
          setIsAdmin(true);
          console.log('User is admin by email pattern (database error fallback)');
        }
      }
    }
    
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const isSuperAdmin = Boolean(
    user?.email && superAdminEmails.includes(user.email.toLowerCase())
  );

  const baseTabs = [
    { id: 'editor', name: 'Edit Card', icon: '✏️' },
    { id: 'analytics', name: 'Analytics', icon: '📊' },
    { id: 'sharing', name: 'Share', icon: '🔗' },
    ...(isAdmin ? [{ id: 'admin', name: 'Admin', icon: '⚙️' }] : [])
  ];

  const tabs = baseTabs;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <img src="/PCard logo.png" alt="PCard Logo" className="h-8 w-8 sm:h-12 sm:w-12" />
            <h1 className="text-lg sm:text-2xl font-bold text-blue-600 hidden sm:block">Pcard Your Digital Business Card</h1>
            <h1 className="text-lg font-bold text-blue-600 sm:hidden">Pcard</h1>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="hidden md:block">
              <span className="text-gray-600 text-sm sm:text-base">Welcome, {user.email}</span>
              {isSuperAdmin && (
                <span className="ml-2 bg-purple-100 text-purple-800 text-xs font-semibold px-2 py-1 rounded-full">
                  👑 SuperAdmin
                </span>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="px-2 py-1 sm:px-4 sm:py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>
      
      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Welcome back!</h2>
          <p className="text-gray-600 text-sm sm:text-base">Create and manage your digital business card</p>
        </div>
        
        {/* Tabs */}
        <div className="mb-6 sm:mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors flex items-center space-x-1 sm:space-x-2 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="text-base sm:text-lg">{tab.icon}</span>
                  <span className="hidden sm:inline">{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'editor' && <CardEditor userId={user.id} />}
          {activeTab === 'analytics' && <AnalyticsDashboard userId={user.id} />}
          {activeTab === 'sharing' && <CardSharing userId={user.id} refreshKey={refreshSharing} />}
          {activeTab === 'admin' && isAdmin && <UserManagement />}
        </div>
      </div>
    </div>
  );
}

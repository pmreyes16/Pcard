import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import AuthPage from './Auth/AuthPage';
import Dashboard from './Dashboard';
import PublicCard from './PublicCard';

const AppLayout: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'auth' | 'dashboard' | 'public'>('auth');

  useEffect(() => {
    checkUser();
    
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event, session?.user?.email || 'no user');
      
      setUser(session?.user || null);
      if (session?.user) {
        setView('dashboard');
      } else {
        setView('auth');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    try {
      console.log('Checking current user...');
      
      // First check if we have a session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        setUser(null);
      } else if (session?.user) {
        console.log('Found active session for:', session.user.email);
        setUser(session.user);
      } else {
        console.log('No active session found');
        setUser(null);
      }
      
      const path = window.location.pathname;
      if (path.startsWith('/card/')) {
        setView('public');
      } else if (session?.user) {
        setView('dashboard');
      } else {
        setView('auth');
      }
    } catch (error) {
      console.error('Unexpected error checking user:', error);
      setUser(null);
      setView('auth');
    }
    
    setLoading(false);
  };

  const handleAuthSuccess = () => {
    setView('dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (view === 'public') {
    const userId = window.location.pathname.split('/card/')[1];
    return <PublicCard userId={userId} />;
  }

  if (view === 'auth' || !user) {
    return <AuthPage onSuccess={handleAuthSuccess} />;
  }

  return <Dashboard />;
};

export default AppLayout;

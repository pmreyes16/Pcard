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
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    
    const path = window.location.pathname;
    if (path.startsWith('/card/')) {
      setView('public');
    } else if (user) {
      setView('dashboard');
    } else {
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

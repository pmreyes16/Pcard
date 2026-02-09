import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';

interface LoginFormProps {
  onSuccess: () => void;
  onForgotPassword?: () => void;
}

export default function LoginForm({ onSuccess, onForgotPassword }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Handle both username and email format login
      let emailToUse = username;
      
      // If username doesn't contain @, convert it to the email format we use for invited users
      if (!username.includes('@')) {
        emailToUse = `${username}@pcard-user.local`;
      }

      console.log('Attempting login with email:', emailToUse);

      const { error } = await supabase.auth.signInWithPassword({ 
        email: emailToUse, 
        password 
      });
      
      if (error) {
        // Try with original username if the converted email fails
        if (!username.includes('@')) {
          console.log('Retrying with original username as email...');
          const { error: retryError } = await supabase.auth.signInWithPassword({ 
            email: username, 
            password 
          });
          
          if (retryError) {
            throw retryError;
          } else {
            onSuccess();
            return;
          }
        } else {
          throw error;
        }
      } else {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-3 sm:space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
          required
        />
      </div>
      {error && <p className="text-red-500 text-xs sm:text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm sm:text-base"
      >
        {loading ? 'Logging in...' : 'Login'}
      </button>
      
      <div className="text-center space-y-2">
        {onForgotPassword && (
          <button 
            type="button" 
            onClick={onForgotPassword} 
            className="text-blue-600 hover:text-blue-700 text-xs sm:text-sm"
          >
            Forgot your password?
          </button>
        )}
      </div>
    </form>
  );
}

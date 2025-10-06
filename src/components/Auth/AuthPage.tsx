import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import LoginForm from './LoginForm';

interface AuthPageProps {
  onSuccess: () => void;
}

export default function AuthPage({ onSuccess }: AuthPageProps) {
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      setResetMessage('Please enter your email address');
      return;
    }

    setResetLoading(true);
    setResetMessage('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setResetMessage('Error: ' + error.message);
      } else {
        setResetMessage('Password reset email sent! Check your inbox.');
      }
    } catch (error) {
      setResetMessage('An unexpected error occurred. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  const renderForgotPasswordForm = () => (
    <form onSubmit={handleForgotPassword} className="space-y-3 sm:space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email Address
        </label>
        <input
          type="email"
          value={resetEmail}
          onChange={(e) => setResetEmail(e.target.value)}
          className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
          placeholder="Enter your email address"
          required
        />
      </div>
      
      {resetMessage && (
        <div className={`p-3 rounded-lg text-xs sm:text-sm ${
          resetMessage.startsWith('Error') 
            ? 'bg-red-50 text-red-700 border border-red-200' 
            : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          {resetMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={resetLoading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm sm:text-base"
      >
        {resetLoading ? 'Sending...' : 'Send Reset Email'}
      </button>

      <div className="text-center space-y-2">
        <button
          type="button"
          onClick={() => {
            setIsForgotPassword(false);
            setResetMessage('');
            setResetEmail('');
          }}
          className="text-blue-600 hover:text-blue-700 text-xs sm:text-sm"
        >
          Back to Login
        </button>
      </div>
    </form>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center px-4 py-6 sm:py-12">
      <div className="max-w-md w-full">
        <div className="text-center mb-6 sm:mb-8">
          <img src="/PCard logo.png" alt="PCard Logo" className="h-24 w-24 sm:h-32 sm:w-32 lg:h-48 lg:w-48 mx-auto mb-3 sm:mb-4" />
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-blue-900 mb-2">e-Business Card</h1>
          <p className="text-sm sm:text-base text-gray-600">Create your professional online presence</p>
        </div>
        
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6 text-center">
            {isForgotPassword ? 'Reset Password' : 'Welcome Back'}
          </h2>
          
          {isForgotPassword ? (
            renderForgotPasswordForm()
          ) : (
            <LoginForm
              onSuccess={onSuccess}
              onForgotPassword={() => setIsForgotPassword(true)}
            />
          )}
        </div>

        
      </div>
    </div>
  );
}

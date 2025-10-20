import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('Processing confirmation...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the token hash and type from URL parameters
        const tokenHash = searchParams.get('token_hash');
        const type = searchParams.get('type');
        const error = searchParams.get('error');

        if (error) {
          setStatus('Authentication error occurred');
          setTimeout(() => navigate('/?error=auth_failed'), 3000);
          return;
        }

        if (tokenHash && type) {
          // Verify the session after email confirmation
          const { data, error: sessionError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as any
          });

          if (sessionError) {
            console.error('Session verification error:', sessionError);
            setStatus('Failed to verify email confirmation');
            setTimeout(() => navigate('/?error=verification_failed'), 3000);
            return;
          }

          if (data.session) {
            setStatus('Email confirmed successfully! Redirecting to dashboard...');
            setTimeout(() => navigate('/dashboard'), 2000);
          } else {
            setStatus('Account confirmed! You can now log in.');
            setTimeout(() => navigate('/?message=confirmed'), 3000);
          }
        } else {
          // Check if there's already an active session
          const { data: sessionData } = await supabase.auth.getSession();
          
          if (sessionData.session) {
            setStatus('Already logged in! Redirecting to dashboard...');
            setTimeout(() => navigate('/dashboard'), 2000);
          } else {
            setStatus('No confirmation token found');
            setTimeout(() => navigate('/'), 3000);
          }
        }
      } catch (error: any) {
        console.error('Auth callback error:', error);
        setStatus('An error occurred during confirmation');
        setTimeout(() => navigate('/?error=callback_error'), 3000);
      }
    };

    handleAuthCallback();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full mx-4 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-6"></div>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Email Confirmation</h2>
        <p className="text-gray-600">{status}</p>
        <div className="mt-6">
          <button
            onClick={() => navigate('/')}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            Return to Home
          </button>
        </div>
      </div>
    </div>
  );
}
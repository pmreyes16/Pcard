import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { UserCheck, AlertCircle } from 'lucide-react';

interface InvitationData {
  token: string;
  username: string;
  password: string;
  expires_at: string;
  used: boolean;
}

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (token) {
      validateInvitation(token);
    }
  }, [token]);

  const validateInvitation = async (inviteToken: string) => {
    try {
      // Use the check function first to avoid consuming the invitation
      const { data: checkResult, error: checkError } = await supabase
        .rpc('check_invitation_status', { invitation_token: inviteToken });

      if (checkError) {
        console.error('Error checking invitation:', checkError);
        setError('Failed to validate invitation');
        setLoading(false);
        return;
      }

      if (checkResult?.error) {
        setError(checkResult.error);
        setLoading(false);
        return;
      }

      if (checkResult?.valid) {
        setInvitation({
          token: inviteToken,
          username: checkResult.username,
          password: '', // We'll get the actual password from the database when creating account
          used: false,
          expires_at: checkResult.expires_at
        });
        setLoading(false);
      } else {
        setError('Invalid invitation');
        setLoading(false);
      }
    } catch (error: any) {
      console.error('Validation error:', error);
      setError('Failed to validate invitation: ' + error.message);
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!invitation) return;

    setCreating(true);
    setError('');

    try {
      // Step 1: Use our database function to validate and prepare the invitation
      const { data: validationResult, error: validationError } = await supabase
        .rpc('create_invited_user', {
          invitation_token: invitation.token,
          user_password: invitation.password
        });

      if (validationError) {
        console.log('Validation function failed:', validationError);
        setError('Database error: ' + validationError.message);
        return;
      }

      if (validationResult?.error) {
        setError(validationResult.error);
        return;
      }

      if (validationResult?.success) {
        console.log('Invitation validated:', validationResult);
        
        // Step 2: Create user with Supabase Auth using validated email
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: validationResult.email,
          password: invitation.password,
          options: {
            data: {
              username: validationResult.username,
              invited: true,
              email_confirmed: true // Try to force email as confirmed
            },
            emailRedirectTo: undefined, // Completely disable email redirect
            captchaToken: undefined
          }
        });

        if (authError) {
          console.error('Auth signup error:', authError);
          
          // If signup fails due to email confirmation, try to handle it
          if (authError.message.includes('rate limit')) {
            setError('Too many signup attempts. Please wait a few minutes and try again.');
          } else if (authError.message.includes('User already registered')) {
            setError('This invitation has already been used. Please try logging in instead.');
          } else if (authError.message.includes('confirmation')) {
            // If email confirmation is required, show success anyway
            setSuccess('Account created! Please check your email for confirmation, or try logging in directly.');
            setTimeout(() => {
              navigate('/');
            }, 3000);
            return;
          } else {
            setError('Failed to create account: ' + authError.message);
          }
          return;
        }

        console.log('Account created successfully:', authData);
        setSuccess('Account created successfully! You can now login with your credentials.');
        
        // Redirect to main page after a delay
        setTimeout(() => {
          navigate('/');
        }, 3000);
        return;
      }

      // If we get here, something unexpected happened
      setError('Unexpected error during account creation. Please try again.');

    } catch (error: any) {
      console.error('Account creation error:', error);
      if (error.message.includes('rate limit')) {
        setError('Too many attempts. Please wait a few minutes before trying again.');
      } else {
        setError('Failed to create account: ' + error.message);
      }
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Validating invitation...</p>
        </div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Invalid Invitation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button 
              onClick={() => navigate('/')} 
              className="w-full mt-4"
              variant="outline"
            >
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <img src="/PCard logo.png" alt="PCard Logo" className="h-24 w-24 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-blue-900 mb-2">Welcome to PCard</h1>
          <p className="text-gray-600">You've been invited to create an account</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Account Setup
            </CardTitle>
            <CardDescription>
              Your account credentials have been pre-configured
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {invitation && (
              <>
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input
                    value={invitation.username}
                    readOnly
                    className="bg-gray-50"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input
                    value="••••••••"
                    readOnly
                    type="password"
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-gray-500">
                    Your password has been set. You can change it after logging in.
                  </p>
                </div>

                <div className="text-sm text-gray-500">
                  <p>Invitation expires: {new Date(invitation.expires_at).toLocaleDateString()}</p>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert>
                    <UserCheck className="h-4 w-4" />
                    <AlertDescription>{success}</AlertDescription>
                  </Alert>
                )}

                <Button 
                  onClick={handleCreateAccount}
                  disabled={creating}
                  className="w-full"
                >
                  {creating ? 'Creating Account...' : 'Create My Account'}
                </Button>

                <div className="text-center">
                  <Button 
                    onClick={() => navigate('/')} 
                    variant="outline"
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
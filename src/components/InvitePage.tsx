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
      const { data, error } = await supabase
        .from('user_invitations')
        .select('*')
        .eq('token', inviteToken)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !data) {
        setError('Invalid or expired invitation link');
        setLoading(false);
        return;
      }

      setInvitation(data);
      setLoading(false);
    } catch (error: any) {
      setError('Failed to validate invitation: ' + error.message);
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!invitation) return;

    setCreating(true);
    setError('');

    try {
      // Create the user account with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitation.username, // Using username as email for simplicity
        password: invitation.password,
        options: {
          data: {
            username: invitation.username
          }
        }
      });

      if (authError) {
        throw authError;
      }

      // Mark the invitation as used
      const { error: updateError } = await supabase
        .from('user_invitations')
        .update({ used: true, used_at: new Date().toISOString() })
        .eq('token', invitation.token);

      if (updateError) {
        console.error('Failed to mark invitation as used:', updateError);
      }

      setSuccess('Account created successfully! You can now login with your credentials.');
      
      // Redirect to main page after a delay
      setTimeout(() => {
        navigate('/');
      }, 3000);

    } catch (error: any) {
      setError('Failed to create account: ' + error.message);
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
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { emailService } from '../lib/emailService';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Copy, CheckCircle, UserPlus, Mail } from 'lucide-react';
import { Checkbox } from './ui/checkbox';

interface GeneratedInvite {
  token: string;
  username: string;
  password: string;
  inviteUrl: string;
  createdAt: string;
}

export default function AdminPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [generatedInvite, setGeneratedInvite] = useState<GeneratedInvite | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const generateInviteToken = () => {
    return 'inv_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  };

  const handleGenerateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please provide both username and password');
      return;
    }

    if (sendEmail && !recipientEmail) {
      setError('Please provide recipient email to send invitation');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = generateInviteToken();
      const inviteUrl = `${window.location.origin}/invite/${token}`;
      
      // Store the invitation in the database
      const { error: dbError } = await supabase
        .from('user_invitations')
        .insert([
          {
            token,
            username,
            password, // In production, this should be hashed
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
            used: false
          }
        ]);

      if (dbError) {
        console.error('Database error:', dbError);
        throw new Error(`Database error: ${dbError.message}`);
      }

      const invite: GeneratedInvite = {
        token,
        username,
        password,
        inviteUrl,
        createdAt: new Date().toISOString()
      };

      // Send email if requested
      if (sendEmail && recipientEmail) {
        try {
          const emailSent = await emailService.sendInvitationEmail({
            recipientEmail,
            recipientName,
            inviteUrl,
            username,
            password,
            senderName: 'PCard Admin'
          });

          if (emailSent) {
            setSuccess('Invitation created and email sent successfully!');
          } else {
            setSuccess('Invitation created successfully! Email service not configured - you can copy the details below to send manually.');
          }
        } catch (emailError) {
          console.error('Email error:', emailError);
          setSuccess('Invitation created successfully! Email sending failed - you can copy the details below to send manually.');
        }
      } else {
        setSuccess('Invitation created successfully!');
      }

      setGeneratedInvite(invite);
      setUsername('');
      setPassword('');
      setRecipientEmail('');
      setRecipientName('');
    } catch (error: any) {
      setError('Failed to create invitation: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <img src="/PCard logo.png" alt="PCard Logo" className="h-16 w-16 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-blue-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Generate user invitations with predefined credentials</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Generate Invitation Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Generate User Invitation
              </CardTitle>
              <CardDescription>
                Create a unique invitation URL with predefined username and password
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGenerateInvite} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    minLength={6}
                    required
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="sendEmail" 
                    checked={sendEmail}
                    onCheckedChange={(checked) => setSendEmail(checked as boolean)}
                  />
                  <Label htmlFor="sendEmail" className="text-sm font-medium">
                    Send invitation email
                  </Label>
                </div>

                {sendEmail && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="recipientEmail">Recipient Email *</Label>
                      <Input
                        id="recipientEmail"
                        type="email"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        placeholder="user@example.com"
                        required={sendEmail}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="recipientName">Recipient Name (Optional)</Label>
                      <Input
                        id="recipientName"
                        type="text"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        placeholder="John Doe"
                      />
                    </div>
                  </>
                )}

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>{success}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? 'Generating...' : (
                    <>
                      {sendEmail ? <Mail className="h-4 w-4 mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                      {sendEmail ? 'Generate & Send Invitation' : 'Generate Invitation'}
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Generated Invitation Details */}
          {generatedInvite && (
            <Card>
              <CardHeader>
                <CardTitle>Generated Invitation</CardTitle>
                <CardDescription>
                  Share this information with the new user
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Invitation URL</Label>
                  <div className="flex gap-2">
                    <Input
                      value={generatedInvite.inviteUrl}
                      readOnly
                      className="bg-gray-50"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(generatedInvite.inviteUrl, 'url')}
                    >
                      {copiedField === 'url' ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Username</Label>
                  <div className="flex gap-2">
                    <Input
                      value={generatedInvite.username}
                      readOnly
                      className="bg-gray-50"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(generatedInvite.username, 'username')}
                    >
                      {copiedField === 'username' ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Password</Label>
                  <div className="flex gap-2">
                    <Input
                      value={generatedInvite.password}
                      readOnly
                      type="password"
                      className="bg-gray-50"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(generatedInvite.password, 'password')}
                    >
                      {copiedField === 'password' ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="text-sm text-gray-500">
                  <p>Created: {new Date(generatedInvite.createdAt).toLocaleString()}</p>
                  <p>Expires: 7 days from creation</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
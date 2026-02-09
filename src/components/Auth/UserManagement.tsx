import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from '@/components/ui/use-toast';

interface User {
  id: string;
  email: string;
  created_at: string;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      console.log('Fetching users from business_cards table...');
      
      // Primary source: Get users from business_cards table (active users with cards)
      const { data: cardUsers, error: cardError } = await supabase
        .from('business_cards')
        .select('user_id, email, full_name, created_at, updated_at')
        .order('created_at', { ascending: false });

      console.log('Business cards query result:', { cardUsers, cardError });

      // Secondary source: Get additional users from user_profiles
      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('Profile query result:', { profiles, profileError });

      let allUsers: User[] = [];

      // Process business_cards data first (priority source)
      if (cardUsers && !cardError) {
        const cardUserProfiles = cardUsers
          .filter(card => card.email) // Only include cards with email
          .map(card => ({
            id: card.user_id,
            email: card.email,
            created_at: card.created_at,
            email_confirmed_at: card.created_at, // Assume confirmed since they created a card
            last_sign_in_at: card.updated_at || card.created_at
          }));
        
        allUsers = [...cardUserProfiles];
        console.log('Users from business_cards:', cardUserProfiles);
      }

      // Add users from user_profiles who don't already exist
      if (profiles && !profileError) {
        const additionalProfiles = profiles
          .filter(profile => !allUsers.some(existing => existing.id === profile.id))
          .map(profile => ({
            id: profile.id,
            email: profile.email || profile.username || 'No email',
            created_at: profile.created_at,
            email_confirmed_at: profile.created_at,
            last_sign_in_at: profile.updated_at || profile.created_at
          }));
        
        allUsers = [...allUsers, ...additionalProfiles];
        console.log('Additional users from user_profiles:', additionalProfiles);
      }

      // Remove duplicates based on email
      const uniqueUsers = allUsers.filter((user, index, self) => 
        index === self.findIndex(u => u.email === user.email)
      );

      console.log('Final users list:', uniqueUsers);
      setUsers(uniqueUsers);

      if (uniqueUsers.length === 0) {
        console.warn('No users found. Check that business_cards table has data or users have been created.');
        if (cardError) {
          console.error('Business cards query failed:', cardError);
        }
        if (profileError) {
          console.error('User profiles query failed:', profileError);
        }
      }

      // Show error if business_cards query failed (primary source)
      if (cardError) {
        console.error('Failed to fetch from business_cards:', cardError);
        toast({
          title: 'Warning',
          description: 'Could not fetch data from business_cards table. Some contacts may not be visible.',
          variant: 'destructive',
        });
      }

      // Show error if both queries failed
      if (cardError && profileError) {
        toast({
          title: 'Error',
          description: 'Failed to fetch users from both business_cards and user_profiles tables',
          variant: 'destructive',
        });
      }

    } catch (error) {
      console.error('Error in fetchUsers:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newUserEmail || !newUserPassword) {
      toast({
        title: 'Error',
        description: 'Please enter both email and password',
        variant: 'destructive',
      });
      return;
    }

    if (!newUserEmail.includes('@')) {
      toast({
        title: 'Error',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }

    if (newUserPassword.length < 6) {
      toast({
        title: 'Error',
        description: 'Password must be at least 6 characters long',
        variant: 'destructive',
      });
      return;
    }

    // Check if email already exists
    const emailExists = users.some(user => 
      user.email.toLowerCase() === newUserEmail.trim().toLowerCase()
    );
    
    if (emailExists) {
      toast({
        title: 'Email Already Exists',
        description: `A contact with email ${newUserEmail} already exists in your system. Please use a different email address.`,
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);

    try {
      // Call the Supabase Edge Function or RPC to create user
      const { data, error } = await supabase.rpc('create_test_user', {
        user_email: newUserEmail.trim().toLowerCase(),
        user_password: newUserPassword
      });

      if (error) {
        console.error('Error creating user:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to create user',
          variant: 'destructive',
        });
      } else if (data && data.success) {
        toast({
          title: 'Success! 🎉',
          description: `Contact ${newUserEmail} created successfully. They can now log in and create their business card.`,
        });
        setNewUserEmail('');
        setNewUserPassword('');
        fetchUsers(); // Refresh the user list
      } else {
        // Handle specific error cases
        let errorMessage = data?.message || 'Failed to create user';
        
        if (errorMessage.includes('already exists')) {
          errorMessage = `A contact with email ${newUserEmail} already exists. Please use a different email address or check the contact list below.`;
        }
        
        toast({
          title: 'Unable to Create Contact',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const sendPasswordReset = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success',
          description: `Password reset email sent to ${email}`,
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send password reset email',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      {/* Header Section */}
      <div className="mb-6">
        <h2 className="text-xl sm:text-2xl font-bold mb-2">👥 Contact Management</h2>
        <p className="text-gray-600">Create and manage users who can create digital business cards</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Contacts</p>
              <p className="text-2xl font-bold text-blue-600">{users.length}</p>
            </div>
            <div className="text-blue-500 text-2xl">👥</div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Users</p>
              <p className="text-2xl font-bold text-green-600">
                {users.filter(u => u.email_confirmed_at).length}
              </p>
            </div>
            <div className="text-green-500 text-2xl">✅</div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Super Admin</p>
              <p className="text-2xl font-bold text-purple-600">You</p>
            </div>
            <div className="text-purple-500 text-2xl">👑</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 sm:p-6 mb-6 border border-green-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-green-800 mb-1">➕ Add New Contact</h3>
            <p className="text-sm text-green-700">
              Create a new user account for someone to manage their business card
            </p>
          </div>
          <button
            onClick={() => {
              const form = document.getElementById('create-user-form');
              if (form) form.scrollIntoView({ behavior: 'smooth' });
            }}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2 shadow-lg"
          >
            👤 Create Contact Now
          </button>
        </div>
      </div>
      
      {/* Create New Contact/User Form */}
      <div id="create-user-form" className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">🆕 Contact Creation Form</h3>
        <p className="text-sm text-gray-600 mb-4">
          Fill out the form below to create a new user account. They will be able to login and create their digital business card.
        </p>
        <form onSubmit={createUser} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="user@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Minimum 6 characters"
                minLength={6}
                required
              />
            </div>
          </div>
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={creating}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-semibold"
            >
              {creating && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              {creating ? 'Creating Contact...' : '👤 Create New Contact'}
            </button>
            <button
              type="button"
              onClick={() => {
                setNewUserEmail('');
                setNewUserPassword('');
              }}
              className="bg-gray-300 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-400 text-sm font-semibold"
            >
              Clear Form
            </button>
          </div>
        </form>
        
        {/* Existing Emails Helper */}
        {users.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-medium text-blue-800 mb-2">📧 Existing Email Addresses:</h4>
            <div className="flex flex-wrap gap-1">
              {users.slice(0, 10).map((user, index) => (
                <span 
                  key={index} 
                  className="inline-block bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full"
                >
                  {user.email}
                </span>
              ))}
              {users.length > 10 && (
                <span className="text-blue-600 text-xs px-2 py-1">
                  +{users.length - 10} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Users List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">📋 All Contacts ({users.length})</h3>
            <p className="text-sm text-gray-600 mt-1">
              All users who can create and manage business cards
            </p>
          </div>
          <button
            onClick={() => {
              setLoading(true);
              fetchUsers();
            }}
            className="bg-blue-100 text-blue-600 px-3 py-2 rounded-lg hover:bg-blue-200 transition-colors text-sm flex items-center gap-1"
          >
            🔄 Refresh
          </button>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading contacts...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-400 text-4xl mb-4">👥</div>
            <p className="text-gray-500 text-lg">No contacts found</p>
            <p className="text-gray-400 text-sm mb-4">This could mean:</p>
            <ul className="text-gray-400 text-sm text-left max-w-md mx-auto mb-4">
              <li>• No contacts have been created yet</li>
              <li>• Database connection issue</li>
              <li>• Check browser console for errors</li>
            </ul>
            <button
              onClick={() => {
                setLoading(true);
                fetchUsers();
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Sign In
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.email_confirmed_at ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.email_confirmed_at ? 'Confirmed' : 'Unconfirmed'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => sendPasswordReset(user.email)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Send Reset Email
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
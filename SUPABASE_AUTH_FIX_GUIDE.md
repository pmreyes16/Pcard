# Supabase Configuration Fix Guide

## Problem
The invitation signup is failing with a 500 error because of authentication configuration issues.

## Solutions Implemented

### 1. Updated InvitePage.tsx
- Fixed email format handling (converts username to email format)
- Added better error handling for different error types
- Added console logging for debugging
- Disabled email confirmation for invited users

### 2. Updated LoginForm.tsx
- Now handles both username and email format login
- Tries converted email format first, then falls back to original username
- Added better error handling and logging

### 3. Updated Supabase Client Configuration
- Added proper auth configuration options
- Enabled auto refresh tokens and session persistence

## Supabase Dashboard Configuration

You need to check these settings in your Supabase dashboard:

### 1. Authentication Settings
Go to Authentication > Settings in your Supabase dashboard and check:

- **Enable email confirmations**: Should be DISABLED for invited users
- **Enable phone confirmations**: Should be DISABLED
- **Enable sign ups**: Should be ENABLED (even though we removed public signup)
- **Email confirmation template**: Can be customized if needed

### 2. SQL Scripts to Run

Run the provided `supabase-auth-fix.sql` script in your Supabase SQL editor:

```sql
-- Check current users and invitations
SELECT * FROM auth.users ORDER BY created_at DESC LIMIT 5;
SELECT * FROM user_invitations ORDER BY created_at DESC;
```

### 3. Testing the Fix

1. Generate a new invitation from the admin page
2. Copy the invitation URL
3. Open it in a new browser/incognito window
4. Try to create the account
5. Check the browser console for any error messages

## Common Issues and Solutions

### Issue: "User already registered"
- The user might already exist in the system
- Check the auth.users table for duplicate entries
- Clean up test accounts if needed

### Issue: "Invalid email format"
- The username conversion should handle this now
- Make sure usernames don't contain special characters

### Issue: "Email confirmation required"
- Disable email confirmations in Supabase settings
- Or modify the signup options to skip confirmation

## Alternative Approach

If the above doesn't work, you can:

1. Use the `handle_invited_signup` function created in the SQL script
2. Call it from the frontend instead of direct `supabase.auth.signUp`
3. This gives more control over the signup process

## Monitoring

After implementing these fixes:
1. Check the browser console for any errors
2. Monitor the Supabase Auth logs in the dashboard
3. Test with different username formats
4. Verify that successful signups mark invitations as used

## Next Steps

1. Apply the SQL script to your Supabase database
2. Check the authentication settings in your dashboard
3. Test the invitation flow
4. Report any remaining issues for further debugging
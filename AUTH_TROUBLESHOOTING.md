# Authentication Troubleshooting Guide

## Current Error: 400 Bad Request on /auth/v1/token

The 400 errors on the Supabase authentication endpoint typically indicate one of the following issues:

### 1. **Check Supabase Project Settings**

In your Supabase Dashboard:

1. **Go to Authentication > Settings**
2. **Verify these settings:**
   - Site URL: Should include your domain (e.g., `http://localhost:5173` for dev)
   - Additional redirect URLs: Add your production domain
   - Email confirmation: Check if it's enabled
   - Email templates: Ensure they're configured

3. **Check Authentication > Users**
   - Verify if users exist
   - Check if email confirmation is required
   - Look for any disabled users

### 2. **Common Authentication Issues**

#### **Invalid Credentials**
- User doesn't exist
- Wrong password
- Email not confirmed (if email confirmation is enabled)

#### **Configuration Issues**
- Wrong Supabase URL or anon key
- Site URL not configured in Supabase dashboard
- Email confirmation required but user hasn't confirmed

#### **Rate Limiting**
- Too many failed login attempts
- IP address temporarily blocked

### 3. **Debugging Steps**

#### **Step 1: Verify Supabase Configuration**
```bash
# Check if your environment variables are correct
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_ANON_KEY
```

#### **Step 2: Test with Supabase Dashboard**
1. Go to Supabase Dashboard > Authentication > Users
2. Try creating a user manually
3. Test login with that user

#### **Step 3: Check Browser Console**
- Open browser DevTools
- Look for detailed error messages
- Check Network tab for failed requests

#### **Step 4: Run Debug SQL Queries**
Run the queries in `debug-auth.sql` in your Supabase SQL Editor

### 4. **Quick Fixes**

#### **Create a Test User**
1. Go to Supabase Dashboard > Authentication > Users
2. Click "Add user"
3. Enter email and password
4. Set "Email confirm" to true
5. Click "Create user"

#### **Update Site URL**
1. Go to Authentication > Settings
2. Update Site URL to match your current domain
3. Add redirect URLs for both dev and production

#### **Reset User Password**
1. In Authentication > Users
2. Find the user
3. Click the three dots > "Reset password"
4. User will receive reset email

### 5. **Testing Authentication**

Try these test credentials after creating a user:
- Email: test@example.com
- Password: testpassword123

### 6. **Environment Setup**

Make sure your `.env` file (if using one) has:
```
VITE_SUPABASE_URL=https://cuspqjialyzpxgegjsgy.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### 7. **Network Issues**

If you're still getting 400 errors:
1. Check if Supabase is accessible from your network
2. Try from a different network/device
3. Check for any corporate firewalls blocking the requests

### 8. **Contact Information**

If none of these steps resolve the issue:
1. Check the Supabase status page
2. Review Supabase documentation on authentication
3. Check the Supabase community forums

Remember to check the browser console for more detailed error messages that can help pinpoint the exact issue.
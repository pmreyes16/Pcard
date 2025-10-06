# Admin User Setup Guide

## Quick Setup Instructions (UPDATED - GUARANTEED TO WORK)

### Step 1: Set Up Admin System

1. **Open Supabase SQL Editor**
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor

2. **Run the Simple Setup Script**
   - Copy ALL the contents of `simple-admin-setup.sql`
   - Paste into SQL Editor
   - Click "Run" to execute

### Step 2: Create Admin User

1. **Go to Supabase Dashboard**
   - Click "Authentication" in the sidebar
   - Click "Users" tab
   - Click "Create User" button

2. **Fill in User Details**
   ```
   Email: admin@pcard.com
   Password: AdminPass123!
   Confirm Password: AdminPass123!
   ```
   - Click "Create User"

### Step 3: Make User Admin

1. **Back to SQL Editor**
   - Run this single command:
   ```sql
   SELECT public.make_user_admin('admin@pcard.com');
   ```

2. **Verify Success**
   - You should see: `"SUCCESS: User admin@pcard.com is now an admin"`

## Your Admin Credentials

```
Username: admin@pcard.com
Password: AdminPass123!
```

## Login to Admin Panel

1. **Go to your PCard app** (e.g., `http://localhost:3000`)
2. **Login with admin credentials**
3. **Look for Admin tab** in the Dashboard
4. **Generate user invitations** from the Admin tab

## Helpful SQL Commands

### Check if someone is admin:
```sql
SELECT public.is_admin('admin@pcard.com');
```

### Make existing user an admin:
```sql
SELECT public.make_user_admin('someone@example.com', 'admin');
```

### View all admin users:
```sql
SELECT au.*, u.email, u.created_at as user_created_at 
FROM public.admin_users au 
JOIN auth.users u ON au.user_id = u.id;
```

### Remove admin status:
```sql
DELETE FROM public.admin_users WHERE email = 'user@example.com';
```

## Security Notes

- Change the default password immediately after first login
- The admin system now uses a proper database table instead of email patterns
- Admin status is checked against the `admin_users` table
- You can have multiple admin users with different roles ('admin' or 'super_admin')

## Troubleshooting

**If admin tab doesn't appear:**
1. Verify the user exists in `admin_users` table
2. Check browser console for errors
3. Ensure the database script ran successfully
4. Try logging out and back in

**If login fails:**
1. Verify user exists in Supabase Authentication
2. Check that email/password are correct
3. Ensure the user account is confirmed/enabled
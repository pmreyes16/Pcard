# Resend Email Integration Setup

## 🚀 **Serverless Function Implementation**

I've created a proper Resend email integration using Vercel serverless functions. This solves the CORS issue and keeps your API key secure.

## 📁 **Files Created/Updated:**

### 1. `/api/send-invite.js` - Serverless Function
- Handles email sending on the backend
- Keeps API key secure (server-side only)
- Properly formatted HTML emails

### 2. Updated Email Service
- Now calls the serverless function instead of Resend API directly
- No more CORS issues
- Secure API key handling

## ⚙️ **Setup Instructions:**

### Step 1: Get Resend API Key
1. Go to [resend.com](https://resend.com)
2. Sign up and verify your account
3. Get your API key from the dashboard

### Step 2: Add Environment Variable
Add this to your Vercel deployment environment variables:

```
RESEND_API_KEY=re_your_actual_api_key_here
```

**For Local Development:**
Create a `.env.local` file in your project root:
```
RESEND_API_KEY=re_your_actual_api_key_here
```

### Step 3: Update Domain Settings
In `/api/send-invite.js`, change this line:
```javascript
from: 'PCard Team <noreply@yourdomain.com>', // Replace with your actual domain
```

To your actual domain:
```javascript
from: 'PCard Team <noreply@pcard-lemon.vercel.app>',
```

### Step 4: Enable Email Service
Update the email configuration in `src/lib/emailService.ts`:

```typescript
const emailConfig: EmailConfig = {
  provider: 'resend', // Change from 'disabled' to 'resend'
  apiKey: '', // Not needed for serverless function approach
  fromEmail: 'noreply@pcard-lemon.vercel.app',
  fromName: 'PCard Team'
};
```

## 🧪 **Testing:**

### Local Testing:
1. Install dependencies: `npm install`
2. Add `.env.local` with your API key
3. Run: `npm run dev`
4. Test invitation generation with email enabled

### Production Testing:
1. Set environment variable in Vercel dashboard
2. Deploy the changes
3. Test invitation generation

## 🔒 **Security Benefits:**

- ✅ **API key stays server-side** (never exposed to browser)
- ✅ **No CORS issues** (backend handles external API calls)
- ✅ **Vercel environment variables** are encrypted and secure

## 📧 **Email Features:**

- Professional HTML email template
- Account credentials included
- Responsive design
- Branded styling
- 7-day expiration notice

## 🚨 **Important Notes:**

1. **Domain Verification**: For production, verify your domain in Resend dashboard
2. **Rate Limits**: Resend has rate limits (check their pricing)
3. **Bounce Handling**: Consider implementing bounce/unsubscribe handling
4. **Testing**: Use a test email first before production

## 🔄 **Next Steps:**

1. Get your Resend API key
2. Add it to Vercel environment variables
3. Update the domain in the serverless function
4. Enable the email service
5. Test the invitation flow

The email system will now work properly without CORS issues! 🎉
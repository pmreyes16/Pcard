# Custom Email Setup Guide for PCard

## Overview
This guide shows you how to set up custom domain email sending for PCard invitations instead of using Supabase's default email system.

## 🔧 Method 1: Configure Supabase SMTP (Easiest)

### Step 1: Email Provider Setup
Choose one of these providers:

#### **Gmail/Google Workspace**
1. Enable 2-Factor Authentication
2. Generate App Password: Google Account → Security → App passwords
3. Use these settings:
   ```
   SMTP Host: smtp.gmail.com
   SMTP Port: 587
   Username: your-email@yourdomain.com
   Password: [16-character app password]
   ```

#### **Microsoft 365/Outlook**
```
SMTP Host: smtp-mail.outlook.com
SMTP Port: 587
Username: your-email@yourdomain.com
Password: [your password]
```

#### **Other Providers**
- **AWS SES**: smtp.email.us-east-1.amazonaws.com:587
- **Mailgun**: smtp.mailgun.org:587
- **SendGrid**: smtp.sendgrid.net:587

### Step 2: Configure in Supabase
1. Go to Supabase Dashboard → Settings → Authentication
2. Scroll to "SMTP Settings"
3. Enter your provider details:
   ```
   SMTP Host: [from above]
   SMTP Port: [from above]
   SMTP User: your-email@yourdomain.com
   SMTP Pass: [your password/app password]
   Sender Name: PCard Team
   Sender Email: noreply@yourdomain.com
   ```
4. Click "Save"

### Step 3: Customize Email Templates
1. Go to Authentication → Email Templates
2. Customize the "Invite User" template:
   ```html
   <h2>Welcome to PCard!</h2>
   <p>You've been invited to join PCard. Click the link below to get started:</p>
   <p><a href="{{ .ConfirmationURL }}">Accept Invitation</a></p>
   ```

## 🔧 Method 2: Custom Email Service (Advanced)

### Step 1: Choose Email Provider

#### **Resend (Recommended)**
1. Sign up at [resend.com](https://resend.com)
2. Add your domain and verify DNS
3. Create API key
4. Cost: $20/month for 100k emails

#### **SendGrid**
1. Sign up at [sendgrid.com](https://sendgrid.com)
2. Verify domain or single sender
3. Create API key
4. Cost: Free tier available

### Step 2: Environment Setup
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Configure your provider:
   ```env
   REACT_APP_EMAIL_PROVIDER=resend
   REACT_APP_EMAIL_API_KEY=re_xxxxxxxxxx
   REACT_APP_FROM_EMAIL=noreply@yourdomain.com
   REACT_APP_FROM_NAME=PCard Team
   ```

### Step 3: Test Email Sending
1. The AdminPage now has email options
2. Check "Send invitation email" when creating invitations
3. Enter recipient email and name
4. System will send beautiful HTML emails automatically

## 📧 Email Template Features

The custom email includes:
- ✅ Professional HTML design
- ✅ Your domain branding
- ✅ Login credentials
- ✅ Direct invitation link
- ✅ Mobile-responsive design
- ✅ Security best practices

## 🔒 Domain Authentication Setup

### For Resend:
1. Add these DNS records:
   ```
   Type: TXT
   Name: @
   Value: resend-verification=[code]
   
   Type: MX
   Name: @
   Value: feedback-smtp.resend.com
   ```

### For SendGrid:
1. Add these DNS records:
   ```
   Type: CNAME
   Name: s1._domainkey.yourdomain.com
   Value: s1.domainkey.sendgrid.net
   
   Type: CNAME
   Name: s2._domainkey.yourdomain.com
   Value: s2.domainkey.sendgrid.net
   ```

## 🚀 Testing Your Setup

### Test SMTP Configuration:
1. Go to Supabase Authentication → Users
2. Create a test user
3. Check if verification email arrives from your domain

### Test Custom Email Service:
1. Go to Admin panel in your app
2. Create invitation with email enabled
3. Check recipient inbox for branded email

## 🔍 Troubleshooting

### Common Issues:

**SMTP Authentication Failed**
- Check username/password
- Ensure 2FA + App Password for Gmail
- Verify SMTP settings

**Emails Going to Spam**
- Set up SPF record: `v=spf1 include:_spf.google.com ~all`
- Set up DKIM (provider-specific)
- Set up DMARC: `v=DMARC1; p=quarantine;`

**DNS Issues**
- Wait 24-48 hours for DNS propagation
- Use DNS checker tools
- Verify all required records

## 💰 Cost Comparison

| Provider | Free Tier | Paid Plans |
|----------|-----------|------------|
| Supabase SMTP | ✅ Free | N/A |
| Resend | 3k emails/month | $20/month |
| SendGrid | 100 emails/day | $15/month |
| Gmail | ✅ Free | N/A |

## 📋 Recommended Setup

**For Small Teams (< 100 users):**
- Use Supabase SMTP with Gmail/Google Workspace
- Simple, free, reliable

**For Growing Companies:**
- Use Resend or SendGrid
- Better deliverability and analytics
- Professional email templates

**For Enterprise:**
- Use AWS SES or dedicated email infrastructure
- Advanced analytics and compliance features

Choose the method that best fits your needs and budget!
// Vercel Serverless Function for sending emails
// Place this file at: /api/send-invite.js

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { recipientEmail, recipientName, inviteUrl, username, password } = req.body;

    // Validate required fields
    if (!recipientEmail || !inviteUrl || !username || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: 'PCard Team <onboarding@pcard-lemon.vercel.app>',
      to: [recipientEmail],
      subject: 'Welcome to PCard',
      html: generateInvitationHTML({
        recipientEmail,
        recipientName,
        inviteUrl,
        username,
        password
      }),
      replyTo: 'onboarding@pcard-lemon.vercel.app',
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(500).json({ error: 'Failed to send email' });
    }

    return res.status(200).json({ success: true, messageId: data?.id });

  } catch (error) {
    console.error('Email sending error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function generateInvitationHTML(data) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to PCard</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .credentials { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #667eea; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Welcome to PCard!</h1>
                <p>Your digital business card account is ready</p>
            </div>
            <div class="content">
                <p>Hello${data.recipientName ? ` ${data.recipientName}` : ''},</p>
                <p>You've been invited to join PCard! Click the button below to complete your account setup:</p>
                
                <div style="text-align: center;">
                    <a href="${data.inviteUrl}" class="button">Complete Account Setup</a>
                </div>
                
                <div class="credentials">
                    <h3>Your Account Details:</h3>
                    <p><strong>Username:</strong> ${data.username}</p>
                    <p><strong>Password:</strong> ${data.password}</p>
                </div>
                
                <p>If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #667eea;">${data.inviteUrl}</p>
                
                <p style="margin-top: 30px; color: #666; font-size: 14px;">
                    This invitation will expire in 7 days. If you have any questions, please contact your administrator.
                </p>
            </div>
        </div>
    </body>
    </html>
  `;
}
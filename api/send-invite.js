// Vercel Serverless Function for sending emails
// Using CommonJS format for Vercel compatibility

const { Resend } = require('resend');

module.exports = async function handler(req, res) {
  // Enable CORS for all origins
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('=== EMAIL SERVICE HANDLER START ===');
    console.log('Request method:', req.method);
    console.log('Environment check:', {
      hasResendKey: !!process.env.RESEND_API_KEY,
      keyLength: process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.length : 0,
      keyPrefix: process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.substring(0, 10) + '...' : 'NOT_SET',
      nodeEnv: process.env.NODE_ENV,
      allEnvKeys: Object.keys(process.env).filter(key => key.includes('RESEND'))
    });

    // Check if Resend API key is available
    if (!process.env.RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY environment variable not set');
      return res.status(500).json({ 
        error: 'Email service not configured', 
        details: 'RESEND_API_KEY environment variable missing',
        availableEnvKeys: Object.keys(process.env).filter(key => key.includes('RESEND'))
      });
    }

    console.log('✅ API key found, initializing Resend...');
    const resend = new Resend(process.env.RESEND_API_KEY);
    console.log('✅ Resend instance created successfully');

    const { recipientEmail, recipientName, inviteUrl, username, password } = req.body;

    console.log('Request body received:', {
      recipientEmail: !!recipientEmail,
      recipientName: !!recipientName,
      inviteUrl: !!inviteUrl,
      username: !!username,
      password: !!password
    });

    // Validate required fields
    if (!recipientEmail || !inviteUrl || !username || !password) {
      console.error('Missing required fields');
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['recipientEmail', 'inviteUrl', 'username', 'password'],
        received: { 
          recipientEmail: !!recipientEmail, 
          inviteUrl: !!inviteUrl, 
          username: !!username, 
          password: !!password 
        }
      });
    }

    console.log('✅ Attempting to send email to:', recipientEmail);

    // Generate HTML content
    console.log('🔄 Generating email HTML...');
    const htmlContent = generateInvitationHTML({
      recipientEmail,
      recipientName,
      inviteUrl,
      username,
      password
    });
    console.log('✅ Email HTML generated, length:', htmlContent.length);

    // Send email using Resend
    const emailData = {
      from: 'PCard Team <onboarding@pcard-lemon.vercel.app>',
      to: [recipientEmail],
      subject: 'Welcome to PCard',
      html: htmlContent,
      replyTo: 'onboarding@pcard-lemon.vercel.app',
    };

    console.log('📧 Email data prepared:', {
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject,
      hasHtml: !!emailData.html,
      htmlLength: emailData.html.length
    });

    console.log('🚀 Calling Resend API...');
    const { data, error } = await resend.emails.send(emailData);
    console.log('📬 Resend API call completed');

    if (error) {
      console.error('❌ Resend API error:', error);
      return res.status(500).json({ 
        error: 'Failed to send email via Resend', 
        details: error.message || JSON.stringify(error),
        errorType: 'RESEND_API_ERROR'
      });
    }

    console.log('✅ Email sent successfully! Message ID:', data?.id);
    return res.status(200).json({ 
      success: true, 
      messageId: data?.id,
      recipient: recipientEmail,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('=== 💥 CRITICAL ERROR IN EMAIL SERVICE ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error details:', error);
    
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message || 'Unknown error occurred',
      errorType: error.name || 'UNKNOWN_ERROR',
      timestamp: new Date().toISOString()
    });
  }
};

function generateInvitationHTML(data) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to PCard</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
            .credentials { background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #667eea; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
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
                
                <div class="footer">
                    <p>This invitation will expire in 7 days. If you have any questions, please contact your administrator.</p>
                    <p>© ${new Date().getFullYear()} PCard. All rights reserved.</p>
                </div>
            </div>
        </div>
    </body>
    </html>
  `;
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
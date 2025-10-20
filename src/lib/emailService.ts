// Email service for sending custom invitation emails

interface EmailConfig {
  provider: 'resend' | 'sendgrid' | 'nodemailer' | 'disabled';
  apiKey: string;
  fromEmail: string;
  fromName: string;
}

interface InvitationEmailData {
  recipientEmail: string;
  recipientName?: string;
  inviteUrl: string;
  username: string;
  password: string;
  senderName?: string;
}

// Example using Resend (recommended for custom domains)
export class EmailService {
  private config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
  }

  async sendInvitationEmail(data: InvitationEmailData): Promise<boolean> {
    try {
      // If email service is disabled or not configured, return false
      if (this.config.provider === 'disabled' || !this.config.apiKey) {
        console.warn('Email service not configured. Skipping email send.');
        return false;
      }

      switch (this.config.provider) {
        case 'resend':
          return await this.sendWithResend(data);
        case 'sendgrid':
          return await this.sendWithSendGrid(data);
        default:
          throw new Error('Unsupported email provider');
      }
    } catch (error) {
      console.error('Failed to send invitation email:', error);
      return false;
    }
  }

  private async sendWithResend(data: InvitationEmailData): Promise<boolean> {
    const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    
    if (isProduction) {
      // Production: Use Vercel serverless function
      try {
        const response = await fetch('/api/send-invite', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            recipientEmail: data.recipientEmail,
            recipientName: data.recipientName,
            inviteUrl: data.inviteUrl,
            username: data.username,
            password: data.password,
            senderName: data.senderName
          }),
        });

        return response.ok;
      } catch (error) {
        console.error('Serverless function error:', error);
        return false;
      }
    } else {
      // Local development: Direct API call (if API key is available)
      if (!this.config.apiKey) {
        console.warn('No API key available for local development');
        return false;
      }

      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: `${this.config.fromName} <${this.config.fromEmail}>`,
            to: [data.recipientEmail],
            subject: 'Welcome to PCard',
            html: this.generateInvitationHTML(data),
            reply_to: this.config.fromEmail,
          }),
        });

        return response.ok;
      } catch (error) {
        console.error('Direct Resend API call failed (CORS expected in browser):', error);
        console.log('This is normal in browser environments. Use production deployment for emails.');
        return false;
      }
    }
  }

  private async sendWithSendGrid(data: InvitationEmailData): Promise<boolean> {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: data.recipientEmail }],
          subject: 'Welcome to PCard - Your Account is Ready!'
        }],
        from: {
          email: this.config.fromEmail,
          name: this.config.fromName
        },
        content: [{
          type: 'text/html',
          value: this.generateInvitationHTML(data)
        }]
      }),
    });

    return response.ok;
  }

  private generateInvitationHTML(data: InvitationEmailData): string {
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
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .credentials { background: #e9ecef; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; color: #6c757d; font-size: 14px; margin-top: 30px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 Welcome to PCard!</h1>
                <p>Your digital business card platform</p>
            </div>
            
            <div class="content">
                <h2>Hello${data.recipientName ? ` ${data.recipientName}` : ''}!</h2>
                
                <p>You've been invited to join PCard, the modern digital business card platform. Your account has been created and is ready to use!</p>
                
                <div class="credentials">
                    <h3>🔐 Your Login Credentials</h3>
                    <p><strong>Username:</strong> ${data.username}</p>
                    <p><strong>Password:</strong> ${data.password}</p>
                    <p><small>⚠️ Please change your password after your first login</small></p>
                </div>
                
                <p>Click the button below to access your account:</p>
                
                <a href="${data.inviteUrl}" class="button">Access My Account</a>
                
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #007bff;">${data.inviteUrl}</p>
                
                <h3>What's Next?</h3>
                <ul>
                    <li>✨ Create your professional digital business card</li>
                    <li>📊 Track views and engagement</li>
                    <li>🔗 Share your card with anyone, anywhere</li>
                    <li>📱 QR codes for easy networking</li>
                </ul>
                
                <p>If you have any questions, feel free to reach out to our support team.</p>
                
                <p>Welcome aboard!<br>
                ${data.senderName || 'The PCard Team'}</p>
            </div>
            
            <div class="footer">
                <p>This invitation was sent by ${data.senderName || 'your administrator'}.</p>
                <p>© ${new Date().getFullYear()} PCard. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }
}

// Email configuration - environment aware
// Check if we're in production OR if RESEND_API_KEY is available locally
const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

// Get Vite environment variable (accessible in frontend during development)
const viteApiKey = (import.meta as any).env?.VITE_RESEND_API_KEY;
const hasResendKey = viteApiKey && viteApiKey.length > 0;

const emailConfig: EmailConfig = {
  provider: (isProduction || hasResendKey) ? 'resend' : 'disabled', // Enable if production or API key available
  apiKey: viteApiKey || '', // For local development with direct API calls
  fromEmail: 'onboarding@pcard-lemon.vercel.app',
  fromName: 'PCard Team'
};

export const emailService = new EmailService(emailConfig);
// Minimal email function to test Resend import
module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    console.log('=== MINIMAL EMAIL TEST START ===');
    
    // Test 1: Check environment
    console.log('Step 1: Environment check');
    if (!process.env.RESEND_API_KEY) {
      return res.status(500).json({ 
        error: 'RESEND_API_KEY not found',
        step: 'environment_check'
      });
    }
    console.log('✅ Environment OK');

    // Test 2: Try to import Resend
    console.log('Step 2: Importing Resend');
    const { Resend } = require('resend');
    console.log('✅ Resend imported successfully');

    // Test 3: Try to create Resend instance
    console.log('Step 3: Creating Resend instance');
    const resend = new Resend(process.env.RESEND_API_KEY);
    console.log('✅ Resend instance created');

    // Test 4: Basic API test (just checking if we can call the API)
    console.log('Step 4: Testing basic email send');
    
    if (req.method === 'POST') {
      const result = await resend.emails.send({
        from: 'PCard Team <onboarding@pcard-lemon.vercel.app>',
        to: ['pmreyes16@gmail.com'],
        subject: 'Test Email from PCard',
        html: '<h1>Test successful!</h1><p>If you receive this, the email service is working.</p>'
      });

      console.log('✅ Email sent successfully:', result);
      
      return res.status(200).json({
        success: true,
        result: result,
        message: 'Email sent successfully'
      });
    } else {
      return res.status(200).json({
        success: true,
        message: 'Environment and Resend setup OK',
        hasApiKey: true
      });
    }

  } catch (error) {
    console.error('=== MINIMAL EMAIL TEST ERROR ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return res.status(500).json({
      error: 'Test failed',
      details: error.message,
      errorType: error.name,
      step: 'unknown'
    });
  }
};
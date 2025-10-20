// Simple test to check environment variables in Vercel
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
    const envInfo = {
      hasResendKey: !!process.env.RESEND_API_KEY,
      keyLength: process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.length : 0,
      keyPrefix: process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.substring(0, 8) + '...' : 'NOT_SET',
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
      allResendKeys: Object.keys(process.env).filter(key => key.includes('RESEND')),
      timestamp: new Date().toISOString()
    };

    console.log('Environment test result:', envInfo);

    return res.status(200).json({
      success: true,
      environment: envInfo
    });

  } catch (error) {
    console.error('Environment test error:', error);
    return res.status(500).json({
      error: 'Environment test failed',
      details: error.message
    });
  }
};
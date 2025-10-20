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
    // Check if we can access process.env
    const allEnvKeys = Object.keys(process.env);
    const resendKeys = allEnvKeys.filter(key => key.includes('RESEND'));
    
    const envInfo = {
      hasResendKey: !!process.env.RESEND_API_KEY,
      keyLength: process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.length : 0,
      keyPrefix: process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.substring(0, 8) + '...' : 'NOT_SET',
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
      allResendKeys: resendKeys,
      totalEnvVars: allEnvKeys.length,
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform
    };

    console.log('Environment test result:', envInfo);

    // Test if we can require a basic module
    let canRequireBasic = false;
    try {
      const fs = require('fs');
      canRequireBasic = true;
    } catch (e) {
      canRequireBasic = false;
    }

    // Test if resend is available
    let resendAvailable = false;
    let resendError = null;
    try {
      const { Resend } = require('resend');
      resendAvailable = true;
    } catch (e) {
      resendError = e.message;
    }

    return res.status(200).json({
      success: true,
      environment: envInfo,
      moduleTests: {
        canRequireBasic,
        resendAvailable,
        resendError
      }
    });

  } catch (error) {
    console.error('Environment test error:', error);
    return res.status(500).json({
      error: 'Environment test failed',
      details: error.message,
      stack: error.stack
    });
  }
};
// Simple test endpoint to verify serverless functions are working
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const response = {
      message: 'Serverless function is working!',
      timestamp: new Date().toISOString(),
      method: req.method,
      hasResendKey: !!process.env.RESEND_API_KEY,
      environment: process.env.NODE_ENV || 'unknown'
    };

    console.log('Test endpoint called:', response);
    
    res.status(200).json(response);
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({ 
      error: 'Test endpoint failed',
      details: error.message 
    });
  }
};
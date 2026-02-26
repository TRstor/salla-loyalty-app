require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Salla OAuth
  salla: {
    clientId: process.env.SALLA_CLIENT_ID,
    clientSecret: process.env.SALLA_CLIENT_SECRET,
    redirectUri: process.env.SALLA_REDIRECT_URI,
    webhookSecret: process.env.SALLA_WEBHOOK_SECRET,
    baseUrl: 'https://api.salla.dev/admin/v2',
    authUrl: 'https://accounts.salla.sa/oauth2/auth',
    tokenUrl: 'https://accounts.salla.sa/oauth2/token',
  },
  
  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  
  // Session
  session: {
    secret: process.env.SESSION_SECRET || 'session-secret-change-me',
  },
  
  // Client
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
};

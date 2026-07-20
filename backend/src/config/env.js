require('dotenv').config();

if (!process.env.JWT_SECRET) {
  console.warn('[ENV] WARNING: JWT_SECRET is not set. Using insecure default — set it in .env for production!');
}

if (!process.env.GEMINI_API_KEY) {
  console.warn('[ENV] WARNING: GEMINI_API_KEY is not set. AI responses will use fallback mode.');
}

module.exports = {
  PORT: process.env.PORT || 5000,
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/support_platform',
  JWT_SECRET: process.env.JWT_SECRET || 'insecure_dev_jwt_secret_change_in_production',
  WIDGET_SECRET: process.env.WIDGET_SECRET || process.env.JWT_SECRET || 'insecure_dev_widget_secret',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
  NODE_ENV: process.env.NODE_ENV || 'development',
  // CORS_ORIGIN: comma-separated list of allowed dashboard origins
  // Widget API routes are open to all origins (needed for embedding)
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:5173',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
};

require('dotenv').config();

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// In production, refuse to start on missing secrets rather than silently
// falling back to the well-known development defaults below — those values
// are public, so anyone could mint valid tokens against this deployment.
if (IS_PRODUCTION) {
  const missing = ['MONGO_URI', 'JWT_SECRET', 'WIDGET_SECRET'].filter(k => !process.env[k]);
  if (missing.length > 0) {
    console.error(`[ENV] FATAL: missing required variable(s) in production: ${missing.join(', ')}`);
    console.error('[ENV] Generate a secret with:');
    console.error('[ENV]   node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
    process.exit(1);
  }
} else {
  if (!process.env.JWT_SECRET) {
    console.warn('[ENV] WARNING: JWT_SECRET is not set. Using an insecure development default.');
  }
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

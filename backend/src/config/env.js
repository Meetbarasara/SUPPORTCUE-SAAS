require('dotenv').config();

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Google retires model ids on its own schedule — gemini-2.5-flash began
// answering 404 "no longer available to new users" months before its announced
// shutdown date, which silently dropped every reply to the canned fallback.
// Keep the id in configuration so the next retirement is an env change rather
// than a code change and redeploy.
//
// The default is deliberately a `-lite` model. Gemini 3.x thinking models spend
// output tokens on reasoning before writing, and against the 150-token budget in
// geminiService they hit MAX_TOKENS mid-JSON and return unparseable text —
// measured at 142 and 145 thinking tokens for gemini-3.6-flash and
// gemini-3.5-flash. The lite models think for 0 tokens and answer cleanly.
// If you raise GEMINI_MODEL to a thinking model, raise maxOutputTokens with it.
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

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
  GEMINI_MODEL,
  GEMINI_BASE_URL: `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
  NODE_ENV: process.env.NODE_ENV || 'development',
  // CORS_ORIGIN: comma-separated list of allowed dashboard origins
  // Widget API routes are open to all origins (needed for embedding)
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:5173',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
};

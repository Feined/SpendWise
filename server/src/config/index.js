import dotenv from 'dotenv';
dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const jwtSecret = process.env.JWT_SECRET || (nodeEnv === 'production' ? '' : 'dev_spendwise_secret_key_never_use_in_prod');

if (nodeEnv === 'production' && (!jwtSecret || jwtSecret === 'dev_spendwise_secret_key_never_use_in_prod')) {
  throw new Error('[SpendWise Security] JWT_SECRET must be securely configured in production environment.');
}

const rawFrontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
const allowedOrigins = rawFrontendUrl
  .split(',')
  .map((url) => url.trim().replace(/\/+$/, ''))
  .filter(Boolean);

let databaseUrl = process.env.DATABASE_URL || '';
try {
  const parsed = new URL(databaseUrl);
  if (parsed.hostname.includes('pooler.supabase.com') && !parsed.searchParams.has('sslmode')) {
    parsed.searchParams.set('sslmode', 'disable');
    databaseUrl = parsed.toString();
  }
} catch {
  // fallback to raw if not valid URL
}

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv,
  databaseUrl,
  jwtSecret: jwtSecret || 'dev_spendwise_secret_key_never_use_in_prod',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  refreshTokenExpiresInDays: parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || '30', 10),
  frontendUrl: allowedOrigins[0] || 'http://localhost:5173',
  allowedOrigins,
};


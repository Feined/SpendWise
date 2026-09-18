import { PrismaClient } from '@prisma/client';
import { config } from '../config/index.js';

let prisma;

if (config.databaseUrl) {
  try {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: config.databaseUrl,
        },
      },
      log: config.nodeEnv === 'development' ? ['warn', 'error'] : ['error'],
    });
  } catch (err) {
    console.warn('[SpendWise DB] Prisma client initialization warning:', err.message);
  }
} else {
  console.warn('[SpendWise DB] DATABASE_URL not set. Running in development/offline mode.');
}

export default prisma;

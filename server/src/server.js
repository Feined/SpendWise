import app from './app.js';
import { config } from './config/index.js';
import prisma from './db/prisma.js';

const HOST = '0.0.0.0';
const server = app.listen(config.port, HOST, () => {
  console.log(`=========================================`);
  console.log(` SpendWise Core Engine v2.0.0 Started`);
  console.log(` Host: ${HOST}`);
  console.log(` Port: ${config.port}`);
  console.log(` Environment: ${config.nodeEnv}`);
  console.log(` Health Check: http://${HOST}:${config.port}/api/health`);
  console.log(`=========================================`);
});

async function gracefulShutdown(signal) {
  console.log(`${signal} signal received: closing HTTP server`);
  server.close(async () => {
    console.log('HTTP server closed');
    if (prisma) {
      try {
        await prisma.$disconnect();
        console.log('Prisma client disconnected');
      } catch (err) {
        console.error('Error disconnecting Prisma during shutdown:', err);
      }
    }
    process.exit(0);
  });

  // Force close after 10s if graceful shutdown hangs
  setTimeout(() => {
    console.error('Forcefully terminating process after shutdown timeout');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));


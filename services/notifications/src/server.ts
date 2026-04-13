import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { notificationRoutes } from './routes';
import { scheduleDailySummary } from './jobs/daily_summary';
import { scheduleBillReminders } from './jobs/bill_reminder';

const app = Fastify({ logger: true });

async function start() {
  await app.register(cors, { origin: true });

  app.register(notificationRoutes, { prefix: '/api/v1/notifications' });

  app.get('/health', async () => ({ status: 'ok', service: 'notifications' }));

  // Schedule cron jobs
  scheduleDailySummary();
  scheduleBillReminders();

  const port = parseInt(process.env.PORT || '3005', 10);
  await app.listen({ port, host: '0.0.0.0' });
  console.log(`Notifications service running on port ${port}`);
}

start().catch((err) => {
  console.error('Failed to start notifications service:', err);
  process.exit(1);
});

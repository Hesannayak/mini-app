import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { paymentRoutes } from './routes';
import { authMiddleware } from './middleware/auth';

const app = Fastify({ logger: true });

async function start() {
  await app.register(cors, { origin: true });

  // Auth middleware for all routes except health
  app.addHook('onRequest', async (request, reply) => {
    if (request.url === '/health') return;
    await authMiddleware(request, reply);
  });

  app.register(paymentRoutes, { prefix: '/api/v1/payments' });

  app.get('/health', async () => ({ status: 'ok', service: 'payments' }));

  const port = parseInt(process.env.PORT || '3001', 10);
  await app.listen({ port, host: '0.0.0.0' });
  console.log(`Payments service running on port ${port}`);
}

start().catch((err) => {
  console.error('Failed to start payments service:', err);
  process.exit(1);
});

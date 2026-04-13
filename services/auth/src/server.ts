import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { authRoutes } from './routes';

const app = Fastify({ logger: true });

async function start() {
  await app.register(cors, { origin: true });
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  app.register(authRoutes, { prefix: '/api/v1/auth' });

  app.get('/health', async () => ({ status: 'ok', service: 'auth' }));

  const port = parseInt(process.env.PORT || '3000', 10);
  await app.listen({ port, host: '0.0.0.0' });
  console.log(`Auth service running on port ${port}`);
}

start().catch((err) => {
  console.error('Failed to start auth service:', err);
  process.exit(1);
});

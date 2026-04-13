import { FastifyRequest, FastifyReply } from 'fastify';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const IDEMPOTENCY_TTL = 24 * 3600; // 24 hours

export async function checkIdempotency(
  idempotencyKey: string,
): Promise<{ isDuplicate: boolean; cachedResponse?: string }> {
  const cached = await redis.get(`idempotency:${idempotencyKey}`);
  if (cached) {
    return { isDuplicate: true, cachedResponse: cached };
  }
  return { isDuplicate: false };
}

export async function setIdempotencyResponse(idempotencyKey: string, response: object) {
  await redis.set(
    `idempotency:${idempotencyKey}`,
    JSON.stringify(response),
    'EX',
    IDEMPOTENCY_TTL,
  );
}

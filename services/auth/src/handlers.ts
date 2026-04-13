import { FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import twilio from 'twilio';
import { getRedis } from './redis';
import { getPrisma } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'mini-dev-secret-change-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';
const OTP_RATE_LIMIT = 5;

// Twilio Verify
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_VERIFY_SID = process.env.TWILIO_VERIFY_SERVICE_SID;

if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_VERIFY_SID) {
  console.error('FATAL: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID must be set');
  process.exit(1);
}

const twilioClient = twilio(TWILIO_SID, TWILIO_TOKEN);

function hashPhone(phone: string): string {
  return crypto.createHash('sha256').update(phone).digest('hex');
}

function generateTokens(userId: string) {
  const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
  const refreshToken = jwt.sign({ userId, type: 'refresh' }, JWT_SECRET, { expiresIn: '30d' });
  return { accessToken, refreshToken };
}

export async function sendOtp(
  request: FastifyRequest<{ Body: { phone: string } }>,
  reply: FastifyReply,
) {
  const { phone } = request.body;
  const redis = getRedis();

  // Rate limit: max 5 OTP per phone per hour
  const rateKey = `otp_rate:${phone}`;
  const rateCount = await redis.incr(rateKey);
  if (rateCount === 1) {
    await redis.expire(rateKey, 3600);
  }
  if (rateCount > OTP_RATE_LIMIT) {
    return reply.status(429).send({
      success: false,
      error: 'Bahut zyada OTP bheje. Thodi der baad try karo.',
    });
  }

  try {
    // Send OTP via Twilio Verify
    await twilioClient.verify.v2
      .services(TWILIO_VERIFY_SID!)
      .verifications.create({
        to: `+91${phone}`,
        channel: 'sms',
      });

    request.log.info(`OTP sent to +91${phone} via Twilio`);

    return reply.send({
      success: true,
      data: { message: 'OTP sent successfully' },
    });
  } catch (err: any) {
    request.log.error({ error: err.message }, 'Twilio OTP send failed');
    return reply.status(502).send({
      success: false,
      error: 'OTP bhej nahi paaye. Dobara try karo.',
    });
  }
}

export async function verifyOtp(
  request: FastifyRequest<{ Body: { phone: string; otp: string } }>,
  reply: FastifyReply,
) {
  const { phone, otp } = request.body;
  const redis = getRedis();
  const prisma = getPrisma();

  try {
    // Verify OTP via Twilio
    const check = await twilioClient.verify.v2
      .services(TWILIO_VERIFY_SID!)
      .verificationChecks.create({
        to: `+91${phone}`,
        code: otp,
      });

    if (check.status !== 'approved') {
      return reply.status(401).send({
        success: false,
        error: 'Galat OTP. Dobara try karo.',
      });
    }
  } catch (err: any) {
    request.log.error({ error: err.message }, 'Twilio OTP verify failed');
    return reply.status(401).send({
      success: false,
      error: 'OTP expired ya galat hai.',
    });
  }

  const phoneHash = hashPhone(phone);

  // Find or create user
  let user = await prisma.user.findUnique({
    where: { phone_hash: phoneHash },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        phone_encrypted: `encrypted_${phone}`, // In prod: encrypt with AWS KMS
        phone_hash: phoneHash,
        language: 'hi',
        permission_level: 1,
        mini_score: 0,
      },
    });
  }

  const { accessToken, refreshToken } = generateTokens(user.id);

  // Store refresh token in Redis
  await redis.set(`refresh:${user.id}`, refreshToken, 'EX', 30 * 24 * 3600);

  return reply.send({
    success: true,
    data: {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 7 * 24 * 3600,
      user: {
        id: user.id,
        name: user.name,
        language: user.language,
        permission_level: user.permission_level,
        mini_score: user.mini_score,
      },
    },
  });
}

export async function refreshToken(
  request: FastifyRequest<{ Body: { refresh_token: string } }>,
  reply: FastifyReply,
) {
  const { refresh_token } = request.body;

  try {
    const payload = jwt.verify(refresh_token, JWT_SECRET) as { userId: string; type: string };

    if (payload.type !== 'refresh') {
      return reply.status(401).send({ success: false, error: 'Invalid token type' });
    }

    const redis = getRedis();
    const storedToken = await redis.get(`refresh:${payload.userId}`);

    if (!storedToken || storedToken !== refresh_token) {
      return reply.status(401).send({ success: false, error: 'Token revoked' });
    }

    const tokens = generateTokens(payload.userId);
    await redis.set(`refresh:${payload.userId}`, tokens.refreshToken, 'EX', 30 * 24 * 3600);

    return reply.send({
      success: true,
      data: {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expires_in: 7 * 24 * 3600,
      },
    });
  } catch {
    return reply.status(401).send({ success: false, error: 'Invalid or expired token' });
  }
}

export async function logout(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ success: false, error: 'No token provided' });
  }

  try {
    const token = authHeader.slice(7);
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    const redis = getRedis();
    await redis.del(`refresh:${payload.userId}`);
    return reply.send({ success: true, data: { message: 'Logged out' } });
  } catch {
    return reply.status(401).send({ success: false, error: 'Invalid token' });
  }
}

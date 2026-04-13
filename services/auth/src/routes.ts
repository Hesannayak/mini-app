import { FastifyInstance } from 'fastify';
import { sendOtp, verifyOtp, refreshToken, logout } from './handlers';

export async function authRoutes(app: FastifyInstance) {
  // Send OTP to phone number
  app.post('/otp/send', {
    schema: {
      body: {
        type: 'object',
        required: ['phone'],
        properties: {
          phone: { type: 'string', pattern: '^[6-9]\\d{9}$' },
        },
      },
    },
    handler: sendOtp,
  });

  // Verify OTP and get tokens
  app.post('/otp/verify', {
    schema: {
      body: {
        type: 'object',
        required: ['phone', 'otp'],
        properties: {
          phone: { type: 'string', pattern: '^[6-9]\\d{9}$' },
          otp: { type: 'string', pattern: '^\\d{6}$' },
        },
      },
    },
    handler: verifyOtp,
  });

  // Refresh access token
  app.post('/refresh', {
    schema: {
      body: {
        type: 'object',
        required: ['refresh_token'],
        properties: {
          refresh_token: { type: 'string' },
        },
      },
    },
    handler: refreshToken,
  });

  // Logout — invalidate tokens
  app.post('/logout', {
    handler: logout,
  });
}

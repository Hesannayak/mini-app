import { FastifyInstance } from 'fastify';
import { initiatePayment, confirmPayment, getBalance, requestMoney } from './handlers';

export async function paymentRoutes(app: FastifyInstance) {
  // Initiate a UPI payment
  app.post('/upi/initiate', {
    schema: {
      body: {
        type: 'object',
        required: ['recipient_upi_id', 'amount', 'idempotency_key'],
        properties: {
          recipient_upi_id: { type: 'string' },
          amount: { type: 'number', minimum: 1, maximum: 10000 },
          note: { type: 'string', maxLength: 50 },
          idempotency_key: { type: 'string' },
        },
      },
    },
    handler: initiatePayment,
  });

  // Confirm a pending payment
  app.post('/upi/confirm', {
    schema: {
      body: {
        type: 'object',
        required: ['payment_id', 'idempotency_key'],
        properties: {
          payment_id: { type: 'string' },
          idempotency_key: { type: 'string' },
        },
      },
    },
    handler: confirmPayment,
  });

  // Check UPI balance
  app.get('/balance', {
    handler: getBalance,
  });

  // Request money from someone
  app.post('/request', {
    schema: {
      body: {
        type: 'object',
        required: ['from_upi_id', 'amount'],
        properties: {
          from_upi_id: { type: 'string' },
          amount: { type: 'number', minimum: 1, maximum: 10000 },
          note: { type: 'string', maxLength: 50 },
        },
      },
    },
    handler: requestMoney,
  });
}

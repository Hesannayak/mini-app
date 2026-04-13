import { FastifyRequest, FastifyReply } from 'fastify';
import Razorpay from 'razorpay';
import { checkIdempotency, setIdempotencyResponse } from './middleware/idempotency';
import { MAX_TRANSACTION_AMOUNT, BIOMETRIC_THRESHOLD } from '@mini/shared-types';

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

let razorpay: Razorpay | null = null;

if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
  });
  console.log('Razorpay SDK initialized with key:', RAZORPAY_KEY_ID);
} else {
  console.warn('WARNING: RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not set — payment endpoints will return 503');
}

function requireRazorpay(reply: FastifyReply): Razorpay {
  if (!razorpay) {
    reply.status(503).send({
      success: false,
      error: 'Payment service not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env',
    });
    throw new Error('Razorpay not configured');
  }
  return razorpay;
}

interface InitiateBody {
  recipient_upi_id: string;
  amount: number;
  note?: string;
  idempotency_key: string;
}

interface ConfirmBody {
  payment_id: string;
  idempotency_key: string;
}

interface RequestBody {
  from_upi_id: string;
  amount: number;
  note?: string;
}

export async function initiatePayment(
  request: FastifyRequest<{ Body: InitiateBody }>,
  reply: FastifyReply,
) {
  const { recipient_upi_id, amount, note, idempotency_key } = request.body;
  const userId = request.userId!;
  let rp: Razorpay;
  try { rp = requireRazorpay(reply); } catch { return; }

  const { isDuplicate, cachedResponse } = await checkIdempotency(idempotency_key);
  if (isDuplicate && cachedResponse) {
    return reply.send(JSON.parse(cachedResponse));
  }

  if (amount > MAX_TRANSACTION_AMOUNT) {
    return reply.status(400).send({
      success: false,
      error: `Amount exceeds maximum limit of ₹${MAX_TRANSACTION_AMOUNT.toLocaleString('en-IN')}`,
    });
  }

  const requiresBiometric = amount > BIOMETRIC_THRESHOLD;

  try {
    const order = await rp.orders.create({
      amount: Math.round(amount * 100), // Razorpay uses paise
      currency: 'INR',
      receipt: idempotency_key,
      notes: {
        user_id: userId,
        recipient_upi_id,
        note: note || '',
      },
    });

    const response = {
      success: true,
      data: {
        payment_id: order.id,
        razorpay_order_id: order.id,
        razorpay_key_id: RAZORPAY_KEY_ID,
        status: 'pending_confirmation',
        amount,
        recipient_upi_id,
        note: note || '',
        requires_biometric: requiresBiometric,
        created_at: new Date().toISOString(),
      },
    };

    await setIdempotencyResponse(idempotency_key, response);
    return reply.send(response);
  } catch (error: any) {
    request.log.error({ error: error.message }, 'Razorpay order creation failed');
    return reply.status(502).send({
      success: false,
      error: 'Payment initiation failed. Please try again.',
    });
  }
}

export async function confirmPayment(
  request: FastifyRequest<{ Body: ConfirmBody }>,
  reply: FastifyReply,
) {
  const { payment_id, idempotency_key } = request.body;
  let rp: Razorpay;
  try { rp = requireRazorpay(reply); } catch { return; }

  const { isDuplicate, cachedResponse } = await checkIdempotency(idempotency_key);
  if (isDuplicate && cachedResponse) {
    return reply.send(JSON.parse(cachedResponse));
  }

  try {
    const order = await rp.orders.fetch(payment_id);

    if (order.status === 'paid') {
      return reply.send({
        success: true,
        data: { payment_id, status: 'already_completed', completed_at: new Date().toISOString() },
      });
    }

    const payments = await rp.orders.fetchPayments(payment_id);
    const authorizedPayment = (payments as any).items?.find(
      (p: any) => p.status === 'authorized',
    );

    if (!authorizedPayment) {
      return reply.status(400).send({
        success: false,
        error: 'No authorized payment found. User must complete UPI flow first.',
      });
    }

    const captured = await rp.payments.capture(
      authorizedPayment.id,
      authorizedPayment.amount,
      'INR',
    );

    const response = {
      success: true,
      data: {
        payment_id,
        razorpay_payment_id: captured.id,
        status: 'completed',
        upi_ref_id: (captured as any).acquirer_data?.rrn || captured.id,
        amount: (captured.amount as number) / 100,
        completed_at: new Date().toISOString(),
      },
    };

    await setIdempotencyResponse(idempotency_key, response);
    return reply.send(response);
  } catch (error: any) {
    request.log.error({ error: error.message }, 'Razorpay payment capture failed');
    return reply.status(502).send({
      success: false,
      error: 'Payment confirmation failed. Please try again.',
    });
  }
}

export async function getBalance(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    // Razorpay doesn't expose user bank balance — that requires Account Aggregator (Finvu).
    // Fetch merchant settlement balance as a proxy for testing.
    const rp = requireRazorpay(reply);
    const balance = await (rp as any).balance?.fetch?.();

    return reply.send({
      success: true,
      data: {
        balance: balance ? balance.balance / 100 : null,
        balance_available: !!balance,
        last_updated: new Date().toISOString(),
      },
    });
  } catch {
    return reply.send({
      success: true,
      data: {
        balance: null,
        balance_available: false,
        message: 'Link your bank account via Account Aggregator to see balance',
        last_updated: new Date().toISOString(),
      },
    });
  }
}

export async function requestMoney(
  request: FastifyRequest<{ Body: RequestBody }>,
  reply: FastifyReply,
) {
  const { from_upi_id, amount, note } = request.body;
  const userId = request.userId!;
  let rp: Razorpay;
  try { rp = requireRazorpay(reply); } catch { return; }

  if (amount > MAX_TRANSACTION_AMOUNT) {
    return reply.status(400).send({
      success: false,
      error: `Amount exceeds maximum limit of ₹${MAX_TRANSACTION_AMOUNT.toLocaleString('en-IN')}`,
    });
  }

  try {
    const paymentLink = await rp.paymentLink.create({
      amount: Math.round(amount * 100),
      currency: 'INR',
      description: note || 'Payment request from Mini',
      notes: {
        user_id: userId,
        from_upi_id,
        type: 'collect_request',
      },
    });

    return reply.send({
      success: true,
      data: {
        request_id: paymentLink.id,
        short_url: (paymentLink as any).short_url,
        status: 'sent',
        from_upi_id,
        amount,
        note: note || '',
        created_at: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    request.log.error({ error: error.message }, 'Razorpay collect request failed');
    return reply.status(502).send({
      success: false,
      error: 'Money request failed. Please try again.',
    });
  }
}

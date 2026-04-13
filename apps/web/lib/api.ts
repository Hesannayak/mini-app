const API = {
  auth: process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:3000/api/v1/auth',
  payments: process.env.NEXT_PUBLIC_PAYMENTS_URL || 'http://localhost:3001/api/v1/payments',
  voice: process.env.NEXT_PUBLIC_VOICE_URL || 'http://localhost:3002/api/v1/voice',
  coach: process.env.NEXT_PUBLIC_COACH_URL || 'http://localhost:3004/api/v1/coach',
  intelligence: process.env.NEXT_PUBLIC_INTEL_URL || 'http://localhost:3003/api/v1',
  notifications: process.env.NEXT_PUBLIC_NOTIF_URL || 'http://localhost:3005/api/v1/notifications',
  rides: process.env.NEXT_PUBLIC_RIDES_URL || 'http://localhost:3007/api/v1/rides',
};

export default API;

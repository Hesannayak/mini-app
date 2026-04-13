import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

const replitDomain = typeof window !== 'undefined'
  ? window.location.hostname
  : null;

const isReplit = replitDomain?.includes('.replit.dev') || replitDomain?.includes('.worf.replit.dev');

function serviceUrl(port: number, path: string): string {
  if (isWeb && isReplit) {
    return `https://${replitDomain?.replace(/:\d+$/, '')}:${port}${path}`;
  }
  return `http://localhost:${port}${path}`;
}

export const API = {
  auth:         () => serviceUrl(3000, '/api/v1/auth'),
  payments:     () => serviceUrl(3001, '/api/v1/payments'),
  voice:        () => serviceUrl(3002, '/api/v1/voice'),
  intelligence: () => serviceUrl(3003, '/api/v1/intelligence'),
  score:        () => serviceUrl(3003, '/api/v1/score'),
  budgets:      () => serviceUrl(3003, '/api/v1/budgets'),
  transactions: () => serviceUrl(3003, '/api/v1/transactions'),
  coach:        () => serviceUrl(5000, '/api/v1/coach'),   // port 5000 — Replit-exposed
};

/** fetch with a hard timeout (default 5 s). Throws on timeout. */
export async function apiFetch(url: string, init: RequestInit = {}, timeoutMs = 5000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

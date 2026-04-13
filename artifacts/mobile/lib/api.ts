import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

// EXPO_PUBLIC_DOMAIN is set by the Expo dev script to $REPLIT_DEV_DOMAIN.
// It is baked into the bundle at build time — reliable across all iframe contexts.
// window.location.hostname can be wrong inside Replit's canvas proxy iframes.
const buildTimeDomain = process.env.EXPO_PUBLIC_DOMAIN ?? null;

const webDomain = isWeb && typeof window !== 'undefined'
  ? (buildTimeDomain ?? window.location.hostname)
  : null;

const nativeDomain = buildTimeDomain;

const replitDomain = isWeb ? webDomain : nativeDomain;

const isReplit = Boolean(
  replitDomain?.includes('.replit.dev') || replitDomain?.includes('.worf.replit.dev')
);

function serviceUrl(port: number, path: string): string {
  if (isReplit && replitDomain) {
    const clean = replitDomain.replace(/:\d+$/, '');
    return `https://${clean}:${port}${path}`;
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
  coach:        () => serviceUrl(6000, '/api/v1/coach'),
};

/** fetch with a hard timeout (default 5 s). Throws on timeout/abort. */
export async function apiFetch(url: string, init: RequestInit = {}, timeoutMs = 5000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

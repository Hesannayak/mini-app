import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

const replitDomain = typeof window !== 'undefined'
  ? window.location.hostname
  : null;

const isReplit = replitDomain?.includes('.replit.dev') || replitDomain?.includes('.worf.replit.dev');

function serviceUrl(port: number, path: string): string {
  if (isWeb && isReplit) {
    const proto = 'https';
    return `${proto}://${replitDomain?.replace(/:\d+$/, '')}:${port}${path}`;
  }
  return `http://localhost:${port}${path}`;
}

export const API = {
  auth:         () => serviceUrl(3000, '/api/v1/auth'),
  payments:     () => serviceUrl(3001, '/api/v1/payments'),
  voice:        () => serviceUrl(3002, '/api/v1/voice'),
  intelligence: () => serviceUrl(3003, '/api/v1/intelligence'),
  coach:        () => serviceUrl(3004, '/api/v1/coach'),
  score:        () => serviceUrl(3003, '/api/v1/score'),
  budgets:      () => serviceUrl(3003, '/api/v1/budgets'),
  transactions: () => serviceUrl(3003, '/api/v1/transactions'),
};

'use client';

// Simple auth store using localStorage
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('mini_token');
}

export function setAuth(accessToken: string, refreshToken: string, phone: string) {
  localStorage.setItem('mini_token', accessToken);
  localStorage.setItem('mini_refresh', refreshToken);
  localStorage.setItem('mini_phone', phone);
}

export function setUserName(name: string) {
  localStorage.setItem('mini_name', name);
}

export function getUserName(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('mini_name');
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

export function logout() {
  localStorage.removeItem('mini_token');
  localStorage.removeItem('mini_refresh');
  localStorage.removeItem('mini_phone');
  localStorage.removeItem('mini_name');
}

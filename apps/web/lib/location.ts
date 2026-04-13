/**
 * Location services — GPS + saved address resolution.
 */

export interface Coords {
  lat: number;
  lng: number;
}

export function getCurrentLocation(): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

// Saved addresses (localStorage for MVP, DB for production)
const SAVED_KEY = 'mini_addresses';

export interface SavedAddress {
  label: string;
  aliases: string[];
  lat: number;
  lng: number;
}

export function getSavedAddresses(): SavedAddress[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(SAVED_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function saveAddress(addr: SavedAddress) {
  const all = getSavedAddresses();
  const existing = all.findIndex(a => a.label === addr.label);
  if (existing >= 0) all[existing] = addr;
  else all.push(addr);
  localStorage.setItem(SAVED_KEY, JSON.stringify(all));
}

export function resolveDestination(dest: string): SavedAddress | null {
  const all = getSavedAddresses();
  const lower = dest.toLowerCase();
  return all.find(a =>
    a.label.toLowerCase() === lower ||
    a.aliases.some(alias => alias.toLowerCase() === lower)
  ) || null;
}

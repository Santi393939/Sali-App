import { createMMKV } from 'react-native-mmkv';

/** One MMKV instance for the whole app (falls back to localStorage on web). */
export const storage = createMMKV({ id: 'salli' });

export function readJSON<T>(key: string, fallback: T): T {
  const raw = storage.getString(key);
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown): void {
  storage.set(key, JSON.stringify(value));
}

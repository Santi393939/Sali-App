/**
 * The app's on-phone key-value store (counts, settings, rewards…).
 *
 * On phones it uses Expo's SQLite key-value store, which is synchronous like
 * the rest of the store code expects and is included in Expo Go, so the app
 * can be tried without a custom build. The web build uses storage.web.ts.
 */
import { Storage as kv } from 'expo-sqlite/kv-store';

type Value = string | number | boolean;

export const storage = {
  getString: (key: string): string | undefined => kv.getItemSync(key) ?? undefined,
  getBoolean: (key: string): boolean | undefined => {
    const v = kv.getItemSync(key);
    return v == null ? undefined : v === 'true';
  },
  getNumber: (key: string): number | undefined => {
    const v = kv.getItemSync(key);
    return v == null ? undefined : Number(v);
  },
  set: (key: string, value: Value): void => kv.setItemSync(key, String(value)),
  remove: (key: string): boolean => kv.removeItemSync(key),
  getAllKeys: (): string[] => kv.getAllKeysSync(),
  clearAll: (): void => {
    kv.clearSync();
  },
};

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

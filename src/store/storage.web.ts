/**
 * Web version of the key-value store: the browser's localStorage, with each
 * key prefixed "salli\" (the same layout the app used before, so data saved
 * in the preview carries over).
 */
type Value = string | number | boolean;

const PREFIX = 'salli\\';
const ls = (): Storage | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
};
const get = (key: string) => ls()?.getItem(PREFIX + key) ?? null;

export const storage = {
  getString: (key: string): string | undefined => get(key) ?? undefined,
  getBoolean: (key: string): boolean | undefined => {
    const v = get(key);
    return v == null ? undefined : v === 'true';
  },
  getNumber: (key: string): number | undefined => {
    const v = get(key);
    return v == null ? undefined : Number(v);
  },
  set: (key: string, value: Value): void => {
    try {
      ls()?.setItem(PREFIX + key, String(value));
    } catch {}
  },
  remove: (key: string): boolean => {
    const had = get(key) != null;
    ls()?.removeItem(PREFIX + key);
    return had;
  },
  getAllKeys: (): string[] => {
    const s = ls();
    if (!s) return [];
    const keys: string[] = [];
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i);
      if (k?.startsWith(PREFIX)) keys.push(k.slice(PREFIX.length));
    }
    return keys;
  },
  clearAll: (): void => {
    const s = ls();
    if (!s) return;
    for (const k of storage.getAllKeys()) s.removeItem(PREFIX + k);
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

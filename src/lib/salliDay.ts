/**
 * The Salli day runs Maghrib to Maghrib, like the Islamic day.
 * Until location-based prayer times arrive (Streaks step), Maghrib falls
 * back to 18:00 local time, as the brief says.
 *
 * A Salli day is named by the civil date it mostly covers: the evening of
 * 24 Nov (after Maghrib) already belongs to the Salli day "2026-11-25".
 */

export const FALLBACK_MAGHRIB_HOUR = 18;

/** Maghrib for a civil date. Placeholder until the adhan library is added. */
export function maghribOn(date: Date): Date {
  const d = new Date(date);
  d.setHours(FALLBACK_MAGHRIB_HOUR, 0, 0, 0);
  return d;
}

function toKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** The Salli day key (YYYY-MM-DD) for a moment in time. */
export function salliDayKey(at: Date = new Date()): string {
  const civil = new Date(at);
  if (at.getTime() >= maghribOn(at).getTime()) civil.setDate(civil.getDate() + 1);
  return toKey(civil);
}

/** The key of the Salli day before `key`. */
export function previousDayKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  const prev = new Date(y, m - 1, d - 1, 12);
  return toKey(prev);
}

/** When the current Salli day ends (the next Maghrib). */
export function nextMaghrib(at: Date = new Date()): Date {
  const today = maghribOn(at);
  if (at.getTime() < today.getTime()) return today;
  const tomorrow = new Date(at);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return maghribOn(tomorrow);
}

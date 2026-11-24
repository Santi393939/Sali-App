/**
 * The Salli day runs Maghrib to Maghrib, like the Islamic day.
 * Maghrib is calculated on the phone with the adhan library from the user's
 * saved city (set during onboarding). With no city saved, it falls back to
 * 18:00 local time, as the brief says.
 *
 * A Salli day is named by the civil date it mostly covers: the evening of
 * 24 Nov (after Maghrib) already belongs to the Salli day "2026-11-25".
 */
import { CalculationMethod, Coordinates, PrayerTimes } from 'adhan';

import { readJSON, writeJSON } from '@/store/storage';

export const FALLBACK_MAGHRIB_HOUR = 18;

export type SavedLocation = { latitude: number; longitude: number; city: string };

const LOCATION_KEY = 'settings.location';

export function getLocation(): SavedLocation | null {
  return readJSON<SavedLocation | null>(LOCATION_KEY, null);
}

export function setLocation(loc: SavedLocation | null): void {
  writeJSON(LOCATION_KEY, loc);
}

export const FALLBACK_ASR = { hour: 15, minute: 30 };

function prayerTimesOn(date: Date): PrayerTimes | null {
  const loc = getLocation();
  if (!loc) return null;
  try {
    const noon = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
    return new PrayerTimes(new Coordinates(loc.latitude, loc.longitude), noon, CalculationMethod.MuslimWorldLeague());
  } catch {
    return null;
  }
}

const valid = (d: unknown): d is Date => d instanceof Date && !Number.isNaN(d.getTime());

/** Maghrib for a civil date: from prayer times when a city is saved, else 18:00. */
export function maghribOn(date: Date): Date {
  const t = prayerTimesOn(date);
  if (t && valid(t.maghrib)) return t.maghrib;
  const d = new Date(date);
  d.setHours(FALLBACK_MAGHRIB_HOUR, 0, 0, 0);
  return d;
}

/** Asr for a civil date: from prayer times when a city is saved, else 15:30. */
export function asrOn(date: Date): Date {
  const t = prayerTimesOn(date);
  if (t && valid(t.asr)) return t.asr;
  const d = new Date(date);
  d.setHours(FALLBACK_ASR.hour, FALLBACK_ASR.minute, 0, 0);
  return d;
}

export function toDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Noon on the civil date named by a day key (safe for date maths). */
export function keyToDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

/** The Salli day key (YYYY-MM-DD) for a moment in time. */
export function salliDayKey(at: Date = new Date()): string {
  const civil = new Date(at);
  if (at.getTime() >= maghribOn(at).getTime()) civil.setDate(civil.getDate() + 1);
  return toDayKey(civil);
}

export function addDays(key: string, n: number): string {
  const d = keyToDate(key);
  d.setDate(d.getDate() + n);
  return toDayKey(d);
}

export const previousDayKey = (key: string) => addDays(key, -1);
export const nextDayKey = (key: string) => addDays(key, 1);

/** When the current Salli day ends (the next Maghrib). */
export function nextMaghrib(at: Date = new Date()): Date {
  const today = maghribOn(at);
  if (at.getTime() < today.getTime()) return today;
  const tomorrow = new Date(at);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return maghribOn(tomorrow);
}

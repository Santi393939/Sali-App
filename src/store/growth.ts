/**
 * Growth features borrowed from fitness apps that build habits well
 * (Strava, Apple Fitness), each sized to the person's own level:
 *  - personal bests: best day, best Jumu'ah week (Saturday to Friday),
 *    longest streak; beating your best day is celebrated once that day;
 *  - your usual range: this week against the last four weeks, so a big
 *    week is celebrated and a light one is met with encouragement;
 *  - a challenge each Hijri month, set from your own recent consistency.
 */
import { dateLocale, getLanguage } from '@/lib/i18n';
import { addDays, keyToDate } from '@/lib/salliDay';

import { getDay, isLit, savedDayKeys } from './days';
import { readJSON, storage, writeJSON } from './storage';

const totalOn = (key: string) => getDay(key).total;
const sumRange = (from: string, days: number) => {
  let s = 0;
  for (let i = 0; i < days; i++) s += totalOn(addDays(from, i));
  return s;
};

// ---------- personal bests ----------

export type Records = {
  bestDay: { total: number; date: string } | null;
  bestWeek: { total: number; end: string } | null;
  litDays: number;
};

/** The Friday that ends the Jumu'ah week (Saturday–Friday) containing `key`. */
export function weekEnd(key: string) {
  const dow = keyToDate(key).getDay(); // 0 Sunday … 5 Friday, 6 Saturday
  return addDays(key, (5 - dow + 7) % 7);
}

/** `_version` changes with every count, so callers re-read after changes. */
export function personalRecords(_version?: number): Records {
  let bestDay: Records['bestDay'] = null;
  const weeks = new Map<string, number>();
  let litDays = 0;
  for (const key of savedDayKeys()) {
    const day = getDay(key);
    if (day.total <= 0) continue;
    if (!bestDay || day.total > bestDay.total) bestDay = { total: day.total, date: key };
    if (isLit(day)) litDays++;
    const end = weekEnd(key);
    weeks.set(end, (weeks.get(end) ?? 0) + day.total);
  }
  let bestWeek: Records['bestWeek'] = null;
  for (const [end, total] of weeks) if (!bestWeek || total > bestWeek.total) bestWeek = { total, end };
  return { bestDay, bestWeek, litDays };
}

const RECORD_KEY = 'records.dayCelebrated';
/** Smallest previous best worth celebrating (a first day is not a record). */
const RECORD_MIN = 10;

/** After an add: did today just beat the best day before it? Reported once per day. */
export function newDayRecord(date: string, total: number, added: number): { total: number; previous: number } | null {
  if (storage.getString(RECORD_KEY) === date) return null;
  let previous = 0;
  for (const key of savedDayKeys()) if (key !== date) previous = Math.max(previous, totalOn(key));
  if (previous < RECORD_MIN || total <= previous || total - added > previous) return null;
  storage.set(RECORD_KEY, date);
  return { total, previous };
}

// ---------- your usual range ----------

export type WeekRange = { thisWeek: number; low: number; high: number; status: 'new' | 'below' | 'within' | 'above' };

/** The last 7 Salli days against the four 7-day stretches before them. */
export function weekRange(today: string, _version?: number): WeekRange {
  const start = addDays(today, -6);
  const thisWeek = sumRange(start, 7);
  const past = [1, 2, 3, 4].map((w) => sumRange(addDays(start, -7 * w), 7)).filter((t) => t > 0);
  if (past.length < 2) return { thisWeek, low: 0, high: 0, status: 'new' };
  let low = Math.min(...past);
  let high = Math.max(...past);
  if (high - low < high * 0.2) {
    // A very steady person: give the range a little room either side.
    low = Math.round(low * 0.9);
    high = Math.round(high * 1.1);
  }
  const status = thisWeek < low ? 'below' : thisWeek > high ? 'above' : 'within';
  return { thisWeek, low, high, status };
}

// ---------- the Hijri month challenge ----------

export type Challenge = { month: string; name: string; target: number; first: string; last: string; /** Lit days count from here (the first day, or the day someone new joined). */ from: string };
export type ChallengeProgress = Challenge & { lit: number; daysLeft: number; done: boolean };

function hijriKey(key: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { year: 'numeric', month: 'numeric' }).formatToParts(keyToDate(key));
    const y = parts.find((p) => p.type === 'year')?.value ?? '';
    const m = parts.find((p) => p.type === 'month')?.value ?? '';
    return `${y}-${m.padStart(2, '0')}`;
  } catch {
    return key.slice(0, 7); // no Islamic calendar on this device: use the civil month
  }
}

export function hijriMonthName(key: string): string {
  try {
    const locale = getLanguage() === 'ar' ? 'ar-u-ca-islamic-umalqura-nu-latn' : `${dateLocale()}-u-ca-islamic-umalqura`;
    return new Intl.DateTimeFormat(locale, { month: 'long' }).format(keyToDate(key));
  } catch {
    return keyToDate(key).toLocaleDateString(dateLocale(), { month: 'long' });
  }
}

const challengeKey = (month: string) => `challenge.${month}`;

/** This month's challenge, set the first time it is asked for, from the 30 days before. */
export function monthChallenge(today: string, _version?: number): ChallengeProgress {
  const month = hijriKey(today);
  let c = readJSON<Challenge | null>(challengeKey(month), null);
  if (!c) {
    let first = today;
    while (hijriKey(addDays(first, -1)) === month) first = addDays(first, -1);
    let last = today;
    while (hijriKey(addDays(last, 1)) === month) last = addDays(last, 1);
    const left = Math.round((keyToDate(last).getTime() - keyToDate(today).getTime()) / 86400000) + 1;
    let litBefore = 0;
    let counted = 0;
    for (let d = 1; d <= 30; d++) {
      const day = getDay(addDays(today, -d));
      if (day.total > 0) counted++;
      if (isLit(day)) litBefore++;
    }
    // A little more than your recent rate over the whole month; someone new
    // gets about half of the days that are left.
    const known = counted >= 7;
    const from = known ? first : today;
    const span = known ? Math.round((keyToDate(last).getTime() - keyToDate(first).getTime()) / 86400000) + 1 : left;
    const rate = known ? litBefore / 30 : 0.45;
    const target = Math.max(3, Math.min(span, Math.round(rate * span) + 2));
    c = { month, name: hijriMonthName(today), target, first, last, from };
    writeJSON(challengeKey(month), c);
  }
  let lit = 0;
  for (let k = c.from ?? c.first; k <= c.last && k <= today; k = addDays(k, 1)) if (isLit(getDay(k))) lit++;
  const daysLeft = Math.round((keyToDate(c.last).getTime() - keyToDate(today).getTime()) / 86400000) + 1;
  return { ...c, name: hijriMonthName(today), lit, daysLeft, done: lit >= c.target };
}

const CHALLENGES_DONE = 'challenges.done';
export const challengesDone = () => readJSON<string[]>(CHALLENGES_DONE, []);

/** After a lantern is lit: did that complete this month's challenge? Reported once. */
export function challengeJustDone(today: string): ChallengeProgress | null {
  const c = monthChallenge(today);
  const done = challengesDone();
  if (!c.done || done.includes(c.month)) return null;
  writeJSON(CHALLENGES_DONE, [...done, c.month]);
  return c;
}

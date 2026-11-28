/** Per-day records saved on the phone. One record per Salli day. */
import { readJSON, storage, writeJSON } from './storage';

export type EntrySource = 'tap' | 'quick' | 'pad' | 'reminder' | 'telegram' | 'community';

export type Entry = {
  clientId: string;
  amount: number;
  source: EntrySource;
  /** ISO time of the first count in this entry. */
  createdAt: string;
  /** ISO time of the latest count (taps are grouped into one entry). */
  updatedAt: string;
};

export type DayRecord = {
  date: string; // Salli day key
  total: number;
  goal: number;
  entries: Entry[]; // oldest first
};

export const DEFAULT_DAILY_GOAL = 10;
const PREFIX = 'day.';

/** The goal new days start with (read straight from saved settings to avoid an import cycle). */
export function getDailyGoal(): number {
  const raw = storage.getString('settings.v1');
  if (raw) {
    try {
      const goal = JSON.parse(raw).dailyGoal;
      if (typeof goal === 'number' && goal > 0) return goal;
    } catch {}
  }
  return DEFAULT_DAILY_GOAL;
}

export function getDay(date: string): DayRecord {
  return readJSON<DayRecord>(PREFIX + date, { date, total: 0, goal: getDailyGoal(), entries: [] });
}

export function saveDay(day: DayRecord): void {
  writeJSON(PREFIX + day.date, day);
}

/** Keys of every day with a saved record, oldest first. */
export function savedDayKeys(): string[] {
  return storage
    .getAllKeys()
    .filter((k) => k.startsWith(PREFIX))
    .map((k) => k.slice(PREFIX.length))
    .sort();
}

export const isLit = (d: DayRecord) => d.total > 0 && d.total >= d.goal;

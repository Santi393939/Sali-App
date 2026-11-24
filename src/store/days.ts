/** Per-day records saved on the phone. One record per Salli day. */
import { readJSON, storage, writeJSON } from './storage';

export type EntrySource = 'tap' | 'quick' | 'pad' | 'reminder' | 'telegram';

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

export const DEFAULT_DAILY_GOAL = 1000;
const GOAL_KEY = 'settings.dailyGoal';
const PREFIX = 'day.';

export function getDailyGoal(): number {
  return storage.getNumber(GOAL_KEY) ?? DEFAULT_DAILY_GOAL;
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

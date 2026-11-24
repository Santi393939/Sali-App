/**
 * Offline-first salawat counts. Every change is written to the phone
 * (MMKV) synchronously, so nothing waits on the network. Each entry carries a
 * client_id so the later Supabase sync can never double-count it.
 */
import { useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { nextMaghrib, previousDayKey, salliDayKey } from '@/lib/salliDay';

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
/** Max amount for one add, to stop typos like 100000. */
export const MAX_SINGLE_ADD = 10000;
/** Taps within this window are grouped into one log entry. */
const TAP_GROUP_MS = 2 * 60 * 1000;

const GOAL_KEY = 'settings.dailyGoal';
const dayKey = (date: string) => `day.${date}`;

// ---- tiny subscription so screens re-render when counts change ----
const listeners = new Set<() => void>();
let version = 0;
function emit() {
  version++;
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

function newId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) return c.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function getDailyGoal(): number {
  return storage.getNumber(GOAL_KEY) ?? DEFAULT_DAILY_GOAL;
}

export function getDay(date: string): DayRecord {
  return readJSON<DayRecord>(dayKey(date), { date, total: 0, goal: getDailyGoal(), entries: [] });
}

/** Add salawat to the current Salli day. Returns the new day total. */
export function addSalawat(amount: number, source: EntrySource, now = new Date()): number {
  const n = Math.floor(amount);
  if (!Number.isFinite(n) || n <= 0) return getDay(salliDayKey(now)).total;
  const add = Math.min(n, MAX_SINGLE_ADD);

  const date = salliDayKey(now);
  const day = getDay(date);
  const iso = now.toISOString();
  const last = day.entries[day.entries.length - 1];

  if (
    source === 'tap' &&
    last?.source === 'tap' &&
    now.getTime() - new Date(last.updatedAt).getTime() < TAP_GROUP_MS
  ) {
    last.amount += add;
    last.updatedAt = iso;
  } else {
    day.entries.push({ clientId: newId(), amount: add, source, createdAt: iso, updatedAt: iso });
  }
  day.total += add;
  writeJSON(dayKey(date), day);
  emit();
  return day.total;
}

/** Consecutive days (ending today, or yesterday if today isn't lit yet) that met their goal. */
export function simpleStreak(today: string): number {
  let key = getDay(today).total >= getDay(today).goal ? today : previousDayKey(today);
  let streak = 0;
  for (;;) {
    const d = getDay(key);
    if (d.total === 0 || d.total < d.goal) break;
    streak++;
    key = previousDayKey(key);
  }
  return streak;
}

export type TodaySnapshot = {
  date: string;
  total: number;
  goal: number;
  left: number;
  lit: boolean;
  streak: number;
  entries: Entry[]; // newest first
  endsAt: Date;
};

let cache: { version: number; date: string; snap: TodaySnapshot } | null = null;

function snapshot(): TodaySnapshot {
  const now = new Date();
  const date = salliDayKey(now);
  if (cache && cache.version === version && cache.date === date) return cache.snap;
  const day = getDay(date);
  const goal = day.goal;
  const snap: TodaySnapshot = {
    date,
    total: day.total,
    goal,
    left: Math.max(0, goal - day.total),
    lit: day.total >= goal,
    streak: simpleStreak(date),
    entries: [...day.entries].reverse(),
    endsAt: nextMaghrib(now),
  };
  cache = { version, date, snap };
  return snap;
}

/** Live view of today's counts; re-renders on every add and at Maghrib. */
export function useToday(): TodaySnapshot {
  const snap = useSyncExternalStore(subscribe, snapshot, snapshot);
  // Roll over to the new Salli day when Maghrib passes.
  useMaghribRollover(snap.endsAt);
  return snap;
}

function useMaghribRollover(endsAt: Date) {
  useEffect(() => {
    const ms = Math.max(1000, endsAt.getTime() - Date.now() + 500);
    const t = setTimeout(emit, Math.min(ms, 2 ** 31 - 1));
    // Timers pause in the background, so re-check whenever the app returns.
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') emit();
    });
    return () => {
      clearTimeout(t);
      sub.remove();
    };
  }, [endsAt]);
}

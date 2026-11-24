/**
 * Offline-first salawat counts. Every change is written to the phone
 * (MMKV) synchronously, so nothing waits on the network. Each entry carries a
 * client_id so the later Supabase sync can never double-count it.
 */
import { useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { nextMaghrib, previousDayKey, salliDayKey } from '@/lib/salliDay';

import { getDay, isLit, saveDay, type Entry, type EntrySource } from './days';
import { storage } from './storage';
import { crossedMilestone } from './milestones';
import { lifetimeTotals } from './stats';
import { queueEntry } from './syncQueue';
import type { Milestone } from '@/content/milestones';
import { computeStreak, goalProgress, weekKeys, type GoalProgress, type StreakState } from './streaks';

export { DEFAULT_DAILY_GOAL, type Entry, type EntrySource } from './days';

/** Max amount for one add, to stop typos like 100000. */
export const MAX_SINGLE_ADD = 10000;
/** Taps within this window are grouped into one log entry. */
const TAP_GROUP_MS = 2 * 60 * 1000;

// ---- tiny subscription so screens re-render when counts change ----
const listeners = new Set<() => void>();
let version = 0;
export function notifyChange() {
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

// ---- tell listeners when an add lights today's lantern ----
const litListeners = new Set<(source: EntrySource) => void>();
/** Called whenever an add crosses today's goal. Returns an unsubscribe function. */
export function onGoalLit(fn: (source: EntrySource) => void) {
  litListeners.add(fn);
  return () => {
    litListeners.delete(fn);
  };
}

// ---- tell listeners when an add reaches a lifetime milestone ----
const milestoneListeners = new Set<(m: Milestone, source: EntrySource) => void>();
export function onMilestone(fn: (m: Milestone, source: EntrySource) => void) {
  milestoneListeners.add(fn);
  return () => {
    milestoneListeners.delete(fn);
  };
}

export type AddResult = {
  total: number;
  /** True when this add lit today's lantern (crossed the goal). */
  litNow: boolean;
  /** Lifetime milestone reached by this add, if any. */
  milestone: Milestone | null;
};

/** Add salawat to the current Salli day. */
export function addSalawat(amount: number, source: EntrySource, now = new Date()): AddResult {
  const date = salliDayKey(now);
  const day = getDay(date);
  const n = Math.floor(amount);
  if (!Number.isFinite(n) || n <= 0) return { total: day.total, litNow: false, milestone: null };
  const add = Math.min(n, MAX_SINGLE_ADD);
  const wasLit = isLit(day);

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
  saveDay(day);
  queueEntry(day.entries[day.entries.length - 1].clientId, date);
  notifyChange();
  const litNow = !wasLit && isLit(day);
  if (litNow) litListeners.forEach((l) => l(source));
  const after = lifetimeTotals(date).lifetime;
  const milestone = crossedMilestone(after - add, after);
  if (milestone) milestoneListeners.forEach((l) => l(milestone, source));
  return { total: day.total, litNow, milestone };
}

// ---- the streak takeover plays once per lit day ----
const takeoverKey = (date: string) => `takeover.shown.${date}`;
export const takeoverShown = (date: string) => storage.getBoolean(takeoverKey(date)) ?? false;
export const markTakeoverShown = (date: string) => storage.set(takeoverKey(date), true);

// ---- "a shield kept your lantern lit" notice, shown once ----
const shieldNoticeKey = (date: string) => `shield.noticed.${date}`;
export function dismissShieldNotice(date: string) {
  storage.set(shieldNoticeKey(date), true);
  notifyChange();
}

export type TodaySnapshot = {
  date: string;
  total: number;
  goal: number;
  left: number;
  lit: boolean;
  entries: Entry[]; // newest first
  endsAt: Date;
  streak: StreakState;
  goalBar: GoalProgress;
  week: string[];
  /** Yesterday's key when a shield saved it and the user hasn't been told yet. */
  shieldNotice: string | null;
};

let cache: { version: number; date: string; snap: TodaySnapshot } | null = null;

function snapshot(): TodaySnapshot {
  const now = new Date();
  const date = salliDayKey(now);
  if (cache && cache.version === version && cache.date === date) return cache.snap;
  const day = getDay(date);
  const streak = computeStreak(date);
  const yesterday = previousDayKey(date);
  const shieldNotice =
    streak.status[yesterday] === 'shield' && !storage.getBoolean(shieldNoticeKey(yesterday)) ? yesterday : null;
  const snap: TodaySnapshot = {
    date,
    total: day.total,
    goal: day.goal,
    left: Math.max(0, day.goal - day.total),
    lit: isLit(day),
    entries: [...day.entries].reverse(),
    endsAt: nextMaghrib(now),
    streak,
    goalBar: goalProgress(streak.current),
    week: weekKeys(date),
    shieldNotice,
  };
  cache = { version, date, snap };
  return snap;
}

/** Read today's state outside React (e.g. right after an add). */
export const getToday = snapshot;

/** Live view of today's counts; re-renders on every add and at Maghrib. */
export function useToday(): TodaySnapshot {
  const snap = useSyncExternalStore(subscribe, snapshot, snapshot);
  useMaghribRollover(snap.endsAt);
  return snap;
}

function useMaghribRollover(endsAt: Date) {
  useEffect(() => {
    const ms = Math.max(1000, endsAt.getTime() - Date.now() + 500);
    const t = setTimeout(notifyChange, Math.min(ms, 2 ** 31 - 1));
    // Timers pause in the background, so re-check whenever the app returns.
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') notifyChange();
    });
    return () => {
      clearTimeout(t);
      sub.remove();
    };
  }, [endsAt]);
}

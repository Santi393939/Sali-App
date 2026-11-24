/** User settings saved on the phone. */
import { useSyncExternalStore } from 'react';

import { salliDayKey } from '@/lib/salliDay';

import { notifyChange } from './counts';
import { DEFAULT_DAILY_GOAL, getDay, saveDay } from './days';
import { readJSON, writeJSON } from './storage';
import { invalidateStreakCache } from './streaks';

export type CountingStyle = 'up' | 'down';

export type Settings = {
  name: string;
  dailyGoal: number;
  countingStyle: CountingStyle;
  asrReminder: boolean;
  fridayReminders: boolean;
  shareCountWithGroup: boolean;
};

const KEY = 'settings.v1';
const DEFAULTS: Settings = {
  name: '',
  dailyGoal: DEFAULT_DAILY_GOAL,
  countingStyle: 'up',
  asrReminder: true,
  fridayReminders: true,
  shareCountWithGroup: false, // off by default, per the brief
};

export const GOAL_MIN = 1;
export const GOAL_MAX = 100000;

const listeners = new Set<() => void>();
let current: Settings = { ...DEFAULTS, ...readJSON<Partial<Settings>>(KEY, {}) };

export function getSettings(): Settings {
  return current;
}

export function updateSettings(patch: Partial<Settings>) {
  current = { ...current, ...patch };
  writeJSON(KEY, current);
  if (patch.dailyGoal != null) applyGoalToToday(patch.dailyGoal);
  listeners.forEach((l) => l());
}

/** A new goal applies from today; past days keep the goal they had. */
function applyGoalToToday(goal: number) {
  const day = getDay(salliDayKey());
  day.goal = goal;
  saveDay(day);
  invalidateStreakCache();
  notifyChange();
}

export function useSettings(): Settings {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getSettings,
    getSettings,
  );
}

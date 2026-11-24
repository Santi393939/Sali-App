/** User settings saved on the phone. */
import { useSyncExternalStore } from 'react';

import { salliDayKey } from '@/lib/salliDay';

import { SOUNDS, THEMES, type SoundId, type ThemeId } from '@/content/rewards';

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
  /** Rewards (each needs its milestone; checked where used). */
  theme: ThemeId;
  tapSound: SoundId;
  /** Amount of the milestone shown on the profile, or null. */
  featuredBadge: number | null;
};

const KEY = 'settings.v1';
const DEFAULTS: Settings = {
  name: '',
  dailyGoal: DEFAULT_DAILY_GOAL,
  countingStyle: 'up',
  asrReminder: true,
  fridayReminders: true,
  shareCountWithGroup: false, // off by default, per the brief
  theme: 'zellige',
  tapSound: 'tick',
  featuredBadge: null,
};

export const GOAL_MIN = 1;
export const GOAL_MAX = 100000;

const listeners = new Set<() => void>();
let current: Settings = sanitize({ ...DEFAULTS, ...readJSON<Partial<Settings>>(KEY, {}) });

/** Drop values from older versions that no longer exist. */
function sanitize(s: Settings): Settings {
  return {
    ...s,
    theme: s.theme in THEMES ? s.theme : 'zellige',
    tapSound: s.tapSound in SOUNDS ? s.tapSound : 'tick',
  };
}

export function getSettings(): Settings {
  return current;
}

type ChangeListener = (fields: (keyof Settings)[]) => void;
let changeListener: ChangeListener | null = null;
/** The sync engine registers here to upload changed settings. */
export function setSettingsChangeListener(fn: ChangeListener | null) {
  changeListener = fn;
}

export function updateSettings(patch: Partial<Settings>, opts: { fromServer?: boolean } = {}) {
  current = { ...current, ...patch };
  writeJSON(KEY, current);
  if (patch.dailyGoal != null) applyGoalToToday(patch.dailyGoal);
  listeners.forEach((l) => l());
  if (!opts.fromServer) changeListener?.(Object.keys(patch) as (keyof Settings)[]);
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

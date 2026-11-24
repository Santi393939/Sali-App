/** User settings saved on the phone. */
import { useSyncExternalStore } from 'react';

import { deviceLanguage, setLanguage, type Lang } from '@/lib/i18n';
import { salliDayKey, setLocation, type SavedLocation } from '@/lib/salliDay';

import type { GlassId } from '@/content/extras';
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
  /** Gentle nudge an hour before Maghrib if the lantern isn't lit. */
  preMaghribReminder: boolean;
  /** Finished the first-run welcome. */
  onboarded: boolean;
  /** Sound effects (taps, chimes) and vibration. */
  sounds: boolean;
  haptics: boolean;
  shareCountWithGroup: boolean;
  /** Rewards (each needs its milestone; checked where used). */
  theme: ThemeId;
  tapSound: SoundId;
  /** Amount of the milestone shown on the profile, or null. */
  featuredBadge: number | null;
  /** Lantern glass colour (unlocked by lamps every 5,000). */
  lanternGlass: GlassId;
  /** App language; starts from the phone's language. */
  language: Lang;
  /** Dark by default; 'system' follows the phone. */
  appearance: Appearance;
  /** "Not yet" on the step-up offer: hide it for this goal until that day. */
  goalNudge: { goal: number; until: string } | null;
};

export type Appearance = 'system' | 'light' | 'dark';

const KEY = 'settings.v1';
const DEFAULTS: Settings = {
  name: '',
  dailyGoal: DEFAULT_DAILY_GOAL,
  countingStyle: 'up',
  asrReminder: true,
  fridayReminders: true,
  preMaghribReminder: true,
  onboarded: false,
  sounds: true,
  haptics: true,
  shareCountWithGroup: false, // off by default, per the brief
  theme: 'zellige',
  tapSound: 'tick',
  featuredBadge: null,
  lanternGlass: 'amber',
  language: deviceLanguage(),
  appearance: 'dark', // Salli looks best at night; Light and Automatic are in Me
  goalNudge: null,
};

export const GOAL_MIN = 1;
export const GOAL_MAX = 100000;

const listeners = new Set<() => void>();
let current: Settings = sanitize({ ...DEFAULTS, ...readJSON<Partial<Settings>>(KEY, {}) });
setLanguage(current.language);

/** Drop values from older versions that no longer exist. */
function sanitize(s: Settings): Settings {
  return {
    ...s,
    theme: s.theme in THEMES ? s.theme : 'zellige',
    tapSound: s.tapSound in SOUNDS ? s.tapSound : 'tick',
    appearance: s.appearance === 'light' || s.appearance === 'dark' ? s.appearance : 'system',
    language: s.language === 'ar' || s.language === 'fr' || s.language === 'en' ? s.language : deviceLanguage(),
  };
}

/** Back to first-run defaults (used by Delete all my data). */
export function resetSettings() {
  current = { ...DEFAULTS, language: current.language, appearance: current.appearance };
  listeners.forEach((l) => l());
}

export function getSettings(): Settings {
  return current;
}

type ChangeListener = (fields: (keyof Settings)[]) => void;
const changeListeners = new Set<ChangeListener>();
/** Sync and reminders register here to react to changed settings. */
export function addSettingsChangeListener(fn: ChangeListener) {
  changeListeners.add(fn);
  return () => {
    changeListeners.delete(fn);
  };
}

export function updateSettings(patch: Partial<Settings>, opts: { fromServer?: boolean } = {}) {
  current = { ...current, ...patch };
  writeJSON(KEY, current);
  if (patch.dailyGoal != null) applyGoalToToday(patch.dailyGoal);
  if (patch.language) {
    setLanguage(patch.language);
    notifyChange(); // quest titles and other snapshot text rebuild in the new language
  }
  listeners.forEach((l) => l());
  if (!opts.fromServer) changeListeners.forEach((l) => l(Object.keys(patch) as (keyof Settings)[]));
}

/** A new goal applies from today; past days keep the goal they had. */
function applyGoalToToday(goal: number) {
  const day = getDay(salliDayKey());
  day.goal = goal;
  saveDay(day);
  invalidateStreakCache();
  notifyChange();
}

export function subscribeSettings(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** Save the city used for Maghrib/Asr; the Salli day and streaks follow it. */
export function setCity(loc: SavedLocation | null) {
  setLocation(loc);
  invalidateStreakCache();
  notifyChange();
  listeners.forEach((l) => l());
  changeListeners.forEach((l) => l(['onboarded'])); // nudges listeners (e.g. reminders) to refresh
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

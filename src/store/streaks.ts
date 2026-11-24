/**
 * Streak rules from the brief, worked out on the phone from the saved days:
 *  - A day is lit when its total reaches that day's goal.
 *  - Lit day → streak + 1. Best streak is kept forever.
 *  - A missed (finished, unlit) day breaks the streak unless a shield is used.
 *  - Shields: earn 1 per perfect week (7 lit days in a row), hold at most 2.
 *    A shield is used automatically on a missed day; the streak survives but
 *    does not grow that day.
 *  - Today never breaks the streak while it is still in progress.
 *  - Streak goals: 7, 14, 30, 50, 100, 365 days (then every 365).
 *  - Lantern levels: Bronze (7), Silver (30), Gold (100), Emerald (365).
 */
import { addDays, nextDayKey } from '@/lib/salliDay';

import { getDay, isLit, savedDayKeys } from './days';
import { readJSON, storage, writeJSON } from './storage';

export const MAX_SHIELDS = 2;
export const PERFECT_WEEK = 7;
export const STREAK_GOALS = [7, 14, 30, 50, 100, 365] as const;

export type LanternLevel = 'brass' | 'bronze' | 'silver' | 'gold' | 'emerald';

export const LEVELS: { level: LanternLevel; from: number; name: string }[] = [
  { level: 'emerald', from: 365, name: 'Emerald' },
  { level: 'gold', from: 100, name: 'Gold' },
  { level: 'silver', from: 30, name: 'Silver' },
  { level: 'bronze', from: 7, name: 'Bronze' },
  { level: 'brass', from: 0, name: 'Brass' },
];

export function levelFor(streak: number): LanternLevel {
  return LEVELS.find((l) => streak >= l.from)!.level;
}

/** 'repaired': a missed day relit by reaching double the goal the next day. */
export type DayStatus = 'lit' | 'shield' | 'repaired' | 'missed' | 'pending';

export type StreakState = {
  current: number;
  best: number;
  shields: number;
  todayLit: boolean;
  /** Streak as it stood before today (what the takeover flips from). */
  beforeToday: number;
  lastLitDate: string | null;
  /** Status per day key, for the week row and calendar. */
  status: Record<string, DayStatus>;
  /** Days where a shield was used automatically. */
  shieldDays: string[];
  level: LanternLevel;
  /** Days with all quests done (every 5 earns a shield). */
  questDays: number;
};

export type GoalProgress = {
  previous: number; // last goal passed (0 at the start)
  next: number; // next goal to reach
  segments: number; // segments in the bar
  filled: number; // segments filled
  toGo: number; // days left to the next goal
  /** True on the day a goal is reached: the bar shows that goal, full. */
  reached: boolean;
};

export function goalProgress(streak: number): GoalProgress {
  const isGoal = (STREAK_GOALS as readonly number[]).includes(streak) || (streak > 365 && streak % 365 === 0);
  if (isGoal) {
    const base = goalProgress(streak - 1);
    return { ...base, filled: base.segments, toGo: 0, reached: true };
  }
  let previous = 0;
  let next: number = STREAK_GOALS.find((g) => g > streak) ?? 0;
  if (!next) {
    // Past 365: every further year is the next goal.
    next = (Math.floor(streak / 365) + 1) * 365;
    previous = next - 365;
  } else {
    const i = STREAK_GOALS.indexOf(next as (typeof STREAK_GOALS)[number]);
    previous = i > 0 ? STREAK_GOALS[i - 1] : 0;
  }
  const span = next - previous;
  const segments = span <= 10 ? span : 10;
  const filled = Math.min(segments, Math.floor(((streak - previous) / span) * segments));
  return { previous, next, segments, filled, toGo: next - streak, reached: false };
}

const BEST_KEY = 'streak.best';

// Past days never change on the phone, so the walk up to yesterday is
// cached per day; only today's record is re-read on each add.
type PastState = {
  current: number;
  best: number;
  shields: number;
  run: number;
  lastLitDate: string | null;
  status: Record<string, DayStatus>;
  shieldDays: string[];
  quests: number;
};

let pastCache: { today: string; state: PastState } | null = null;

// ---- streak repair: relight a missed day by reaching 2× the goal the next day ----
const REPAIRED_KEY = 'streak.repaired';
/** Smallest streak worth offering a repair for. */
export const REPAIR_MIN_STREAK = 3;
export const REPAIR_MULTIPLIER = 2;

export const repairedDays = () => new Set(readJSON<string[]>(REPAIRED_KEY, []));
export function markRepaired(day: string) {
  const set = repairedDays();
  set.add(day);
  writeJSON(REPAIRED_KEY, [...set]);
  invalidateStreakCache();
}

// ---- daily quests: every 5 days with all quests done earns a shield ----
const QUEST_DAYS_KEY = 'quests.doneDays';
export const QUEST_DAYS_PER_SHIELD = 5;
export const questDays = () => new Set(readJSON<string[]>(QUEST_DAYS_KEY, []));
export function markQuestDay(day: string) {
  const set = questDays();
  if (set.has(day)) return;
  set.add(day);
  writeJSON(QUEST_DAYS_KEY, [...set]);
  invalidateStreakCache();
}

export function invalidateStreakCache() {
  pastCache = null;
}

function walkPast(today: string): PastState {
  if (pastCache?.today === today) return pastCache.state;

  const keys = savedDayKeys().filter((k) => k < today);
  let current = 0;
  let best = 0;
  let shields = 0;
  let run = 0; // lit days in a row toward the next shield
  let lastLitDate: string | null = null;
  let quests = 0; // quest-complete days so far
  const status: Record<string, DayStatus> = {};
  const shieldDays: string[] = [];
  const repaired = repairedDays();
  const questDone = questDays();

  if (keys.length > 0) {
    for (let key = keys[0]; key < today; key = nextDayKey(key)) {
      if (questDone.has(key)) {
        quests++;
        if (quests % QUEST_DAYS_PER_SHIELD === 0) shields = Math.min(MAX_SHIELDS, shields + 1);
      }
      if (isLit(getDay(key))) {
        current++;
        best = Math.max(best, current);
        lastLitDate = key;
        status[key] = 'lit';
        run++;
        if (run === PERFECT_WEEK) {
          shields = Math.min(MAX_SHIELDS, shields + 1);
          run = 0;
        }
      } else if (current > 0 && repaired.has(key)) {
        status[key] = 'repaired';
        run = 0;
      } else if (current > 0 && shields > 0) {
        shields--;
        status[key] = 'shield';
        shieldDays.push(key);
        run = 0;
      } else {
        current = 0;
        status[key] = 'missed';
        run = 0;
      }
    }
  }

  const state = { current, best, shields, lastLitDate, status, shieldDays, run, quests };
  pastCache = { today, state };
  return state;
}

export function computeStreak(today: string): StreakState {
  const past = walkPast(today);
  const todayLit = isLit(getDay(today));
  const current = past.current + (todayLit ? 1 : 0);
  let shields = past.shields;
  if (todayLit && past.run + 1 === PERFECT_WEEK) shields = Math.min(MAX_SHIELDS, shields + 1);
  const questsToday = questDays().has(today);
  const questCount = past.quests + (questsToday ? 1 : 0);
  if (questsToday && questCount % QUEST_DAYS_PER_SHIELD === 0) shields = Math.min(MAX_SHIELDS, shields + 1);

  const storedBest = storage.getNumber(BEST_KEY) ?? 0;
  const best = Math.max(storedBest, past.best, current);
  if (best > storedBest) storage.set(BEST_KEY, best);

  return {
    current,
    best,
    shields,
    todayLit,
    beforeToday: past.current,
    lastLitDate: todayLit ? today : past.lastLitDate,
    status: { ...past.status, [today]: todayLit ? 'lit' : 'pending' },
    shieldDays: past.shieldDays,
    level: levelFor(current),
    questDays: questCount,
  };
}

export type RepairOffer = { day: string; streak: number };

/**
 * Yesterday was missed and broke a streak of 3+ days (no shield left):
 * reaching 2× today's goal relights it. Null when there is nothing to repair.
 */
export function repairOffer(today: string): RepairOffer | null {
  const past = walkPast(today);
  const day = addDays(today, -1);
  if (past.status[day] !== 'missed') return null;
  let streak = 0;
  for (let k = addDays(day, -1); ; k = addDays(k, -1)) {
    const st = past.status[k];
    if (st === 'lit') streak++;
    else if (st !== 'shield' && st !== 'repaired') break;
  }
  return streak >= REPAIR_MIN_STREAK ? { day, streak } : null;
}

/** The 7 Salli days ending today, oldest first. */
export function weekKeys(today: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
}

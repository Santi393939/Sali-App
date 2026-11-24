/** Milestone progress, earned dates and a pace-based arrival estimate. */
import { MILESTONES, type Milestone } from '@/content/milestones';
import { addDays, keyToDate } from '@/lib/salliDay';

import { getDay, savedDayKeys } from './days';

export type MilestoneState = Milestone & {
  earned: boolean;
  /** Salli day it was reached (from the saved history). */
  earnedOn: string | null;
};

export type MilestoneProgress = {
  lifetime: number;
  list: MilestoneState[];
  next: MilestoneState | null;
  /** Previous milestone amount (0 before the first). */
  previous: number;
  /** 0–1 between the previous and next milestone. */
  fraction: number;
  /** Average per day over the last 7 days (today included). */
  pace: number;
  /** Days to the next milestone at that pace, or null when there's no pace yet. */
  etaDays: number | null;
};

export function milestoneProgress(today: string): MilestoneProgress {
  const keys = savedDayKeys().filter((k) => k <= today);
  let running = 0;
  const earnedOn = new Map<number, string>();
  for (const k of keys) {
    running += getDay(k).total;
    for (const m of MILESTONES) if (!earnedOn.has(m.amount) && running >= m.amount) earnedOn.set(m.amount, k);
  }
  const lifetime = running;
  const list: MilestoneState[] = MILESTONES.map((m) => ({
    ...m,
    earned: lifetime >= m.amount,
    earnedOn: earnedOn.get(m.amount) ?? null,
  }));
  const next = list.find((m) => !m.earned) ?? null;
  const idx = next ? MILESTONES.findIndex((m) => m.amount === next.amount) : -1;
  const previous = next ? (idx > 0 ? MILESTONES[idx - 1].amount : 0) : lifetime;
  const fraction = next ? (lifetime - previous) / (next.amount - previous) : 1;

  let week = 0;
  for (let i = 0; i < 7; i++) week += getDay(addDays(today, -i)).total;
  const pace = Math.round(week / 7);
  const etaDays = next && pace > 0 ? Math.max(1, Math.ceil((next.amount - lifetime) / pace)) : null;

  return { lifetime, list, next, previous, fraction, pace, etaDays };
}

/** "Mon 30 Nov" for a date `days` after today. */
export function etaLabel(today: string, days: number): string {
  return keyToDate(addDays(today, days)).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** Milestone crossed by going from `before` to `after`, if any (the highest one). */
export function crossedMilestone(before: number, after: number): Milestone | null {
  const crossed = MILESTONES.filter((m) => before < m.amount && after >= m.amount);
  return crossed.length ? crossed[crossed.length - 1] : null;
}

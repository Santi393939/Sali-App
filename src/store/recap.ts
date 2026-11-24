/**
 * "Your year in Salli": the calendar year so far, told as a few big numbers
 * (like a fitness app's year in review). Everything is read from the days
 * saved on the phone.
 */
import { MILESTONES } from '@/content/milestones';
import { lampsFor } from '@/content/extras';
import { addDays, keyToDate } from '@/lib/salliDay';

import { getDay, isLit, savedDayKeys, type EntrySource } from './days';
import { milestoneProgress } from './milestones';

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

export type YearRecap = {
  year: string;
  total: number;
  litDays: number;
  activeDays: number;
  longestRun: number;
  litFridays: number;
  bestDay: { total: number; date: string } | null;
  bestMonth: { month: number; total: number } | null;
  favouriteTime: TimeOfDay | null;
  favouriteWay: EntrySource | null;
  milestones: string[];
  lamps: number;
};

function timeOf(hour: number): TimeOfDay {
  if (hour >= 4 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

/** `_version` changes with every count, so callers re-read after changes. */
export function yearRecap(today: string, _version?: number): YearRecap {
  const year = today.slice(0, 4);
  const all = savedDayKeys().filter((k) => k <= today);
  const keys = all.filter((k) => k.startsWith(`${year}-`));
  let total = 0;
  let litDays = 0;
  let activeDays = 0;
  let litFridays = 0;
  let bestDay: YearRecap['bestDay'] = null;
  const months = new Array<number>(12).fill(0);
  const times: Record<TimeOfDay, number> = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  const ways = new Map<EntrySource, number>();
  const lit = new Set<string>();
  for (const k of keys) {
    const day = getDay(k);
    if (day.total <= 0) continue;
    total += day.total;
    activeDays++;
    months[keyToDate(k).getMonth()] += day.total;
    if (!bestDay || day.total > bestDay.total) bestDay = { total: day.total, date: k };
    if (isLit(day)) {
      litDays++;
      lit.add(k);
      if (keyToDate(k).getDay() === 5) litFridays++;
    }
    for (const e of day.entries) {
      times[timeOf(new Date(e.createdAt).getHours())] += e.amount;
      ways.set(e.source, (ways.get(e.source) ?? 0) + e.amount);
    }
  }
  // Longest run of lit days this year.
  let longestRun = 0;
  for (const k of lit) {
    if (lit.has(addDays(k, -1))) continue;
    let n = 1;
    while (lit.has(addDays(k, n))) n++;
    longestRun = Math.max(longestRun, n);
  }
  const top = months.reduce((best, v, i) => (v > (best?.total ?? 0) ? { month: i, total: v } : best), null as YearRecap['bestMonth']);
  const timeTop = (Object.entries(times) as [TimeOfDay, number][]).sort((a, b) => b[1] - a[1])[0];
  const wayTop = [...ways.entries()].sort((a, b) => b[1] - a[1])[0];
  const before = all.filter((k) => k < `${year}-`).reduce((s, k) => s + getDay(k).total, 0);
  const milestones = milestoneProgress(today)
    .list.filter((m) => m.earnedOn?.startsWith(`${year}-`))
    .map((m) => MILESTONES.find((x) => x.amount === m.amount)?.name ?? m.name);
  return {
    year,
    total,
    litDays,
    activeDays,
    longestRun,
    litFridays,
    bestDay,
    bestMonth: top,
    favouriteTime: timeTop && timeTop[1] > 0 ? timeTop[0] : null,
    favouriteWay: wayTop ? wayTop[0] : null,
    milestones,
    lamps: lampsFor(before + total) - lampsFor(before),
  };
}

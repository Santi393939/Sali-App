/** Totals for the Stats and Me screens, computed from the saved days. */
import { addDays, keyToDate, toDayKey } from '@/lib/salliDay';

import { getDay, isLit, savedDayKeys } from './days';

export type Period = 'week' | 'month' | 'year';

export type Bar = { key: string; label: string; total: number; current: boolean };

export type PeriodStats = {
  total: number;
  previousTotal: number;
  /** Percent change vs the previous period, or null when there is nothing to compare. */
  change: number | null;
  bars: Bar[];
  litDays: number;
};

const sumDays = (from: string, to: string) => {
  let total = 0;
  let lit = 0;
  for (let k = from; k <= to; k = addDays(k, 1)) {
    const d = getDay(k);
    total += d.total;
    if (isLit(d)) lit++;
  }
  return { total, lit };
};

const WEEKDAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

/** `_version` is unused: it tells the React Compiler the result depends on saved counts. */
export function periodStats(period: Period, today: string, _version?: number): PeriodStats {
  if (period === 'year') {
    const t = keyToDate(today);
    const bars: Bar[] = [];
    for (let i = 11; i >= 0; i--) {
      const start = new Date(t.getFullYear(), t.getMonth() - i, 1, 12);
      const end = new Date(t.getFullYear(), t.getMonth() - i + 1, 0, 12);
      const to = i === 0 ? today : toDayKey(end);
      bars.push({ key: toDayKey(start), label: MONTH[start.getMonth()], total: sumDays(toDayKey(start), to).total, current: i === 0 });
    }
    const from = bars[0].key;
    const prevFrom = toDayKey(new Date(t.getFullYear() - 1, t.getMonth() - 11, 1, 12));
    const prevTo = addDays(from, -1);
    const cur = sumDays(from, today);
    const prev = sumDays(prevFrom, prevTo);
    return withChange(cur.total, prev.total, bars, cur.lit);
  }

  const days = period === 'week' ? 7 : 30;
  const from = addDays(today, -(days - 1));
  const bars: Bar[] = Array.from({ length: days }, (_, i) => {
    const key = addDays(from, i);
    const d = keyToDate(key);
    return {
      key,
      label: period === 'week' ? WEEKDAY[d.getDay()] : i % 5 === 4 || i === days - 1 ? String(d.getDate()) : '',
      total: getDay(key).total,
      current: key === today,
    };
  });
  const cur = sumDays(from, today);
  const prev = sumDays(addDays(from, -days), addDays(from, -1));
  return withChange(cur.total, prev.total, bars, cur.lit);
}

function withChange(total: number, previousTotal: number, bars: Bar[], litDays: number): PeriodStats {
  const change = previousTotal > 0 ? Math.round(((total - previousTotal) / previousTotal) * 100) : null;
  return { total, previousTotal, change, bars, litDays };
}

/** Everything ever logged, and this calendar year's total. */
export function lifetimeTotals(today: string): { lifetime: number; year: number } {
  const year = today.slice(0, 4);
  let lifetime = 0;
  let thisYear = 0;
  for (const k of savedDayKeys()) {
    if (k > today) continue;
    const t = getDay(k).total;
    lifetime += t;
    if (k.startsWith(year)) thisYear += t;
  }
  return { lifetime, year: thisYear };
}


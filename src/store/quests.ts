/**
 * Daily quests: three small goals each day: "Light today's lantern" plus two
 * that rotate. Finishing all three marks a quest day; every 5 quest days
 * earns a streak shield (see streaks.ts).
 */
import { asrOn, keyToDate, salliDayKey } from '@/lib/salliDay';

import { getDay, type DayRecord } from './days';
import { readJSON, writeJSON } from './storage';
import { markQuestDay, questDays } from './streaks';
import { t } from '@/lib/i18n';

export type QuestId = 'lantern' | 'tap33' | 'tap100' | 'reminder10' | 'read3' | 'afterAsr' | 'morning' | 'like' | 'jumuah';

export type Quest = { id: QuestId; title: string; progress: number; target: number; done: boolean };

type DayExtras = { views: string[]; likes: number; done: QuestId[] };
const extrasKey = (date: string) => `quests.day.${date}`;
const getExtras = (date: string) => readJSON<DayExtras>(extrasKey(date), { views: [], likes: 0, done: [] });
const saveExtras = (date: string, e: DayExtras) => writeJSON(extrasKey(date), e);

const sumWhere = (day: DayRecord, pred: (e: DayRecord['entries'][number]) => boolean) =>
  day.entries.reduce((s, e) => (pred(e) ? s + e.amount : s), 0);

/** Total tapped on the arch in a Salli day (taps are grouped into entries). */
export const tapsOn = (day: DayRecord) => sumWhere(day, (e) => e.source === 'tap');

const DEFS: Record<QuestId, { title: string; target: (goal: number) => number; measure: (day: DayRecord, x: DayExtras, date: string) => number }> = {
  lantern: { title: 'Light today’s lantern', target: (g) => g, measure: (d) => d.total },
  tap33: { title: 'Tap the arch 33 times', target: () => 33, measure: (d) => tapsOn(d) },
  tap100: { title: 'Tap the arch 100 times', target: () => 100, measure: (d) => tapsOn(d) },
  reminder10: { title: 'Send 10 from a reminder', target: () => 10, measure: (d) => sumWhere(d, (e) => e.source === 'reminder') },
  read3: { title: 'Read 3 reminders', target: () => 3, measure: (_d, x) => x.views.length },
  afterAsr: {
    title: 'Send 100 after Asr',
    target: () => 100,
    measure: (d, _x, date) => {
      const asr = asrOn(keyToDate(date)).getTime();
      return sumWhere(d, (e) => new Date(e.updatedAt).getTime() >= asr);
    },
  },
  morning: { title: 'Send 100 before noon', target: () => 100, measure: (d) => sumWhere(d, (e) => new Date(e.createdAt).getHours() < 12) },
  like: { title: 'Like a reminder', target: () => 1, measure: (_d, x) => x.likes },
  jumuah: {
    title: 'Jumu’ah: send salawat at 3 different times',
    target: () => 3,
    measure: (d) => {
      // Separate moments at least 30 minutes apart.
      const times = d.entries.map((e) => new Date(e.createdAt).getTime()).sort((a, b) => a - b);
      let moments = 0;
      let last = -Infinity;
      for (const t of times) {
        if (t - last >= 30 * 60 * 1000) {
          moments++;
          last = t;
        }
      }
      return moments;
    },
  },
};

const POOL: QuestId[] = ['tap33', 'reminder10', 'read3', 'afterAsr', 'morning', 'tap100', 'like'];

/** Same three quests all day; they change with each Salli day. */
export function questIdsFor(date: string): QuestId[] {
  let h = 0;
  for (const ch of date) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const a = POOL[h % POOL.length];
  let b = POOL[(h >>> 5) % POOL.length];
  if (b === a) b = POOL[(POOL.indexOf(a) + 3) % POOL.length];
  // Fridays bring the special Jumu'ah quest.
  if (keyToDate(date).getDay() === 5) return ['lantern', 'jumuah', a];
  return ['lantern', a, b];
}

export function questsFor(date: string): Quest[] {
  const day = getDay(date);
  const x = getExtras(date);
  return questIdsFor(date).map((id) => {
    const def = DEFS[id];
    const target = def.target(day.goal);
    const progress = Math.min(target, def.measure(day, x, date));
    return { id, title: t(def.title), progress, target, done: progress >= target };
  });
}

// ---- events: a quest (or all three) just completed ----
export type QuestEvent = { quest: Quest; allDone: boolean; questDays: number };
const eventListeners = new Set<(e: QuestEvent) => void>();
export function onQuestEvent(fn: (e: QuestEvent) => void) {
  eventListeners.add(fn);
  return () => {
    eventListeners.delete(fn);
  };
}
// counts.ts registers here to refresh screens when views/likes change
let changed: (() => void) | null = null;
export function setQuestChangeHandler(fn: () => void) {
  changed = fn;
}

/** Check for newly finished quests today; emit events and record a quest day. */
export function checkQuests(date = salliDayKey()) {
  const quests = questsFor(date);
  const x = getExtras(date);
  const fresh = quests.filter((q) => q.done && !x.done.includes(q.id));
  if (!fresh.length) return;
  x.done = [...x.done, ...fresh.map((q) => q.id)];
  saveExtras(date, x);
  const allDone = quests.every((q) => q.done);
  if (allDone) markQuestDay(date);
  const days = questDays().size;
  fresh.forEach((quest, i) => eventListeners.forEach((l) => l({ quest, allDone: allDone && i === fresh.length - 1, questDays: days })));
}

/** A reminder card was seen (counts once per card per day). */
export function recordReminderView(id: string) {
  const date = salliDayKey();
  const x = getExtras(date);
  if (x.views.includes(id)) return;
  x.views = [...x.views, id];
  saveExtras(date, x);
  checkQuests(date);
  changed?.();
}

export function recordReminderLike() {
  const date = salliDayKey();
  const x = getExtras(date);
  x.likes += 1;
  saveExtras(date, x);
  checkQuests(date);
  changed?.();
}

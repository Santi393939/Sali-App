/**
 * Offline-first sync with Supabase.
 *
 *  • Push: every local entry is upserted by (user, client_id), so sending the
 *    same entry twice never double-counts. Tap entries grow on the phone and
 *    are simply re-sent with their new amount.
 *  • Pull: entries changed on the server since the last pull (e.g. logged from
 *    another phone or the Telegram bot) are merged into the local days.
 *  • Live: a realtime subscription merges new server entries instantly.
 *  • Settings and reminder likes/saves are pushed when they change.
 *
 * Nothing here blocks counting: the phone writes locally first and syncs in
 * the background whenever signed in and online.
 */
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { salliDayKey } from '@/lib/salliDay';
import { supabase } from '@/lib/supabase';

import { getSession, onSessionChange } from './auth';
import { notifyChange } from './counts';
import { getDay, saveDay, savedDayKeys, type EntrySource } from './days';
import { getAction, setActionChangeListener } from './reminderActions';
import { addSettingsChangeListener, getSettings, updateSettings, type Settings } from './settings';
import { readJSON, storage, writeJSON } from './storage';
import { invalidateStreakCache } from './streaks';
import { clearQueued, pendingEntries, queueEntry, setQueueListener } from './syncQueue';

type ServerEntry = {
  client_id: string;
  amount: number;
  source: EntrySource;
  salli_date: string;
  created_at: string;
  updated_at: string;
};

export type SyncStatus = { state: 'off' | 'idle' | 'syncing' | 'error'; lastSyncedAt: string | null; message?: string };

const CURSOR_KEY = 'sync.cursor';
const LAST_KEY = 'sync.lastSyncedAt';
const SEEDED_KEY = 'sync.seededFor';

let status: SyncStatus = { state: supabase ? 'idle' : 'off', lastSyncedAt: storage.getString(LAST_KEY) ?? null };
const statusListeners = new Set<() => void>();
function setStatus(next: Partial<SyncStatus>) {
  status = { ...status, ...next };
  statusListeners.forEach((l) => l());
}
export const getSyncStatus = () => status;
export function subscribeSyncStatus(l: () => void) {
  statusListeners.add(l);
  return () => {
    statusListeners.delete(l);
  };
}

let timer: ReturnType<typeof setTimeout> | null = null;
let running = false;
let again = false;
let channel: RealtimeChannel | null = null;

/** Ask for a sync soon (debounced so a burst of taps is one upload). */
export function requestSync(delay = 1500) {
  if (!supabase || !getSession()) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void syncNow();
  }, delay);
}

export async function syncNow() {
  const sb = supabase;
  const session = getSession();
  if (!sb || !session) return;
  if (running) {
    again = true;
    return;
  }
  running = true;
  setStatus({ state: 'syncing' });
  try {
    await seedOnce(session.user.id);
    await pushEntries(session.user.id);
    await pullEntries();
    const now = new Date().toISOString();
    storage.set(LAST_KEY, now);
    setStatus({ state: 'idle', lastSyncedAt: now, message: undefined });
  } catch (e) {
    setStatus({ state: 'error', message: e instanceof Error ? e.message : String(e) });
  } finally {
    running = false;
    if (again) {
      again = false;
      requestSync(500);
    }
  }
}

/** First sign-in on this phone: queue everything already counted here, and line up settings. */
async function seedOnce(userId: string) {
  if (storage.getString(SEEDED_KEY) === userId) return;
  for (const date of savedDayKeys()) {
    for (const e of getDay(date).entries) queueEntry(e.clientId, date);
  }
  await pullProfileThenPushSettings();
  await pullReminderActions();
  storage.set(SEEDED_KEY, userId);
  storage.remove(CURSOR_KEY); // pull everything once
}

async function pushEntries(userId: string) {
  const sb = supabase!;
  const queued = pendingEntries();
  const ids = Object.keys(queued);
  if (!ids.length) return;
  const rows = ids
    .map((id) => {
      const date = queued[id];
      const e = getDay(date).entries.find((x) => x.clientId === id);
      return e
        ? {
            user_id: userId,
            client_id: e.clientId,
            amount: e.amount,
            source: e.source,
            salli_date: date,
            created_at: e.createdAt,
          }
        : null;
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);
  for (let i = 0; i < rows.length; i += 200) {
    const batch = rows.slice(i, i + 200);
    const { error } = await sb.from('entries').upsert(batch, { onConflict: 'user_id,client_id' });
    if (error) throw new Error(error.message);
  }
  clearQueued(ids);
}

async function pullEntries() {
  const sb = supabase!;
  let cursor = storage.getString(CURSOR_KEY) ?? '1970-01-01T00:00:00Z';
  for (;;) {
    const { data, error } = await sb
      .from('entries')
      .select('client_id, amount, source, salli_date, created_at, updated_at')
      .gt('updated_at', cursor)
      .order('updated_at', { ascending: true })
      .limit(500);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    mergeServerEntries(data as ServerEntry[]);
    cursor = data[data.length - 1].updated_at;
    storage.set(CURSOR_KEY, cursor);
    if (data.length < 500) break;
  }
}

/** Merge server entries into local days. The phone's own entries win unless the server copy is newer. */
export function mergeServerEntries(rows: ServerEntry[]) {
  const touched = new Set<string>();
  const queued = pendingEntries();
  for (const r of rows) {
    const day = getDay(r.salli_date);
    const local = day.entries.find((e) => e.clientId === r.client_id);
    if (!local) {
      day.entries.push({ clientId: r.client_id, amount: r.amount, source: r.source, createdAt: r.created_at, updatedAt: r.updated_at });
      day.entries.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    } else if (!queued[r.client_id] && r.amount !== local.amount && r.updated_at > local.updatedAt) {
      local.amount = r.amount;
      local.updatedAt = r.updated_at;
    } else {
      continue;
    }
    day.total = day.entries.reduce((s, e) => s + e.amount, 0);
    saveDay(day);
    touched.add(r.salli_date);
  }
  if (touched.size) {
    invalidateStreakCache();
    notifyChange();
  }
}

// ---- settings ----

async function pullProfileThenPushSettings() {
  const sb = supabase!;
  const { data } = await sb.from('profiles').select('display_name, daily_goal, share_count_with_group').maybeSingle();
  const local = getSettings();
  // Keep a name the account already has if this phone has none.
  if (data?.display_name && !local.name) updateSettings({ name: data.display_name }, { fromServer: true });
  await pushSettings(['name', 'dailyGoal', 'shareCountWithGroup']);
}

export async function pushSettings(fields: (keyof Settings)[]) {
  const sb = supabase;
  if (!sb || !getSession()) return;
  const s = getSettings();
  const patch: Record<string, unknown> = {};
  if (fields.includes('name')) patch.display_name = s.name.slice(0, 40);
  if (fields.includes('shareCountWithGroup')) patch.share_count_with_group = s.shareCountWithGroup;
  if (fields.includes('name') || fields.includes('shareCountWithGroup')) {
    patch.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';
    await sb.from('profiles').update(patch).eq('id', getSession()!.user.id);
  }
  if (fields.includes('dailyGoal')) {
    await sb.rpc('set_daily_goal', { p_goal: s.dailyGoal, p_today: salliDayKey() });
  }
}

// ---- reminder likes / saves ----

export async function pushReminderAction(id: string) {
  const sb = supabase;
  const session = getSession();
  if (!sb || !session) return;
  const a = getAction(id);
  await sb
    .from('reminder_actions')
    .upsert({ reminder_id: id, user_id: session.user.id, liked: a.liked, saved: a.saved }, { onConflict: 'reminder_id,user_id' });
}

async function pullReminderActions() {
  const sb = supabase!;
  const { data } = await sb.from('reminder_actions').select('reminder_id, liked, saved');
  if (!data?.length) return;
  const KEY = 'reminders.actions';
  const local = readJSON<Record<string, { liked: boolean; saved: boolean }>>(KEY, {});
  for (const r of data) {
    const l = local[r.reminder_id];
    local[r.reminder_id] = { liked: (l?.liked ?? false) || r.liked, saved: (l?.saved ?? false) || r.saved };
  }
  writeJSON(KEY, local);
}

// ---- live updates ----

function subscribeLive(userId: string) {
  const sb = supabase!;
  channel?.unsubscribe();
  channel = sb
    .channel(`entries:${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'entries', filter: `user_id=eq.${userId}` }, (payload) => {
      const row = payload.new as ServerEntry | undefined;
      if (row?.client_id) mergeServerEntries([row]);
    })
    .subscribe();
}

const debounces = new Map<string, ReturnType<typeof setTimeout>>();
function debounce(key: string, fn: () => void, ms: number) {
  const t = debounces.get(key);
  if (t) clearTimeout(t);
  debounces.set(
    key,
    setTimeout(() => {
      debounces.delete(key);
      fn();
    }, ms),
  );
}

// ---- start ----

let started = false;
export function startSync() {
  if (started || !supabase) return;
  started = true;
  setQueueListener(() => requestSync());
  addSettingsChangeListener((fields) => {
    const synced = fields.filter((f) => f === 'name' || f === 'dailyGoal' || f === 'shareCountWithGroup');
    // Names are typed a letter at a time: wait for a pause before uploading.
    if (synced.length) debounce(`settings:${synced.join()}`, () => void pushSettings(synced), synced.includes('name') ? 1200 : 0);
  });
  setActionChangeListener((id) => debounce(`action:${id}`, () => void pushReminderAction(id), 600));
  const onSession = () => {
    const s = getSession();
    if (s) {
      subscribeLive(s.user.id);
      requestSync(100);
    } else {
      channel?.unsubscribe();
      channel = null;
      setStatus({ state: 'idle' });
    }
  };
  onSessionChange(onSession);
  onSession();
  AppState.addEventListener('change', (state) => {
    if (state === 'active') requestSync(300);
  });
  // Retry anything still waiting (e.g. after being offline).
  setInterval(() => {
    if (Object.keys(pendingEntries()).length) requestSync(0);
  }, 30000);
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(subscribeSyncStatus, getSyncStatus, getSyncStatus);
}

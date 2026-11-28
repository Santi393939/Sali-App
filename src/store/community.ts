/**
 * Community requests: ask for salawat for a need, and add to others'.
 *
 * - The feed (open requests, recently completed ones and your own) is
 *   public to read; contributing and asking need an account.
 * - Contributing counts as your own salawat too (lights your lantern, grows
 *   your streak): it is saved on the phone at once and sent to the request
 *   in small batches, so a run of taps is one network call.
 * - New requests wait for an admin's approval; three reports hide one.
 * - When a request you gave to reaches its goal, you get a gentle note.
 */
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { t } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { showToast } from '@/lib/toast';

import { getSession, onSessionChange } from './auth';
import { addSalawat, type AddResult } from './counts';
import type { EntrySource } from './days';
import { readJSON, writeJSON } from './storage';

export type CommunityRequest = {
  id: string;
  title: string;
  note: string;
  goal: number;
  total: number;
  contributors: number;
  author: string | null;
  status: 'pending' | 'approved' | 'declined' | 'hidden' | 'completed';
  endsAt: string;
  createdAt: string;
  completedAt: string | null;
  mine: boolean;
  myTotal: number;
};
export type QueueItem = { id: string; title: string; note: string; goal: number; status: string; author: string | null; reports: number; createdAt: string };

type State = { loading: boolean; loaded: boolean; error: string | null; feed: CommunityRequest[]; isAdmin: boolean; queue: QueueItem[] };
let state: State = { loading: false, loaded: false, error: null, feed: [], isAdmin: false, queue: [] };
const listeners = new Set<() => void>();
const set = (patch: Partial<State>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

export function useCommunity(): State {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
}

const sb = () => {
  if (!supabase) throw new Error(t('Accounts aren’t connected yet'));
  return supabase;
};
const signedIn = () => !!getSession();

function friendly(message: string) {
  if (/links, emails and phone/i.test(message)) return t('Please leave out links, emails and phone numbers.');
  if (/2 open requests/i.test(message)) return t('You already have 2 open requests. Wait for one to finish first.');
  if (/not open/i.test(message)) return t('This request has closed.');
  if (/network|fetch/i.test(message)) return t('No connection. Try again in a moment.');
  return message;
}

const fromRow = (r: Record<string, unknown>): CommunityRequest => ({
  id: r.id as string,
  title: r.title as string,
  note: (r.note as string) ?? '',
  goal: Number(r.goal),
  total: Number(r.total ?? 0),
  contributors: Number(r.contributors ?? 0),
  author: (r.author as string | null) ?? null,
  status: r.status as CommunityRequest['status'],
  endsAt: r.ends_at as string,
  createdAt: r.created_at as string,
  completedAt: (r.completed_at as string | null) ?? null,
  mine: !!r.mine,
  myTotal: Number(r.my_total ?? 0),
});

// ---------- loading ----------

export async function loadFeed() {
  if (!supabase) return;
  set({ loading: true, error: null });
  try {
    const { data, error } = await sb().rpc('community_feed', { p_limit: 60 });
    if (error) throw error;
    const feed = ((data ?? []) as Record<string, unknown>[]).map(fromRow).map(withPending);
    set({ feed, loading: false, loaded: true });
    subscribe();
  } catch (e) {
    set({ loading: false, loaded: true, error: friendly(e instanceof Error ? e.message : String(e)) });
  }
  if (signedIn()) void loadAdmin();
}

async function loadAdmin() {
  const me = getSession()?.user.id;
  if (!me) return set({ isAdmin: false, queue: [] });
  const { data } = await sb().from('app_admins').select('user_id').eq('user_id', me);
  const isAdmin = !!data?.length;
  if (!isAdmin) return set({ isAdmin: false, queue: [] });
  const { data: q } = await sb().rpc('review_queue');
  set({
    isAdmin: true,
    queue: ((q ?? []) as Record<string, unknown>[]).map((r) => ({
      id: r.id as string,
      title: r.title as string,
      note: (r.note as string) ?? '',
      goal: Number(r.goal),
      status: r.status as string,
      author: (r.author as string | null) ?? null,
      reports: Number(r.reports ?? 0),
      createdAt: r.created_at as string,
    })),
  });
}

// ---------- asking ----------

export async function createRequest(input: { title: string; note: string; goal: number; days: number; showName: boolean }) {
  const ends = new Date(Date.now() + input.days * 24 * 3600 * 1000).toISOString();
  const { error } = await sb()
    .from('requests')
    .insert({ title: input.title.trim(), note: input.note.trim(), goal: input.goal, anonymous: !input.showName, ends_at: ends });
  if (error) throw new Error(friendly(error.message));
  await loadFeed();
}

export async function withdrawRequest(id: string) {
  const { error } = await sb().from('requests').delete().eq('id', id);
  if (error) throw new Error(friendly(error.message));
  set({ feed: state.feed.filter((r) => r.id !== id) });
}

// ---------- contributing ----------

/** Amounts counted on the phone, not yet sent to each request. */
const pending = new Map<string, number>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function withPending(r: CommunityRequest): CommunityRequest {
  const p = pending.get(r.id) ?? 0;
  return p ? { ...r, total: r.total + p, myTotal: r.myTotal + p } : r;
}

/**
 * Count salawat for a request: saved as your own at once (so the lantern and
 * streak follow), shown on the request at once, sent in a moment.
 */
export function contribute(id: string, amount: number, source: EntrySource = 'community'): AddResult {
  const result = addSalawat(amount, source);
  pending.set(id, (pending.get(id) ?? 0) + amount);
  set({
    feed: state.feed.map((r) =>
      r.id === id ? { ...r, total: r.total + amount, myTotal: r.myTotal + amount, contributors: r.myTotal === 0 ? r.contributors + 1 : r.contributors } : r,
    ),
  });
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => void flush(), 1500);
  return result;
}

export async function flush() {
  flushTimer = null;
  if (!supabase || !signedIn()) return;
  for (const [id, amount] of [...pending.entries()]) {
    pending.delete(id);
    let left = amount;
    while (left > 0) {
      const part = Math.min(left, 10000);
      const { data, error } = await sb().rpc('contribute', { p_request: id, p_amount: part });
      if (error) {
        // Your own count is kept either way; only the request missed it.
        if (/not open/i.test(error.message)) showToast({ tone: 'quest', title: t('This request has closed.'), sub: t('Your salawat still count for your day.') });
        else pending.set(id, (pending.get(id) ?? 0) + left);
        break;
      }
      left -= part;
      if (data) {
        const fresh = fromRow({ ...(data as Record<string, unknown>), mine: false, my_total: 0 });
        set({
          feed: state.feed.map((r) =>
            r.id === id ? withPending({ ...r, total: fresh.total, contributors: fresh.contributors, status: fresh.status, completedAt: fresh.completedAt }) : r,
          ),
        });
        if (fresh.status === 'completed' && fresh.completedAt && Date.now() - new Date(fresh.completedAt).getTime() < 60000) celebrate(fresh.title, fresh.goal);
      }
    }
  }
}

// ---------- reports and moderation ----------

export async function reportRequest(id: string, reason = '') {
  const { error } = await sb().rpc('report_request', { p_request: id, p_reason: reason });
  if (error) throw new Error(friendly(error.message));
  set({ feed: state.feed.filter((r) => r.id !== id) });
}

export async function moderate(id: string, approve: boolean) {
  set({ queue: state.queue.filter((q) => q.id !== id) });
  const { error } = await sb().rpc('moderate_request', { p_request: id, p_approve: approve });
  if (error) {
    showToast({ tone: 'quest', title: friendly(error.message) });
    void loadAdmin();
    return;
  }
  void loadFeed();
}

// ---------- "goal reached" for requests you gave to ----------

const SEEN = 'community.completedSeen';
const celebrated = new Set<string>();

function celebrate(title: string, goal: number) {
  if (celebrated.has(title)) return;
  celebrated.add(title);
  showToast({
    tone: 'big',
    title: `${t('Goal reached for “{title}”', { title })} ما شاء الله`,
    sub: t('Your salawat helped reach {n}', { n: goal.toLocaleString('en-US') }),
  });
}

let checking = false;
async function checkCompleted() {
  if (!supabase || !signedIn() || checking) return;
  checking = true;
  try {
    await checkCompletedNow();
  } finally {
    checking = false;
  }
}

async function checkCompletedNow() {
  const since = readJSON<string>(SEEN, new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString());
  const { data } = await sb().rpc('my_completed_since', { p_since: since });
  writeJSON(SEEN, new Date().toISOString());
  for (const r of (data ?? []) as { title: string; goal: number }[]) celebrate(r.title, r.goal);
}

// ---------- realtime ----------

let channel: RealtimeChannel | null = null;
function subscribe() {
  if (!supabase || channel) return;
  channel = supabase
    .channel('community')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'requests' }, (p) => {
      const row = p.new as Record<string, unknown>;
      if (!row?.id) return;
      set({
        feed: state.feed.map((r) =>
          r.id === row.id
            ? withPending({ ...r, total: Number(row.total ?? r.total), contributors: Number(row.contributors ?? r.contributors), status: (row.status as CommunityRequest['status']) ?? r.status })
            : r,
        ),
      });
    })
    .subscribe();
}

// ---------- start ----------

let started = false;
export function startCommunity() {
  if (started || !supabase) return;
  started = true;
  onSessionChange(() => {
    void loadFeed();
    void checkCompleted();
  });
  AppState.addEventListener('change', (s) => {
    if (s === 'active') {
      void checkCompleted();
      if (state.loaded) void loadFeed();
    } else void flush();
  });
}

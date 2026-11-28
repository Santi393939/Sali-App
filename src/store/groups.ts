/**
 * Live groups (when signed in): your groups, each group's leaderboard and
 * week total, the activity feed with reactions, nudges, and creating,
 * joining and leaving. Everything goes through Supabase's row-level security
 * and the group functions in supabase/migrations, so members only ever see
 * what the privacy rules allow (a count only if its owner shares it).
 *
 * Data is kept in memory and refreshed on open, on changes (realtime), and
 * when the app comes back to the foreground.
 */
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { milestoneByAmount } from '@/content/milestones';
import { t } from '@/lib/i18n';
import { addDays, salliDayKey } from '@/lib/salliDay';
import { supabase } from '@/lib/supabase';
import { showToast } from '@/lib/toast';

import { getSession, onSessionChange } from './auth';
import { getToday, onGoalLit, onMilestone } from './counts';
import { weekEnd } from './growth';
import { readJSON, writeJSON } from './storage';

export type LiveGroup = { id: string; name: string; inviteCode: string; weeklyGoal: number; role: 'owner' | 'member' };
export type BoardRow = {
  userId: string;
  name: string;
  role: 'owner' | 'member';
  streak: number;
  litDays: number;
  litToday: boolean;
  /** This week's count, or null when the member keeps it private. */
  weekTotal: number | null;
};
export type Reaction = 'ameen' | 'mashallah';
export type LiveEvent = {
  id: string;
  userId: string;
  kind: 'lit' | 'milestone' | 'joined' | 'goal_passed' | 'streak' | 'logged';
  value: number | null;
  createdAt: string;
  reactions: Record<Reaction, number>;
  mine: Reaction[];
};
export type GroupDetail = { board: BoardRow[]; weekTotal: number; events: LiveEvent[]; nudgedToday: string[] };

type State = {
  loading: boolean;
  error: string | null;
  groups: LiveGroup[];
  details: Record<string, GroupDetail | undefined>;
};

let state: State = { loading: false, error: null, groups: [], details: {} };
const listeners = new Set<() => void>();
const set = (patch: Partial<State>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

export function useGroups(): State {
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
const me = () => getSession()?.user.id ?? null;

/** Saturday and today of the current Jumu'ah week, as Salli dates. */
export function weekRange() {
  const today = salliDayKey();
  return { start: addDays(weekEnd(today), -6), today };
}

function friendly(message: string) {
  if (/invite code not found/i.test(message)) return t('That code didn’t match a group. Check the letters and try again.');
  if (/already nudged/i.test(message)) return t('Already nudged today');
  if (/network|fetch/i.test(message)) return t('No connection. Try again in a moment.');
  return message;
}

// ---------- loading ----------

export async function loadGroups() {
  if (!supabase || !me()) return;
  set({ loading: true, error: null });
  try {
    const { data, error } = await sb()
      .from('group_members')
      .select('role, groups ( id, name, invite_code, weekly_goal )')
      .eq('user_id', me()!);
    if (error) throw error;
    const groups: LiveGroup[] = (data ?? [])
      .map((r) => {
        const g = (Array.isArray(r.groups) ? r.groups[0] : r.groups) as { id: string; name: string; invite_code: string; weekly_goal: number } | null;
        return g ? { id: g.id, name: g.name, inviteCode: g.invite_code, weeklyGoal: g.weekly_goal, role: r.role as LiveGroup['role'] } : null;
      })
      .filter((g): g is LiveGroup => !!g)
      .sort((a, b) => a.name.localeCompare(b.name));
    set({ groups, loading: false });
    subscribe(groups.map((g) => g.id));
  } catch (e) {
    set({ loading: false, error: friendly(e instanceof Error ? e.message : String(e)) });
  }
}

export async function loadGroup(groupId: string) {
  if (!supabase || !me()) return;
  const { start, today } = weekRange();
  try {
    const [board, total, events, nudges] = await Promise.all([
      sb().rpc('group_board', { p_group: groupId, p_week_start: start, p_today: today }),
      sb().rpc('group_week_total', { p_group: groupId, p_week_start: start, p_today: today }),
      sb()
        .from('group_events')
        .select('id, user_id, kind, value, created_at, reactions ( kind, user_id )')
        .eq('group_id', groupId)
        .neq('kind', 'nudge')
        .order('created_at', { ascending: false })
        .limit(30),
      sb()
        .from('group_events')
        .select('target_user')
        .eq('group_id', groupId)
        .eq('kind', 'nudge')
        .eq('user_id', me()!)
        .gte('created_at', new Date(Date.now() - 20 * 3600 * 1000).toISOString()),
    ]);
    if (board.error) throw board.error;
    const rows: BoardRow[] = (board.data ?? []).map((r: Record<string, unknown>) => ({
      userId: r.user_id as string,
      name: (r.display_name as string) || t('Member'),
      role: r.role as BoardRow['role'],
      streak: Number(r.streak ?? 0),
      litDays: Number(r.lit_days ?? 0),
      litToday: !!r.lit_today,
      weekTotal: r.week_total === null || r.week_total === undefined ? null : Number(r.week_total),
    }));
    const evs: LiveEvent[] = (events.data ?? []).map((e) => {
      const rs = (e.reactions ?? []) as { kind: Reaction; user_id: string }[];
      return {
        id: e.id,
        userId: e.user_id,
        kind: e.kind,
        value: e.value,
        createdAt: e.created_at,
        reactions: { ameen: rs.filter((r) => r.kind === 'ameen').length, mashallah: rs.filter((r) => r.kind === 'mashallah').length },
        mine: rs.filter((r) => r.user_id === me()).map((r) => r.kind),
      };
    });
    const detail: GroupDetail = {
      board: rows,
      weekTotal: Number(total.data ?? 0),
      events: evs,
      nudgedToday: (nudges.data ?? []).map((n) => n.target_user as string),
    };
    set({ details: { ...state.details, [groupId]: detail } });
  } catch (e) {
    set({ error: friendly(e instanceof Error ? e.message : String(e)) });
  }
}

// ---------- actions ----------

export async function createGroup(name: string): Promise<LiveGroup> {
  const { data, error } = await sb().rpc('create_group', { p_name: name.trim().slice(0, 60) });
  if (error) throw new Error(friendly(error.message));
  await loadGroups();
  return state.groups.find((g) => g.id === data.id) ?? { id: data.id, name: data.name, inviteCode: data.invite_code, weeklyGoal: data.weekly_goal, role: 'owner' };
}

export async function joinGroup(code: string): Promise<LiveGroup> {
  const { data, error } = await sb().rpc('join_group', { p_code: code.replace(/\s/g, '') });
  if (error) throw new Error(friendly(error.message));
  await loadGroups();
  return state.groups.find((g) => g.id === data.id) ?? { id: data.id, name: data.name, inviteCode: data.invite_code, weeklyGoal: data.weekly_goal, role: 'member' };
}

export async function leaveGroup(groupId: string) {
  const { error } = await sb().rpc('leave_group', { p_group: groupId });
  if (error) throw new Error(friendly(error.message));
  const details = { ...state.details };
  delete details[groupId];
  set({ details });
  await loadGroups();
}

export async function setWeeklyGoal(groupId: string, goal: number) {
  const { error } = await sb().from('groups').update({ weekly_goal: goal }).eq('id', groupId);
  if (error) throw new Error(friendly(error.message));
  set({ groups: state.groups.map((g) => (g.id === groupId ? { ...g, weeklyGoal: goal } : g)) });
}

export async function toggleReaction(groupId: string, eventId: string, kind: Reaction) {
  const detail = state.details[groupId];
  const ev = detail?.events.find((e) => e.id === eventId);
  if (!detail || !ev) return;
  const on = ev.mine.includes(kind);
  // Show it at once, then save.
  const next = {
    ...ev,
    mine: on ? ev.mine.filter((k) => k !== kind) : [...ev.mine, kind],
    reactions: { ...ev.reactions, [kind]: ev.reactions[kind] + (on ? -1 : 1) },
  };
  set({ details: { ...state.details, [groupId]: { ...detail, events: detail.events.map((e) => (e.id === eventId ? next : e)) } } });
  const q = on
    ? sb().from('reactions').delete().eq('event_id', eventId).eq('user_id', me()!).eq('kind', kind)
    : sb().from('reactions').insert({ event_id: eventId, kind });
  const { error } = await q;
  if (error) void loadGroup(groupId);
}

export async function nudge(groupId: string, userId: string) {
  const detail = state.details[groupId];
  if (detail) set({ details: { ...state.details, [groupId]: { ...detail, nudgedToday: [...detail.nudgedToday, userId] } } });
  const { error } = await sb().from('group_events').insert({ group_id: groupId, kind: 'nudge', target_user: userId });
  if (error && !/already nudged/i.test(error.message)) {
    if (detail) set({ details: { ...state.details, [groupId]: detail } });
    throw new Error(friendly(error.message));
  }
}

/** Share a moment with every group you're in (lantern lit, milestone). */
async function postToGroups(kind: 'lit' | 'milestone', value: number) {
  if (!supabase || !me()) return;
  if (!state.groups.length) await loadGroups();
  if (!state.groups.length) return;
  await sb()
    .from('group_events')
    .insert(state.groups.map((g) => ({ group_id: g.id, kind, value })));
  state.groups.forEach((g) => void loadGroup(g.id));
}

// ---------- nudges for you ----------

const NUDGE_SEEN = 'groups.nudgesSeen';

/** Show any nudges that arrived since you last looked (one toast per person). */
async function checkNudges() {
  if (!supabase || !me()) return;
  const since = readJSON<string>(NUDGE_SEEN, new Date(Date.now() - 24 * 3600 * 1000).toISOString());
  const { data } = await sb()
    .from('group_events')
    .select('user_id, created_at, group_id')
    .eq('kind', 'nudge')
    .eq('target_user', me()!)
    .gt('created_at', since)
    .order('created_at', { ascending: true });
  if (!data?.length) return;
  writeJSON(NUDGE_SEEN, data[data.length - 1].created_at);
  if (getToday().lit) return; // already lit: no need to remind
  const ids = [...new Set(data.map((n) => n.user_id))];
  const { data: people } = await sb().from('profiles').select('id, display_name').in('id', ids);
  const names = ids.map((id) => people?.find((p) => p.id === id)?.display_name || t('Someone in your group'));
  showToast({
    tone: 'quest',
    title: names.length === 1 ? t('{name} nudged you', { name: names[0] }) : t('{n} people nudged you', { n: names.length }),
    sub: t('A gentle reminder to light your lantern today'),
  });
}

// ---------- realtime ----------

let channel: RealtimeChannel | null = null;
let subscribedTo = '';

function subscribe(groupIds: string[]) {
  const key = groupIds.join(',');
  if (!supabase || key === subscribedTo) return;
  subscribedTo = key;
  channel?.unsubscribe();
  channel = null;
  if (!groupIds.length) return;
  const refresh = (gid?: string) => {
    if (gid && groupIds.includes(gid)) void loadGroup(gid);
  };
  let c = supabase.channel(`groups:${me()}`);
  for (const gid of groupIds) {
    c = c
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_events', filter: `group_id=eq.${gid}` }, (p) => {
        const row = p.new as { kind?: string; target_user?: string };
        if (row.kind === 'nudge' && row.target_user === me()) void checkNudges();
        else refresh(gid);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members', filter: `group_id=eq.${gid}` }, () => refresh(gid));
  }
  channel = c.on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, () => groupIds.forEach((g) => refresh(g))).subscribe();
}

// ---------- start ----------

let started = false;
export function startGroups() {
  if (started || !supabase) return;
  started = true;
  const onSession = () => {
    if (me()) {
      void loadGroups();
      void checkNudges();
    } else {
      channel?.unsubscribe();
      channel = null;
      subscribedTo = '';
      set({ groups: [], details: {}, error: null });
    }
  };
  onSessionChange(onSession);
  onSession();
  AppState.addEventListener('change', (s) => {
    if (s === 'active' && me()) {
      void checkNudges();
      state.groups.forEach((g) => void loadGroup(g.id));
    }
  });
  onGoalLit(() => void postToGroups('lit', getToday().streak.current));
  onMilestone((m) => void postToGroups('milestone', m.amount));
}

/** Text for an activity item. */
export function eventText(e: LiveEvent): string {
  if (e.kind === 'lit') return e.value && e.value > 1 ? t('lit their lantern · {n}-day streak', { n: e.value }) : t('lit their lantern');
  if (e.kind === 'milestone') {
    const m = e.value ? milestoneByAmount(e.value) : undefined;
    return m ? t('built {name} · {n} salawat', { name: m.name, n: m.amount.toLocaleString('en-US') }) : t('reached a milestone');
  }
  if (e.kind === 'joined') return t('joined the group');
  if (e.kind === 'goal_passed') return t('passed the weekly goal');
  if (e.kind === 'streak') return t('reached a {n}-day streak', { n: e.value ?? 0 });
  return t('logged salawat');
}

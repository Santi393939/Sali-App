/** Likes and saves on reminder cards, saved on the phone (synced later as reminder_actions). */
import { useSyncExternalStore } from 'react';

import { readJSON, writeJSON } from './storage';

export type ReminderAction = { liked: boolean; saved: boolean };
type ActionMap = Record<string, ReminderAction>;

const KEY = 'reminders.actions';
const listeners = new Set<() => void>();
let actions: ActionMap = readJSON<ActionMap>(KEY, {});

const EMPTY: ReminderAction = { liked: false, saved: false };

export function resetActions() {
  actions = {};
  listeners.forEach((l) => l());
}

export function getAction(id: string): ReminderAction {
  return actions[id] ?? EMPTY;
}

let changeListener: ((id: string) => void) | null = null;
/** The sync engine registers here to upload likes and saves. */
export function setActionChangeListener(fn: ((id: string) => void) | null) {
  changeListener = fn;
}

export function toggleAction(id: string, field: keyof ReminderAction): boolean {
  const next = { ...getAction(id), [field]: !getAction(id)[field] };
  actions = { ...actions, [id]: next };
  writeJSON(KEY, actions);
  listeners.forEach((l) => l());
  changeListener?.(id);
  return next[field];
}

export function useReminderActions(): ActionMap {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => actions,
    () => actions,
  );
}

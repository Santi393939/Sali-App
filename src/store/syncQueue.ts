/**
 * Entries waiting to be uploaded: clientId → Salli day. Kept on the phone so
 * nothing is lost if the app closes or the phone is offline.
 */
import { readJSON, writeJSON } from './storage';

const KEY = 'sync.pending';
let pending: Record<string, string> = readJSON(KEY, {});
let onQueued: (() => void) | null = null;

export function resetQueue() {
  pending = {};
}

export function queueEntry(clientId: string, date: string) {
  pending = { ...pending, [clientId]: date };
  writeJSON(KEY, pending);
  onQueued?.();
}

export function pendingEntries(): Record<string, string> {
  return pending;
}

export function clearQueued(ids: string[]) {
  const next = { ...pending };
  for (const id of ids) delete next[id];
  pending = next;
  writeJSON(KEY, pending);
}

/** The sync engine registers here to hear about new work. */
export function setQueueListener(fn: (() => void) | null) {
  onQueued = fn;
}

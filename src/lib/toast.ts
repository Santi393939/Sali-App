/** Small celebratory notices that slide down from the top (quests, rounds, repairs). */
export type Toast = { id: number; title: string; sub?: string; tone: 'quest' | 'big' };

let queue: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function showToast(t: Omit<Toast, 'id'>) {
  queue = [...queue.slice(-2), { ...t, id: nextId++ }];
  emit();
}
export function dismissToast(id: number) {
  queue = queue.filter((t) => t.id !== id);
  emit();
}
export const getToasts = () => queue;
export function subscribeToasts(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

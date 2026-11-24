/**
 * Smooth theme changes. The app rebuilds its screens in the new colours, so
 * the change happens under a "veil": the screen washes to the new theme's
 * background (with the badge in the middle), the theme is applied, and the
 * veil fades away to reveal the new look. About half a second in all.
 */
import type { Milestone, ThemeId } from '@/content/milestones';
import { getRewards } from '@/store/rewards';

export type VeilState = { visible: boolean; color: string; badge: Milestone | null; id: number };

let state: VeilState = { visible: false, color: '#F3EADB', badge: null, id: 0 };
const listeners = new Set<() => void>();
const set = (next: Partial<VeilState>) => {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
};

export const getVeil = () => state;
export function subscribeVeil(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** How long the wash takes to cover the screen, then to clear. */
export const VEIL_IN_MS = 170;
export const VEIL_OUT_MS = 320;

let busy = false;

/**
 * Apply a change that may switch the theme. `toTheme` is the theme it leads
 * to; if that is already the theme in use, the change is applied at once.
 */
export function switchTheme(apply: () => void, toTheme: ThemeId, background: string, badge: Milestone | null = null) {
  if (getRewards().theme === toTheme || busy) {
    apply();
    return;
  }
  busy = true;
  set({ visible: true, color: background, badge, id: state.id + 1 });
  setTimeout(() => {
    apply(); // the app rebuilds in the new colours under the veil
    setTimeout(() => {
      set({ visible: false });
      busy = false;
    }, 120);
  }, VEIL_IN_MS);
}

/** Which rewards are unlocked and in use (a choice only applies once earned). */
import { GLASSES, lampsFor } from '@/content/extras';
import { milestoneByAmount, type Milestone } from '@/content/milestones';
import { FEATURED_BADGE_UNLOCK, SOUNDS, THEMES, type SoundId, type ThemeId } from '@/content/rewards';

import { useSyncExternalStore } from 'react';

import { getToday, subscribeCounts, useToday } from './counts';
import { getSettings, subscribeSettings, updateSettings, useSettings, type Settings } from './settings';

export type ActiveRewards = {
  theme: ThemeId;
  sound: SoundId;
  featured: Milestone | null;
  glass: string;
};

export function activeRewards(s: Settings, lifetime: number): ActiveRewards {
  const featured = milestoneByAmount(s.featuredBadge);
  return {
    theme: lifetime >= THEMES[s.theme].unlock ? s.theme : 'zellige',
    sound: lifetime >= SOUNDS[s.tapSound].unlock ? s.tapSound : 'tick',
    featured: featured && lifetime >= FEATURED_BADGE_UNLOCK && lifetime >= featured.amount ? featured : null,
    glass: (() => {
      const g = GLASSES.find((x) => x.id === s.lanternGlass) ?? GLASSES[0];
      return lampsFor(lifetime) >= g.lamp ? g.color : GLASSES[0].color;
    })(),
  };
}

export function useRewards(): ActiveRewards {
  const { lifetime } = useToday();
  return activeRewards(useSettings(), lifetime);
}

export const getRewards = () => activeRewards(getSettings(), getToday().lifetime);

const getThemeId = () => getRewards().theme;
/** Just the theme in use; re-renders only when it changes (not on every count). */
export function useActiveThemeId(): ThemeId {
  return useSyncExternalStore(
    (l) => {
      const a = subscribeCounts(l);
      const b = subscribeSettings(l);
      return () => {
        a();
        b();
      };
    },
    getThemeId,
    getThemeId,
  );
}

/** Wear everything a milestone gives: its theme, tap sound and badge. */
export function applyMilestoneRewards(m: Milestone) {
  updateSettings({ theme: m.theme, tapSound: m.sound, featuredBadge: m.amount });
}

/** Back to the default look. */
export function resetRewards() {
  updateSettings({ theme: 'zellige', tapSound: 'tick', featuredBadge: null });
}

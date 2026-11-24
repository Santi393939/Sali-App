/** Which rewards are unlocked and in use (a choice only applies once earned). */
import { milestoneByAmount, type Milestone } from '@/content/milestones';
import { FEATURED_BADGE_UNLOCK, SOUNDS, THEMES, type SoundId, type ThemeId } from '@/content/rewards';

import { getToday, useToday } from './counts';
import { getSettings, updateSettings, useSettings, type Settings } from './settings';

export type ActiveRewards = {
  theme: ThemeId;
  sound: SoundId;
  featured: Milestone | null;
};

export function activeRewards(s: Settings, lifetime: number): ActiveRewards {
  const featured = milestoneByAmount(s.featuredBadge);
  return {
    theme: lifetime >= THEMES[s.theme].unlock ? s.theme : 'zellige',
    sound: lifetime >= SOUNDS[s.tapSound].unlock ? s.tapSound : 'tick',
    featured: featured && lifetime >= FEATURED_BADGE_UNLOCK && lifetime >= featured.amount ? featured : null,
  };
}

export function useRewards(): ActiveRewards {
  const { lifetime } = useToday();
  return activeRewards(useSettings(), lifetime);
}

export const getRewards = () => activeRewards(getSettings(), getToday().lifetime);

/** Wear everything a milestone gives: its theme, tap sound and badge. */
export function applyMilestoneRewards(m: Milestone) {
  updateSettings({ theme: m.theme, tapSound: m.sound, featuredBadge: m.amount });
}

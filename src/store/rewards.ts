/** Which rewards are unlocked and in use (a choice only applies once earned). */
import {
  ARCH_THEMES,
  BAND_THEMES,
  FEATURED_BADGE_UNLOCK,
  TAP_SOUNDS,
  type ArchTheme,
  type BandTheme,
  type TapSound,
} from '@/content/rewards';

import { getToday, useToday } from './counts';
import { getSettings, useSettings, type Settings } from './settings';

export type ActiveRewards = {
  arch: ArchTheme;
  band: BandTheme;
  sound: TapSound;
  featuredBadge: number | null;
};

export function activeRewards(s: Settings, lifetime: number): ActiveRewards {
  return {
    arch: lifetime >= ARCH_THEMES[s.archTheme].unlock ? s.archTheme : 'zellige',
    band: lifetime >= BAND_THEMES[s.bandTheme].unlock ? s.bandTheme : 'cobalt',
    sound: lifetime >= TAP_SOUNDS[s.tapSound].unlock ? s.tapSound : 'tick',
    featuredBadge:
      s.featuredBadge != null && lifetime >= FEATURED_BADGE_UNLOCK && lifetime >= s.featuredBadge ? s.featuredBadge : null,
  };
}

export function useRewards(): ActiveRewards {
  const { lifetime } = useToday();
  return activeRewards(useSettings(), lifetime);
}

export const getRewards = () => activeRewards(getSettings(), getToday().lifetime);

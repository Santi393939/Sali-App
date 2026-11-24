/**
 * Rewards unlocked by lifetime milestones: a theme (arch, star and tile
 * colours across the app), a tap sound and a title for each one.
 */
import type { SoundId, ThemeId } from './milestones';

export type { SoundId, ThemeId } from './milestones';

export type Theme = {
  name: string;
  /** Lifetime total that unlocks it (0 = always). */
  unlock: number;
  arch: string;
  star: string;
  band: { star: string; centre: string; diamond: string };
};

export const THEMES: Record<ThemeId, Theme> = {
  zellige: { name: 'Zellige', unlock: 0, arch: '#1E5C46', star: '#174836', band: { star: '#1D3E8A', centre: '#C98E2B', diamond: '#1E5C46' } },
  cedar: { name: 'Cedar', unlock: 1000, arch: '#7A4A2A', star: '#5E3820', band: { star: '#8C4A2F', centre: '#E9B860', diamond: '#1E5C46' } },
  fes: { name: 'Fes blue', unlock: 10000, arch: '#1D3E8A', star: '#152E66', band: { star: '#1E5C46', centre: '#E9B860', diamond: '#1D3E8A' } },
  turquoise: { name: 'Turquoise', unlock: 50000, arch: '#1F7A7A', star: '#165E5E', band: { star: '#2A9D9D', centre: '#FBF6EC', diamond: '#1D3E8A' } },
  gilded: { name: 'Marrakech', unlock: 100000, arch: '#A8382E', star: '#842A22', band: { star: '#1E6B6B', centre: '#F0C46A', diamond: '#A8382E' } },
  midnight: { name: 'Midnight', unlock: 250000, arch: '#1A2240', star: '#10162B', band: { star: '#2C3A73', centre: '#E9B860', diamond: '#C98E2B' } },
  garden: { name: 'Bougainvillea', unlock: 1000000, arch: '#A8326E', star: '#82245A', band: { star: '#2E8A63', centre: '#F6CF6B', diamond: '#A8326E' } },
};

export const SOUNDS: Record<SoundId, { name: string; unlock: number }> = {
  tick: { name: 'Soft tick', unlock: 0 },
  knock: { name: 'Cedar knock', unlock: 1000 },
  clink: { name: 'Tile clink', unlock: 10000 },
  drop: { name: 'Water drop', unlock: 50000 },
  bell: { name: 'Small bell', unlock: 100000 },
  gong: { name: 'Soft gong', unlock: 250000 },
  birds: { name: 'Birdsong', unlock: 1000000 },
};

/** The featured badge unlocks with the first milestone. */
export const FEATURED_BADGE_UNLOCK = 1000;

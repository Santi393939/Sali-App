/**
 * Rewards unlocked by lifetime milestones. Each one changes how the app looks
 * or sounds, so every badge is something you can use.
 */
export type ArchTheme = 'zellige' | 'minaret' | 'dome' | 'riad';
export type BandTheme = 'cobalt' | 'courtyard';
export type TapSound = 'tick' | 'drop';

/** Counter arch colours: [arch, star inside the ring]. */
export const ARCH_THEMES: Record<ArchTheme, { name: string; arch: string; star: string; unlock: number }> = {
  zellige: { name: 'Zellige', arch: '#1E5C46', star: '#174836', unlock: 0 },
  minaret: { name: 'Midnight', arch: '#1D3E8A', star: '#152E66', unlock: 100000 },
  dome: { name: 'Terracotta', arch: '#8C4A2F', star: '#6C3822', unlock: 250000 },
  riad: { name: 'Riad', arch: '#2A7A6A', star: '#1E5C50', unlock: 1000000 },
};

/** Zellige band colours: stars, centres, diamonds. */
export const BAND_THEMES: Record<BandTheme, { name: string; star: string; centre: string; diamond: string; unlock: number }> = {
  cobalt: { name: 'Fes cobalt', star: '#1D3E8A', centre: '#C98E2B', diamond: '#1E5C46', unlock: 0 },
  courtyard: { name: 'Courtyard green & gold', star: '#1E5C46', centre: '#E9B860', diamond: '#C98E2B', unlock: 10000 },
};

export const TAP_SOUNDS: Record<TapSound, { name: string; unlock: number }> = {
  tick: { name: 'Soft tick', unlock: 0 },
  drop: { name: 'Fountain drop', unlock: 50000 },
};

/** The featured badge unlocks with the first milestone. */
export const FEATURED_BADGE_UNLOCK = 1000;

/** What each milestone unlocks (shown on the unlock reveal). */
export const REWARD_FOR_MILESTONE: Record<number, string> = {
  1000: 'Feature a badge on your profile',
  10000: 'Courtyard green & gold tiles',
  50000: 'Fountain drop tap sound',
  100000: 'Midnight minaret arch',
  250000: 'Terracotta dome arch',
  1000000: 'Riad garden arch',
};

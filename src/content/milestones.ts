/**
 * Lifetime milestones (from the brief: 1k, 10k, 50k, 100k, 250k, 1M).
 * Each is a part of a Moroccan masjid, with its own medallion shape and
 * materials, its own unlock moment, and a reward set: a theme, a tap sound
 * and a title.
 */
export type MilestoneIconName = 'door' | 'courtyard' | 'fountain' | 'minaret' | 'dome' | 'riad';
export type MedalShape = 'arch' | 'tile' | 'scallop' | 'star8' | 'star12' | 'rosette16';
export type UnlockEffect = 'doors' | 'tiles' | 'fountain' | 'beam' | 'rings' | 'petals';
export type SoundId = 'tick' | 'knock' | 'clink' | 'drop' | 'bell' | 'gong' | 'birds';

export type MedalPalette = {
  /** Main face of the medallion. */
  face: string;
  /** Rim / edge. */
  rim: string;
  /** Inner line and icon accent. */
  accent: string;
  /** Icon lines. */
  icon: string;
  /** Background of the unlock screen. */
  stage: string;
  /** Light / sparkle colour on the unlock screen. */
  glow: string;
};

export type Milestone = {
  amount: number;
  short: string;
  name: string;
  arabic: string;
  icon: MilestoneIconName;
  shape: MedalShape;
  palette: MedalPalette;
  effect: UnlockEffect;
  /** Title you earn, shown under your name when this badge is featured. */
  title: string;
  /** Theme and tap sound this milestone unlocks. */
  theme: ThemeId;
  sound: SoundId;
  /** Shown once earned. */
  earnedLine: string;
  /** Shown while working toward it. */
  goalLine: string;
};

export type ThemeId = 'zellige' | 'cedar' | 'fes' | 'turquoise' | 'gilded' | 'midnight' | 'garden';

export const MILESTONES: Milestone[] = [
  {
    amount: 1000,
    short: '1k',
    name: 'The Doorway',
    arabic: 'الباب',
    icon: 'door',
    shape: 'arch',
    palette: { face: '#7A4A2A', rim: '#C98E2B', accent: '#E9B860', icon: '#FBF6EC', stage: '#3B2414', glow: '#F2C779' },
    effect: 'doors',
    title: 'Opener of the Door',
    theme: 'cedar',
    sound: 'knock',
    earnedLine: 'Your first thousand. The cedar door swings open.',
    goalLine: 'Your first thousand salawat opens the door.',
  },
  {
    amount: 10000,
    short: '10k',
    name: 'The Courtyard',
    arabic: 'الصحن',
    icon: 'courtyard',
    shape: 'tile',
    palette: { face: '#1D3E8A', rim: '#E9B860', accent: '#8FB3F0', icon: '#FBF6EC', stage: '#0E1E45', glow: '#9CC0FF' },
    effect: 'tiles',
    title: 'Layer of the Zellige',
    theme: 'fes',
    sound: 'clink',
    earnedLine: 'Ten thousand. Zellige laid across the courtyard.',
    goalLine: 'Ten thousand lays the zellige of the courtyard.',
  },
  {
    amount: 50000,
    short: '50k',
    name: 'The Fountain',
    arabic: 'النافورة',
    icon: 'fountain',
    shape: 'scallop',
    palette: { face: '#1F7A7A', rim: '#BFE6E2', accent: '#7FD4CC', icon: '#FBF6EC', stage: '#0C3B3D', glow: '#A6F0E8' },
    effect: 'fountain',
    title: 'Keeper of the Fountain',
    theme: 'turquoise',
    sound: 'drop',
    earnedLine: 'Fifty thousand. The fountain runs clear.',
    goalLine: 'Fifty thousand sets the fountain running.',
  },
  {
    amount: 100000,
    short: '100k',
    name: 'The Minaret',
    arabic: 'الصومعة',
    icon: 'minaret',
    shape: 'star8',
    palette: { face: '#A8382E', rim: '#E9B860', accent: '#F0C46A', icon: '#FDF5F0', stage: '#3A1210', glow: '#FFD9A0' },
    effect: 'beam',
    title: 'Raiser of the Minaret',
    theme: 'gilded',
    sound: 'bell',
    earnedLine: 'One hundred thousand. The minaret stands tall.',
    goalLine: 'One hundred thousand raises the minaret.',
  },
  {
    amount: 250000,
    short: '250k',
    name: 'The Dome',
    arabic: 'القبة',
    icon: 'dome',
    shape: 'star12',
    palette: { face: '#1A2240', rim: '#E9B860', accent: '#C98E2B', icon: '#F5D58A', stage: '#080C1C', glow: '#F5D58A' },
    effect: 'rings',
    title: 'Builder of the Dome',
    theme: 'midnight',
    sound: 'gong',
    earnedLine: 'A quarter of a million. The dome is closed in gold.',
    goalLine: 'A quarter of a million closes the dome.',
  },
  {
    amount: 1000000,
    short: '1M',
    name: 'The Riad',
    arabic: 'الرياض',
    icon: 'riad',
    shape: 'rosette16',
    palette: { face: '#A8326E', rim: '#F6CF6B', accent: '#FF8FC4', icon: '#FFF7FA', stage: '#3A0F28', glow: '#FFC2DD' },
    effect: 'petals',
    title: 'Gardener of the Riad',
    theme: 'garden',
    sound: 'birds',
    earnedLine: 'One million salawat. Bougainvillea blooms over the riad. ما شاء الله',
    goalLine: 'One million brings the riad garden into bloom.',
  },
];

export const milestoneByAmount = (amount: number | null | undefined) => MILESTONES.find((m) => m.amount === amount);

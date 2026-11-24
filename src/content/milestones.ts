/**
 * Lifetime milestones (from the brief: 1k, 10k, 50k, 100k, 250k, 1M).
 * Each one is a part of a Moroccan masjid you build up over time.
 */
export type MilestoneIconName = 'door' | 'courtyard' | 'fountain' | 'minaret' | 'dome' | 'riad';

export type Milestone = {
  amount: number;
  short: string;
  name: string;
  arabic: string;
  icon: MilestoneIconName;
  /** Shown once earned. */
  earnedLine: string;
  /** Shown while working toward it. */
  goalLine: string;
};

export const MILESTONES: Milestone[] = [
  {
    amount: 1000,
    short: '1k',
    name: 'The Doorway',
    arabic: 'الباب',
    icon: 'door',
    earnedLine: 'Your first thousand. The door is open.',
    goalLine: 'Your first thousand salawat opens the door.',
  },
  {
    amount: 10000,
    short: '10k',
    name: 'The Courtyard',
    arabic: 'الصحن',
    icon: 'courtyard',
    earnedLine: 'Ten thousand. Zellige laid across the courtyard.',
    goalLine: 'Ten thousand lays the zellige of the courtyard.',
  },
  {
    amount: 50000,
    short: '50k',
    name: 'The Fountain',
    arabic: 'النافورة',
    icon: 'fountain',
    earnedLine: 'Fifty thousand. The fountain runs.',
    goalLine: 'Fifty thousand sets the fountain running.',
  },
  {
    amount: 100000,
    short: '100k',
    name: 'The Minaret',
    arabic: 'الصومعة',
    icon: 'minaret',
    earnedLine: 'One hundred thousand. The minaret stands tall.',
    goalLine: 'One hundred thousand raises the minaret.',
  },
  {
    amount: 250000,
    short: '250k',
    name: 'The Dome',
    arabic: 'القبة',
    icon: 'dome',
    earnedLine: 'A quarter of a million. The dome is closed.',
    goalLine: 'A quarter of a million closes the dome.',
  },
  {
    amount: 1000000,
    short: '1M',
    name: 'The Riad',
    arabic: 'الرياض',
    icon: 'riad',
    earnedLine: 'One million salawat. The garden is in bloom. ما شاء الله',
    goalLine: 'One million brings the riad garden into bloom.',
  },
];

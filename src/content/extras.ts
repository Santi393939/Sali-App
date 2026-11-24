import { localized } from '@/lib/i18n';

/** Small rewards between the big milestones, and the Friday (Jumu'ah) streak. */

/** A lamp is lit every 5,000 salawat. */
export const LAMP_STEP = 5000;

export type GlassId = 'amber' | 'rose' | 'turquoise' | 'emerald' | 'sapphire' | 'violet' | 'saffron' | 'pearl';

/** Lantern glass colours, unlocked one per lamp (amber is the start). */
export const GLASSES: { id: GlassId; name: string; color: string; lamp: number }[] = (
  [
  { id: 'amber', name: 'Amber', color: '#E9B860', lamp: 0 },
  { id: 'rose', name: 'Rose', color: '#F2A3B5', lamp: 1 },
  { id: 'turquoise', name: 'Turquoise', color: '#7FD4CC', lamp: 2 },
  { id: 'emerald', name: 'Emerald', color: '#6FCB93', lamp: 3 },
  { id: 'sapphire', name: 'Sapphire', color: '#8FB3F0', lamp: 4 },
  { id: 'violet', name: 'Violet', color: '#C3A6F0', lamp: 5 },
  { id: 'saffron', name: 'Saffron', color: '#F5A84A', lamp: 6 },
  { id: 'pearl', name: 'Pearl', color: '#F4EEE2', lamp: 7 },
  ] as { id: GlassId; name: string; color: string; lamp: number }[]
).map((g) => localized(g, ['name']));

export const lampsFor = (lifetime: number) => Math.floor(lifetime / LAMP_STEP);

/** Fridays in a row with the lantern lit that earn the Jumu'ah Keeper badge. */
export const FRIDAY_BADGE_RUN = 4;

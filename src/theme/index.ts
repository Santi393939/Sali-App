/**
 * Salli design tokens — the single source of truth for colour, type and shape.
 * Every screen and component reads from here, so a change happens in one place.
 */

import type { ThemeId } from '@/content/milestones';
import { getLanguage } from '@/lib/i18n';

/**
 * Colour roles. Every theme (one per milestone badge, plus the default
 * Zellige) fills in all of them, so "Wear it now" re-colours the whole app.
 * The role names come from the original Zellige palette:
 *   zelligeGreen = primary · deepGreen = primary, pressed · saffron = accent
 *   lightGold = light accent · cobalt = secondary · terracotta = tertiary
 */
export type Palette = {
  zelligeGreen: string; // primary buttons, hero arch, active tab
  deepGreen: string; // pressed states, star inside the ring
  saffron: string; // borders, progress, accents, tab indicator
  lightGold: string; // progress ring, highlights on primary
  cobalt: string; // secondary accent (tiles, bullets)
  terracotta: string; // secondary numbers, Arabic captions
  plaster: string; // page background
  card: string; // cards, sheets, tab bar
  cardBorder: string; // 1 px borders
  ink: string; // main text
  muted: string; // secondary text
  night: string; // reminders feed background, dark tab bar
  onPrimary: string; // text and icons on primary or dark surfaces
  highlight: string; // selected chips, lit streak pill
  primaryRing: string; // inner ring of primary buttons
  link: string; // primary-coloured text and icons on cards (gold in the night theme)
  statusBar: 'dark' | 'light';
};

export const PALETTES: Record<ThemeId, Palette> = {
  zellige: {
    zelligeGreen: '#1E5C46', deepGreen: '#174836', saffron: '#C98E2B', lightGold: '#E9B860', cobalt: '#1D3E8A', terracotta: '#8C4A2F',
    plaster: '#F3EADB', card: '#FBF6EC', cardBorder: '#E4D5BA', ink: '#22201C', muted: '#5D574C', night: '#16130F',
    onPrimary: '#FBF6EC', highlight: '#FBEFD6', primaryRing: '#3F8466', link: '#1E5C46', statusBar: 'dark',
  },
  // The Doorway — warm cedar wood and sand
  cedar: {
    zelligeGreen: '#7A4A2A', deepGreen: '#5E3820', saffron: '#C98E2B', lightGold: '#E9B860', cobalt: '#1E5C46', terracotta: '#9A5530',
    plaster: '#F1E4D3', card: '#FBF3E8', cardBorder: '#E0C9AE', ink: '#2A1E16', muted: '#6A5747', night: '#1C120B',
    onPrimary: '#FBF3E8', highlight: '#F6E0BF', primaryRing: '#A06D47', link: '#7A4A2A', statusBar: 'dark',
  },
  // The Courtyard — Fes cobalt on cool porcelain
  fes: {
    zelligeGreen: '#1D3E8A', deepGreen: '#152E66', saffron: '#C98E2B', lightGold: '#E9B860', cobalt: '#1E5C46', terracotta: '#8C4A2F',
    plaster: '#E8EDF5', card: '#F7F9FC', cardBorder: '#CFD8E8', ink: '#131B2D', muted: '#4D586E', night: '#0B1222',
    onPrimary: '#F7F9FC', highlight: '#FBF0D9', primaryRing: '#4A68B0', link: '#1D3E8A', statusBar: 'dark',
  },
  // The Fountain — turquoise water and pale mint
  turquoise: {
    zelligeGreen: '#1F7A7A', deepGreen: '#165E5E', saffron: '#C98E2B', lightGold: '#E9B860', cobalt: '#1D3E8A', terracotta: '#8C4A2F',
    plaster: '#E4F1EF', card: '#F6FBFA', cardBorder: '#C3DEDA', ink: '#0F2826', muted: '#4A6664', night: '#0A1E1F',
    onPrimary: '#F6FBFA', highlight: '#FBF0D9', primaryRing: '#4BA3A0', link: '#1F7A7A', statusBar: 'dark',
  },
  // The Minaret — Marrakech red: the Koutoubia's red-ochre walls, turquoise and gold tiles
  gilded: {
    zelligeGreen: '#A8382E', deepGreen: '#842A22', saffron: '#C98E2B', lightGold: '#F0C46A', cobalt: '#1E6B6B', terracotta: '#9A4A1E',
    plaster: '#F6E6DC', card: '#FDF5F0', cardBorder: '#EBCFC2', ink: '#2A1512', muted: '#6E4F47', night: '#1E0B09',
    onPrimary: '#FDF5F0', highlight: '#FBE2C8', primaryRing: '#CF6A5C', link: '#A8382E', statusBar: 'dark',
  },
  // The Dome — a full night theme in midnight and gold
  midnight: {
    zelligeGreen: '#3B4C92', deepGreen: '#2C3A73', saffron: '#E0A93E', lightGold: '#F5D58A', cobalt: '#8FA8E8', terracotta: '#E3A27F',
    plaster: '#0E1322', card: '#161D33', cardBorder: '#28324F', ink: '#EEE6D6', muted: '#9EA6BD', night: '#070A14',
    onPrimary: '#F3EADB', highlight: '#2B2F48', primaryRing: '#6274BF', link: '#F5D58A', statusBar: 'light',
  },
  // The Riad — Bougainvillea: fuchsia blooms over riad walls, emerald leaves and gold
  garden: {
    zelligeGreen: '#A8326E', deepGreen: '#82245A', saffron: '#E0A23A', lightGold: '#F6CF6B', cobalt: '#2E8A63', terracotta: '#C0533A',
    plaster: '#FBEAF0', card: '#FFF7FA', cardBorder: '#F0D0DD', ink: '#2B1420', muted: '#6F4C5D', night: '#22101A',
    onPrimary: '#FFF7FA', highlight: '#FCE3C0', primaryRing: '#D2669E', link: '#A8326E', statusBar: 'dark',
  },
};

/** Mix two #RRGGBB colours: t = 0 gives `a`, t = 1 gives `b`. */
function mix(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift: number) => Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t);
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1).toUpperCase()}`;
}

/**
 * Dark mode: true black. Backgrounds and surfaces are neutral blacks and
 * greys (so it never looks like the Midnight theme or a dimmed theme), text
 * is a soft warm white, and only the accents come from the theme you wear,
 * lifted just enough to read on black.
 */
function darkOf(p: Palette): Palette {
  const card = '#121212';
  return {
    ...p,
    plaster: '#000000',
    card,
    cardBorder: '#262626',
    ink: '#F2EEE8',
    muted: '#9C9890',
    night: '#000000',
    onPrimary: '#FBF6EC',
    terracotta: mix(p.terracotta, '#FFFFFF', 0.4),
    cobalt: mix(p.cobalt, '#FFFFFF', 0.4),
    link: mix(p.zelligeGreen, '#FFFFFF', 0.5),
    highlight: mix(card, p.saffron, 0.16),
    statusBar: 'light',
  };
}

const DARK_PALETTES = Object.fromEntries(
  (Object.keys(PALETTES) as ThemeId[]).map((id) => [id, darkOf(PALETTES[id])]),
) as Record<ThemeId, Palette>;

let activeTheme: ThemeId = 'zellige';
let activeDark = false;

/** Set by the root layout before the app renders (and re-renders on change). */
export function setActiveTheme(id: ThemeId, dark = false) {
  activeTheme = id;
  activeDark = dark;
}
export const getActiveTheme = () => activeTheme;
export const isDarkMode = () => activeDark;

/** A theme's palette in light or dark mode (dark defaults to the mode in use). */
export function paletteFor(id: ThemeId, dark = activeDark): Palette {
  return (dark ? DARK_PALETTES : PALETTES)[id];
}

/** The active palette. Read it at render time (not in module-level constants). */
export const colors: Palette = new Proxy({} as Palette, {
  get: (_t, key: string) => paletteFor(activeTheme)[key as keyof Palette],
});

/**
 * Styles that follow the active theme: `make` runs once per theme and is
 * cached; `styles.foo` always returns the active theme's version.
 */
export function themedStyles<T extends object>(make: () => T): T {
  const cache = new Map<string, T>();
  const get = () => {
    const k = `${activeTheme}-${activeDark ? 'dark' : 'light'}-${getLanguage()}`;
    let s = cache.get(k);
    if (!s) {
      s = make();
      cache.set(k, s);
    }
    return s;
  };
  return new Proxy({} as T, { get: (_t, key) => get()[key as keyof T] });
}

/** "#RRGGBB" + alpha → "rgba(...)". */
export function hexA(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export type ColorToken = keyof Palette;

/** Font family names, as registered by expo-font in the root layout. */
const LATIN_FONTS = {
  display: 'CormorantGaramond_700Bold', // headings and big numbers
  displaySemi: 'CormorantGaramond_600SemiBold',
  arabic: 'Amiri_400Regular',
  arabicBold: 'Amiri_700Bold',
  ui: 'Inter_400Regular',
  uiMedium: 'Inter_500Medium',
  uiSemi: 'Inter_600SemiBold',
};
/** In Arabic: Amiri for headings, Cairo (a clear Arabic UI face) for interface text. */
const ARABIC_FONTS: typeof LATIN_FONTS = {
  ...LATIN_FONTS,
  display: 'Amiri_700Bold',
  displaySemi: 'Amiri_700Bold',
  ui: 'Cairo_400Regular',
  uiMedium: 'Cairo_600SemiBold',
  uiSemi: 'Cairo_700Bold',
};
/** Font families for the active language (read when styles are built). */
export const fonts = new Proxy(LATIN_FONTS, {
  get: (_t, key: string) => (getLanguage() === 'ar' ? ARABIC_FONTS : LATIN_FONTS)[key as keyof typeof LATIN_FONTS],
});

/** Type scale. Interface text never goes below 11. */
export const type = {
  screenTitle: 34,
  bigCountMin: 34,
  bigCountMax: 100,
  body: 15,
  small: 13,
  smallest: 12,
  floor: 11,
} as const;

export const radius = {
  card: 22,
  button: 16,
  pill: 999,
} as const;

export const size = {
  buttonHeight: 56,
  buttonHeightCompact: 54,
  minTouch: 44,
  border: 1,
  zelligeBandMin: 14,
  zelligeBandMax: 28,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

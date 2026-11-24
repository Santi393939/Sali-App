/**
 * Salli design tokens — the single source of truth for colour, type and shape.
 * Every screen and component reads from here, so a change happens in one place.
 */

export const colors = {
  zelligeGreen: '#1E5C46', // primary buttons, hero arch, active tab
  deepGreen: '#174836', // pressed states, lantern star fill
  saffron: '#C98E2B', // borders, progress, accents, tab indicator
  lightGold: '#E9B860', // progress ring, highlights on green
  cobalt: '#1D3E8A', // zellige tiles, list bullets
  terracotta: '#8C4A2F', // secondary numbers, Arabic captions, tassels
  plaster: '#F3EADB', // page background
  card: '#FBF6EC', // cards, sheets, tab bar
  cardBorder: '#E4D5BA', // 1 px borders
  ink: '#22201C', // main text
  muted: '#5D574C', // secondary text
  night: '#16130F', // reminders feed background, dark tab bar
} as const;

export type ColorToken = keyof typeof colors;

/** Font family names, as registered by expo-font in the root layout. */
export const fonts = {
  display: 'CormorantGaramond_700Bold', // headings and big numbers
  displaySemi: 'CormorantGaramond_600SemiBold',
  arabic: 'Amiri_400Regular',
  arabicBold: 'Amiri_700Bold',
  ui: 'Inter_400Regular',
  uiMedium: 'Inter_500Medium',
  uiSemi: 'Inter_600SemiBold',
} as const;

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

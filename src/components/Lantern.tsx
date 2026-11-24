import Svg, { Circle, Defs, Line, Path, RadialGradient, Stop } from 'react-native-svg';

import { useRewards } from '@/store/rewards';
import type { LanternLevel } from '@/store/streaks';
import { colors } from '@/theme';

type Props = {
  size: number;
  /** Lit = warm glass and flame; unlit = grey. */
  lit?: boolean;
  /** Metal finish for the streak level. */
  level?: LanternLevel;
  /** Soft glow behind the lantern when lit. */
  glow?: boolean;
  /** Show a specific glass colour (reward previews). */
  glassColor?: string;
};

/** Metal colour per lantern level: [main, shade]. */
export const LANTERN_FINISH: Record<LanternLevel, [string, string]> = {
  brass: [colors.saffron, '#9E6C1C'],
  bronze: ['#B0703F', '#7E4A26'],
  silver: ['#B9BEC4', '#80868D'],
  gold: ['#E2B13C', '#A87C18'],
  emerald: ['#2E9D72', '#C98E2B'], // emerald body with gold trim
};

const UNLIT: [string, string] = ['#9A9285', '#7C7468'];

/**
 * Placeholder Moroccan lantern (fanous) until the commissioned Rive file
 * arrives. Drawn on a 40 × 64 grid.
 */
export function Lantern({ size, lit = false, level = 'brass', glow = true, glassColor }: Props) {
  const [metal, trim] = lit ? LANTERN_FINISH[level] : UNLIT;
  const chosen = useRewards().glass;
  const glass = lit ? (glassColor ?? chosen) : '#D9D2C4';
  const tassel = lit ? colors.terracotta : '#8E8579';
  return (
    <Svg width={size * (40 / 64)} height={size} viewBox="0 0 40 64">
      <Defs>
        <RadialGradient id="lanternGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={colors.lightGold} stopOpacity={0.55} />
          <Stop offset="1" stopColor={colors.lightGold} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      {lit && glow && <Circle cx={20} cy={33} r={20} fill="url(#lanternGlow)" />}
      {/* hanging ring */}
      <Circle cx={20} cy={4} r={3} fill="none" stroke={metal} strokeWidth={1.6} />
      {/* dome cap */}
      <Path d="M20 7 L28 17 H12 Z" fill={metal} />
      <Path d="M10 17 H30 V20 H10 Z" fill={trim} />
      {/* glass body: narrow top, wide belly, narrow base */}
      <Path d="M12 20 H28 L33 33 L28 46 H12 L7 33 Z" fill={glass} stroke={metal} strokeWidth={1.6} strokeLinejoin="round" />
      {/* flame */}
      {lit && <Path d="M20 26 C23.5 30 23.5 35 20 38 C16.5 35 16.5 30 20 26 Z" fill="#FFF3D1" opacity={0.95} />}
      {/* frame ribs */}
      <Line x1={20} y1={20} x2={20} y2={46} stroke={metal} strokeWidth={1.2} opacity={lit ? 0.55 : 1} />
      <Line x1={7} y1={33} x2={33} y2={33} stroke={metal} strokeWidth={1} opacity={lit ? 0.55 : 1} />
      {/* star piercing */}
      {!lit && <Path d="M20 27 L21.5 31.5 L26 33 L21.5 34.5 L20 39 L18.5 34.5 L14 33 L18.5 31.5 Z" fill={metal} opacity={0.75} />}
      {/* base */}
      <Path d="M11 46 H29 L26 51 H14 Z" fill={trim} />
      {/* tassel */}
      <Line x1={20} y1={51} x2={20} y2={55} stroke={tassel} strokeWidth={1.4} />
      <Path d="M17 55 H23 L22 63 H18 Z" fill={tassel} />
    </Svg>
  );
}

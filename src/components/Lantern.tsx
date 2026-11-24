import Svg, { Circle, Line, Path } from 'react-native-svg';

import { colors } from '@/theme';

type Props = {
  size: number;
  /** Lit = warm glass; unlit = grey glass. */
  lit?: boolean;
};

/**
 * Placeholder Moroccan lantern (fanous). Will be replaced by the
 * commissioned Rive animation. Drawn on a 40 × 64 grid.
 */
export function Lantern({ size, lit = false }: Props) {
  const metal = lit ? colors.saffron : '#9A9285';
  const glass = lit ? colors.lightGold : '#D9D2C4';
  const tassel = lit ? colors.terracotta : '#8E8579';
  return (
    <Svg width={size * (40 / 64)} height={size} viewBox="0 0 40 64">
      {lit && <Circle cx={20} cy={32} r={18} fill={colors.lightGold} opacity={0.25} />}
      {/* hanging ring */}
      <Circle cx={20} cy={4} r={3} fill="none" stroke={metal} strokeWidth={1.6} />
      {/* dome cap */}
      <Path d="M20 7 L28 17 H12 Z" fill={metal} />
      <Path d="M10 17 H30 V20 H10 Z" fill={metal} />
      {/* glass body: narrow top, wide belly, narrow base */}
      <Path d="M12 20 H28 L33 33 L28 46 H12 L7 33 Z" fill={glass} stroke={metal} strokeWidth={1.6} strokeLinejoin="round" />
      {/* frame ribs */}
      <Line x1={20} y1={20} x2={20} y2={46} stroke={metal} strokeWidth={1.2} />
      <Line x1={7} y1={33} x2={33} y2={33} stroke={metal} strokeWidth={1} />
      {/* star piercing */}
      <Path d="M20 27 L21.5 31.5 L26 33 L21.5 34.5 L20 39 L18.5 34.5 L14 33 L18.5 31.5 Z" fill={metal} opacity={0.75} />
      {/* base */}
      <Path d="M11 46 H29 L26 51 H14 Z" fill={metal} />
      {/* tassel */}
      <Line x1={20} y1={51} x2={20} y2={55} stroke={tassel} strokeWidth={1.4} />
      <Path d="M17 55 H23 L22 63 H18 Z" fill={tassel} />
    </Svg>
  );
}

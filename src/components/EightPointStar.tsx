import Svg, { Path } from 'react-native-svg';

import { colors } from '@/theme';

import { eightPointStarPath } from './geometry';

type Props = {
  size: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  /** Degrees. 0 puts a tip at the top; 22.5 puts a flat side at the top. */
  rotation?: number;
};

/** The Salli 8-point star (two overlapping squares). */
export function EightPointStar({
  size,
  fill = colors.zelligeGreen,
  stroke = colors.saffron,
  strokeWidth = 0,
  rotation = 0,
}: Props) {
  const c = size / 2;
  const r = c - strokeWidth / 2;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Path
        d={eightPointStarPath(c, c, r, undefined, rotation)}
        fill={fill}
        stroke={strokeWidth > 0 ? stroke : 'none'}
        strokeWidth={strokeWidth}
        strokeLinejoin="miter"
      />
    </Svg>
  );
}

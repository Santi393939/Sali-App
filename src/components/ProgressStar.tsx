import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors } from '@/theme';

import { eightPointStarPath } from './geometry';

type Props = {
  size: number;
  /** 0–1 */
  progress: number;
  ringWidth?: number;
  children?: ReactNode;
};

/** 8-point star inside a gold progress ring; children (the count) sit in the centre. */
export function ProgressStar({ size, progress, ringWidth = 5, children }: Props) {
  const c = size / 2;
  const ringR = c - ringWidth / 2;
  const circumference = 2 * Math.PI * ringR;
  const p = Math.max(0, Math.min(1, progress));
  const starR = ringR - ringWidth - 4;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={c} cy={c} r={ringR} stroke={colors.lightGold} strokeOpacity={0.22} strokeWidth={ringWidth} fill="none" />
        <Circle
          cx={c}
          cy={c}
          r={ringR}
          stroke={colors.lightGold}
          strokeWidth={ringWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference * p} ${circumference}`}
          transform={`rotate(-90 ${c} ${c})`}
        />
        <Path d={eightPointStarPath(c, c, starR)} fill={colors.deepGreen} stroke={colors.saffron} strokeWidth={1.25} />
        <Path
          d={eightPointStarPath(c, c, starR - 6)}
          fill="none"
          stroke={colors.lightGold}
          strokeOpacity={0.35}
          strokeWidth={0.75}
        />
      </Svg>
      <View style={styles.center} pointerEvents="none">
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

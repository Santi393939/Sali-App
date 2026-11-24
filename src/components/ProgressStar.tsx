import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedProps, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors } from '@/theme';

import { eightPointStarPath } from './geometry';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  size: number;
  /** 0–1, animated on the UI thread. */
  progress: SharedValue<number>;
  ringWidth?: number;
  /** Fill of the star inside the ring. */
  starFill?: string;
  children?: ReactNode;
};

/** 8-point star inside a gold progress ring; children (the count) sit in the centre. */
export function ProgressStar({ size, progress, ringWidth = 5, starFill = colors.deepGreen, children }: Props) {
  const c = size / 2;
  const ringR = c - ringWidth / 2;
  const circumference = 2 * Math.PI * ringR;
  const starR = ringR - ringWidth - 4;

  const ringProps = useAnimatedProps(() => {
    const p = Math.max(0, Math.min(1, progress.value));
    return { strokeDashoffset: circumference * (1 - p) };
  });

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={c} cy={c} r={ringR} stroke={colors.lightGold} strokeOpacity={0.22} strokeWidth={ringWidth} fill="none" />
        <AnimatedCircle
          cx={c}
          cy={c}
          r={ringR}
          stroke={colors.lightGold}
          strokeWidth={ringWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={ringProps}
          transform={`rotate(-90 ${c} ${c})`}
        />
        <Path d={eightPointStarPath(c, c, starR)} fill={starFill} stroke={colors.saffron} strokeWidth={1.25} />
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

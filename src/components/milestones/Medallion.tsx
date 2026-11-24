import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import type { MilestoneIconName } from '@/content/milestones';
import { colors } from '@/theme';

import { eightPointStarPath } from '../geometry';
import { MilestoneIcon } from './MilestoneIcon';

type Props = {
  size: number;
  icon: MilestoneIconName;
  earned: boolean;
  /** The next one to reach: glows gently and shows its progress ring. */
  next?: boolean;
  /** 0–1 progress toward this one (shown when `next`). */
  progress?: number;
};

/** 8-point star medallion: green and gold when earned, outlined when locked. */
export function Medallion({ size, icon, earned, next = false, progress = 0 }: Props) {
  const reduce = useReducedMotion();
  const glow = useSharedValue(0);
  useEffect(() => {
    if (next && !reduce) {
      glow.set(withRepeat(withSequence(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 1100, easing: Easing.inOut(Easing.sin) })), -1));
    } else {
      glow.set(0);
    }
  }, [next, reduce, glow]);
  const glowStyle = useAnimatedStyle(() => ({
    opacity: next ? 0.15 + 0.5 * glow.value : 0,
    transform: [{ scale: 1 + 0.06 * glow.value }],
  }));

  const c = size / 2;
  const ringR = c - 2;
  const circ = 2 * Math.PI * ringR;
  const p = Math.max(0, Math.min(1, progress));

  return (
    <View style={{ width: size, height: size }}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.glow, { borderRadius: c }, glowStyle]} />
      <Svg width={size} height={size}>
        {next && (
          <>
            <Circle cx={c} cy={c} r={ringR} stroke={colors.saffron} strokeOpacity={0.18} strokeWidth={3} fill="none" />
            <Circle
              cx={c}
              cy={c}
              r={ringR}
              stroke={colors.saffron}
              strokeWidth={3}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${circ * p} ${circ}`}
              transform={`rotate(-90 ${c} ${c})`}
            />
          </>
        )}
        <Path
          d={eightPointStarPath(c, c, c - (next ? 8 : 2))}
          fill={earned ? colors.zelligeGreen : next ? colors.card : colors.plaster}
          stroke={earned ? colors.saffron : next ? colors.saffron : colors.cardBorder}
          strokeWidth={earned ? 2 : 1.5}
          strokeDasharray={earned || next ? undefined : '3 3'}
        />
        {earned && <Path d={eightPointStarPath(c, c, c - 9)} fill="none" stroke={colors.lightGold} strokeOpacity={0.55} strokeWidth={0.8} />}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <MilestoneIcon
          name={icon}
          size={size * 0.42}
          color={earned ? colors.card : next ? colors.zelligeGreen : colors.cardBorder}
          accent={earned ? colors.lightGold : next ? colors.saffron : colors.cardBorder}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  glow: { borderWidth: 4, borderColor: colors.lightGold, margin: -3 },
});

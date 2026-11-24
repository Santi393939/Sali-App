/**
 * Milestone medallion. Each milestone has its own shape and materials:
 * a cedar arch, a cobalt tile, a turquoise scalloped basin, a gilded 8-point
 * star, a midnight 12-point star and a 16-point garden rosette.
 */
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
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import type { MedalShape, Milestone } from '@/content/milestones';
import { colors, themedStyles } from '@/theme';

import { eightPointStarPath, scallopPath, starPath, tilePath } from '../geometry';
import { MilestoneIcon } from './MilestoneIcon';

type Props = {
  size: number;
  milestone: Milestone;
  earned: boolean;
  /** The next one to reach: glows gently and shows its progress ring. */
  next?: boolean;
  /** 0–1 progress toward this one (shown when `next`). */
  progress?: number;
};

/** Outline of a medallion shape, centred in a `size` box with radius r. */
export function shapePath(shape: MedalShape, size: number, r: number): string {
  const c = size / 2;
  switch (shape) {
    case 'arch': {
      // Horseshoe arch, wider than a semicircle, centred in the box.
      const w = r * 1.62;
      const h = r * 2;
      const ar = w / 2;
      const top = c - h / 2;
      const cy = top + ar;
      const t = (26 * Math.PI) / 180;
      const lx = c - ar * Math.cos(t);
      const rx = c + ar * Math.cos(t);
      const sy = cy + ar * Math.sin(t);
      const base = top + h;
      return `M${lx.toFixed(2)},${base.toFixed(2)} L${lx.toFixed(2)},${sy.toFixed(2)} A${ar.toFixed(2)},${ar.toFixed(2)} 0 1 1 ${rx.toFixed(2)},${sy.toFixed(2)} L${rx.toFixed(2)},${base.toFixed(2)} Z`;
    }
    case 'tile':
      return tilePath(c, c, r);
    case 'scallop':
      return scallopPath(c, c, r * 0.95, 14);
    case 'star8':
      return eightPointStarPath(c, c, r);
    case 'star12':
      return starPath(c, c, r, 12, 0.8);
    case 'rosette16':
      return starPath(c, c, r, 16, 0.86, 11.25);
  }
}

export function Medallion({ size, milestone, earned, next = false, progress = 0 }: Props) {
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

  const p = milestone.palette;
  const c = size / 2;
  const ringR = c - 2;
  const circ = 2 * Math.PI * ringR;
  const r = c - (next ? 8 : 2);
  const outline = shapePath(milestone.shape, size, r);
  const innerLine = shapePath(milestone.shape, size, r * 0.8);
  const gid = `face-${milestone.amount}-${size}`;
  const pr = Math.max(0, Math.min(1, progress));

  return (
    <View style={{ width: size, height: size }}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.glow, { borderRadius: c, borderColor: p.rim }, glowStyle]} />
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2="0.4" y2="1">
            <Stop offset="0" stopColor={lighten(p.face, 0.18)} />
            <Stop offset="1" stopColor={p.face} />
          </LinearGradient>
        </Defs>
        {next && (
          <>
            <Circle cx={c} cy={c} r={ringR} stroke={p.rim} strokeOpacity={0.25} strokeWidth={3} fill="none" />
            <Circle
              cx={c}
              cy={c}
              r={ringR}
              stroke={p.face}
              strokeWidth={3}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${circ * pr} ${circ}`}
              transform={`rotate(-90 ${c} ${c})`}
            />
          </>
        )}
        {earned ? (
          <>
            <Path d={outline} fill={`url(#${gid})`} stroke={p.rim} strokeWidth={Math.max(1.5, size / 40)} strokeLinejoin="round" />
            <Path d={innerLine} fill="none" stroke={p.accent} strokeOpacity={0.6} strokeWidth={Math.max(0.6, size / 110)} strokeLinejoin="round" />
          </>
        ) : (
          <Path
            d={outline}
            fill={next ? colors.card : colors.plaster}
            stroke={next ? p.face : colors.cardBorder}
            strokeOpacity={next ? 0.8 : 1}
            strokeWidth={1.5}
            strokeDasharray={next ? undefined : '3 3'}
            strokeLinejoin="round"
          />
        )}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center, milestone.shape === 'arch' && { paddingTop: size * 0.08 }]}>
        <MilestoneIcon
          name={milestone.icon}
          size={size * (milestone.shape === 'arch' ? 0.38 : 0.42)}
          color={earned ? p.icon : next ? p.face : colors.cardBorder}
          accent={earned ? p.accent : next ? p.rim === '#E9B860' ? colors.saffron : p.face : colors.cardBorder}
        />
      </View>
    </View>
  );
}

/** Mix a hex colour toward white. */
function lighten(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (v: number) => Math.round(v + (255 - v) * k);
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

const styles = themedStyles(() =>
  StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  glow: { borderWidth: 4, margin: -3 },
}),
);

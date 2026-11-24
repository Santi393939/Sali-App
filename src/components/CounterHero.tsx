/**
 * The arch counter: the tappable horseshoe arch with the star, progress ring
 * and count, plus every Today animation from the brief:
 *  - tap (+1): count pops 1.0 → 1.18 → 1.0 in ~0.35 s, 4 small sparks
 *  - +100 / +300: count rolls up over 0.75 s (ease-out cubic), gold pulse
 *    ring, 9–14 diamond sparks, "+amount" floats up and fades
 *  - +1,000 / number pad: as above with more sparks
 * All motion runs on the UI thread (Reanimated worklets / Skia).
 * With Reduce Motion on, the count simply updates and nothing flies.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { THEMES } from '@/content/rewards';
import type { AddKind } from '@/lib/feedback';
import { useRewards } from '@/store/rewards';
import { colors, fonts, themedStyles } from '@/theme';

import { HorseshoeArch } from './HorseshoeArch';
import { AnimatedCount, FloatingAmount, Sparks, type Burst } from './motion';
import { ProgressStar } from './ProgressStar';

export type AddEvent = {
  id: number;
  amount: number;
  kind: AddKind;
  /** ms to wait before playing (e.g. while the number pad closes). */
  delay?: number;
};

type Props = {
  total: number;
  goal: number;
  event?: AddEvent;
  /** Show what's left to the goal instead of what's done. */
  countDown?: boolean;
  onTap: () => void;
};

const ARCH_W = 170;
const ARCH_H = 214;
const STAR = 132;
const STAR_TOP = 18; // offset of the star below the arch's centre
const STAR_CX = ARCH_W / 2;
const STAR_CY = ARCH_H / 2 + STAR_TOP / 2;
const SPARK_CANVAS = 300;

const countSize = (n: number) => (n < 1000 ? 44 : n < 10000 ? 38 : n < 100000 ? 32 : 26);

export function CounterHero({ total, goal, event, countDown = false, onTap }: Props) {
  const reduceMotion = useReducedMotion();
  const arch = THEMES[useRewards().theme];
  const displayed = useSharedValue(total);
  const pop = useSharedValue(1);
  const pulse = useSharedValue(1); // 0 → 1 plays the ring; 1 = hidden
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [floats, setFloats] = useState<{ id: number; amount: number }[]>([]);
  const lastEventId = useRef<number | undefined>(event?.id);

  const progress = useDerivedValue(() => displayed.value / goal);
  const shown = useDerivedValue(() => (countDown ? Math.max(0, goal - displayed.value) : displayed.value));

  useEffect(() => {
    const isNew = event && event.id !== lastEventId.current;
    if (!isNew) {
      // Total changed without an add (first load, day rollover): just show it.
      displayed.set(total);
      return;
    }
    lastEventId.current = event.id;
    const delay = event.delay ?? 0;

    if (reduceMotion) {
      displayed.set(total);
      return;
    }

    if (event.kind === 'tap') {
      displayed.set(total);
      pop.set(withSequence(
        withTiming(1.18, { duration: 110, easing: Easing.out(Easing.quad) }),
        withSpring(1, { damping: 9, stiffness: 320, mass: 0.6, reduceMotion: ReduceMotion.System }),
      ));
    } else {
      displayed.set(withDelay(
        delay,
        withTiming(total, { duration: 750, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System }),
      ));
      pulse.set(0);
      pulse.set(withDelay(delay, withTiming(1, { duration: 750, easing: Easing.out(Easing.quad) })));
      pop.set(withDelay(
        delay,
        withSequence(withTiming(1.08, { duration: 120 }), withSpring(1, { damping: 10, stiffness: 260 })),
      ));
    }

    const spawn = () => {
      setBursts((b) => [...b.slice(-5), { id: event.id, kind: event.kind }]);
      if (event.kind !== 'tap') setFloats((f) => [...f.slice(-3), { id: event.id, amount: event.amount }]);
    };
    if (delay > 0) {
      const t = setTimeout(spawn, delay);
      return () => clearTimeout(t);
    }
    spawn();
  }, [total, event, reduceMotion, displayed, pop, pulse]);

  const removeBurst = useCallback((id: number) => setBursts((b) => b.filter((x) => x.id !== id)), []);
  const removeFloat = useCallback((id: number) => setFloats((f) => f.filter((x) => x.id !== id)), []);

  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulse.value >= 1 ? 0 : 0.85 * (1 - pulse.value),
    transform: [{ scale: 1 + 0.6 * pulse.value }],
  }));

  const size = countSize(countDown ? Math.max(0, goal - total) : total);

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onTap}
        accessibilityRole="button"
        accessibilityLabel={`Add one salawat. ${total.toLocaleString('en-US')} of ${goal.toLocaleString('en-US')} today`}>
        <HorseshoeArch width={ARCH_W} height={ARCH_H} fill={arch.arch}>
          <View style={{ marginTop: STAR_TOP }}>
            <ProgressStar size={STAR} progress={progress} starFill={arch.star}>
              <Animated.View style={[styles.countBox, popStyle]}>
                <AnimatedCount value={shown} style={[styles.count, { fontSize: size, lineHeight: size + 6 }]} />
                <Text style={styles.countOf}>
                  {countDown ? 'left of' : 'of'} {goal.toLocaleString('en-US')}
                </Text>
              </Animated.View>
            </ProgressStar>
          </View>
        </HorseshoeArch>
      </Pressable>

      {/* Overlays: never block taps */}
      <Animated.View pointerEvents="none" style={[styles.pulse, pulseStyle]} />
      <View pointerEvents="none" style={styles.sparks}>
        <Sparks bursts={bursts} size={SPARK_CANVAS} onDone={removeBurst} />
      </View>
      <View pointerEvents="none" style={styles.floats}>
        {floats.map((f) => (
          <FloatingAmount key={f.id} id={f.id} amount={f.amount} onDone={removeFloat} />
        ))}
      </View>
    </View>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
  wrap: { width: ARCH_W, height: ARCH_H, overflow: 'visible' },
  countBox: { alignItems: 'center', justifyContent: 'center' },
  count: { fontFamily: fonts.display, fontVariant: ['lining-nums'], color: colors.onPrimary, minWidth: 110 },
  countOf: { fontFamily: fonts.uiMedium, fontSize: 12, color: colors.lightGold },
  pulse: {
    position: 'absolute',
    left: STAR_CX - STAR / 2,
    top: STAR_CY - STAR / 2,
    width: STAR,
    height: STAR,
    borderRadius: STAR / 2,
    borderWidth: 3,
    borderColor: colors.lightGold,
  },
  sparks: {
    position: 'absolute',
    left: STAR_CX - SPARK_CANVAS / 2,
    top: STAR_CY - SPARK_CANVAS / 2,
    width: SPARK_CANVAS,
    height: SPARK_CANVAS,
  },
  floats: {
    position: 'absolute',
    left: -40,
    right: -40,
    top: STAR_CY - STAR / 2 + 8,
    height: 40,
  },
}),
);

/**
 * Five swipeable tabs with a bottom tab bar.
 *
 * Swiping: pages move 1:1 with the finger in both directions, like a native
 * pager, so what you touch stays under your finger; the page leaving dims
 * slightly. (The brief's slide-over with a 30% drift was tried first, but the
 * page under the finger lagging behind it felt wrong.) The tab pill follows
 * the finger as a "worm": its leading edge runs ahead and the trailing edge
 * catches up. A selection tick plays when the swipe crosses into a new tab;
 * the page snaps home without wobble and the landing (Medium impact + icon
 * spring) fires the instant it arrives. Everything is driven by one shared
 * value (`position`) on the UI thread.
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Extrapolation,
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { cancelPresses } from '@/lib/cancelPresses';
import { feedback } from '@/lib/feedback';

import { TabBar, type TabSpec } from './TabBar';

export type Tab = TabSpec & { render: () => ReactNode };

type TabsApi = { index: number; goTo: (i: number) => void; position: SharedValue<number> | null };
const TabsContext = createContext<TabsApi>({ index: 0, goTo: () => {}, position: null });
export const useTabs = () => useContext(TabsContext);

/** Fast and crisp: no bounce past the page, so it lands with a clean stop. */
const SPRING = { damping: 28, stiffness: 300, mass: 0.75, overshootClamping: true };
/** A flick faster than this (px/s) turns the page even on a short drag. */
const FLICK_VELOCITY = 300;
/** Without a flick, dragging past this share of the screen turns the page. */
const COMMIT_DISTANCE = 0.28;
/** How far a page darkens as it leaves (0–1). */
const DIM = 0.14;

export function TabPager({ tabs, initial = 0 }: { tabs: Tab[]; initial?: number }) {
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const last = tabs.length - 1;
  const [index, setIndex] = useState(initial);
  const position = useSharedValue(initial);
  const start = useSharedValue(initial);
  const offset = useSharedValue(0);
  const crossed = useSharedValue(initial);
  const landing = useSharedValue(-1); // tab whose icon is springing
  const bounce = useSharedValue(1);

  const land = useCallback(
    (i: number) => {
      setIndex(i);
      feedback.medium();
      landing.set(i);
      bounce.set(
        withSequence(
          withTiming(1.22, { duration: 110 }),
          withTiming(0.95, { duration: 100 }),
          withSpring(1, { damping: 10, stiffness: 300 }),
        ),
      );
    },
    [landing, bounce],
  );

  const goTo = useCallback(
    (i: number) => {
      const target = Math.max(0, Math.min(last, i));
      const now = position.get();
      if (target === index && Math.abs(now - target) < 0.001) return;
      if (reduceMotion) {
        position.set(target);
        land(target);
        return;
      }
      // Far jumps skip the pages in between: start one page away, then slide in.
      const from = Math.round(now);
      if (Math.abs(target - from) > 1) {
        const near = target - Math.sign(target - from);
        crossed.set(target);
        position.set(near);
      }
      position.set(
        withSpring(target, SPRING, (done) => {
          if (done) scheduleOnRN(land, target);
        }),
      );
    },
    [index, last, position, crossed, land, reduceMotion],
  );

  // Selection tick each time the swipe crosses into a new tab.
  useAnimatedReaction(
    () => Math.round(position.value),
    (now, prev) => {
      if (prev !== null && now !== prev && now !== crossed.value) {
        crossed.set(now);
        scheduleOnRN(feedback.selection);
      }
    },
  );

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-14, 14])
    .onStart((e) => {
      cancelAnimation(position);
      start.set(position.value);
      offset.set(e.translationX); // so the page doesn't jump by the activation distance
      crossed.set(Math.round(position.value));
      scheduleOnRN(cancelPresses);
    })
    .onUpdate((e) => {
      let p = start.value - (e.translationX - offset.value) / width;
      // Rubber-band past the first and last tab, firmer the further you pull.
      if (p < 0) p = -(1 - 1 / (1 - p * 0.9)) * 0.35;
      if (p > last) p = last + (1 - 1 / (1 + (p - last) * 0.9)) * 0.35;
      position.set(p);
    })
    .onEnd((e) => {
      const from = Math.round(start.value);
      const delta = position.value - from;
      const v = -e.velocityX / width; // pages per second, + = forward
      let target = from;
      if (Math.abs(e.velocityX) > FLICK_VELOCITY && Math.sign(v) === Math.sign(delta || v)) {
        target = from + Math.sign(v);
      } else if (Math.abs(delta) > COMMIT_DISTANCE) {
        target = from + Math.sign(delta);
      }
      target = Math.max(0, Math.min(last, target));
      position.set(
        withSpring(target, { ...SPRING, velocity: v }, (done) => {
          if (done) scheduleOnRN(land, target);
        }),
      );
    });

  const api = useMemo(() => ({ index, goTo, position }), [index, goTo, position]);

  return (
    <TabsContext.Provider value={api}>
      <View style={styles.root}>
        {/* Web: let the browser keep vertical scrolling; we take only sideways swipes. */}
        <GestureDetector gesture={pan} touchAction="pan-y" userSelect="none">
          <View style={styles.pages}>
            {tabs.map((t, i) => (
              <Page key={t.key} i={i} position={position} width={width} active={i === index}>
                {t.render()}
              </Page>
            ))}
          </View>
        </GestureDetector>
        <TabBar tabs={tabs} position={position} landing={landing} bounce={bounce} onPress={goTo} />
      </View>
    </TabsContext.Provider>
  );
}

function Page({
  i,
  position,
  width,
  active,
  children,
}: {
  i: number;
  position: SharedValue<number>;
  width: number;
  active: boolean;
  children: ReactNode;
}) {
  const pageStyle = useAnimatedStyle(() => {
    const d = i - position.value; // >0: page is to the right
    const visible = d > -1 && d < 1;
    return {
      transform: [{ translateX: visible ? d * width : d > 0 ? width : -width }],
      opacity: visible ? 1 : 0,
    };
  });
  const dimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(Math.abs(i - position.value), [0, 1], [0, DIM], Extrapolation.CLAMP),
  }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, pageStyle]} pointerEvents={active ? 'auto' : 'none'}>
      {children}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.dim, dimStyle]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pages: { flex: 1, overflow: 'hidden' },
  dim: { backgroundColor: '#16130F' },
});

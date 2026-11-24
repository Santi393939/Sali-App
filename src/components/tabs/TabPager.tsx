/**
 * Five swipeable tabs with a bottom tab bar.
 *
 * Swiping: the page to the right always sits on top. Moving forward, the
 * incoming page slides over the outgoing one, which drifts at 30% speed and
 * dims to 45%; moving back reverses it. The tab pill follows the finger and
 * stretches mid-swipe. A selection tick plays when the swipe crosses into a
 * new tab; landing plays a Medium impact and springs the tab icon.
 * Everything is driven by one shared value (`position`) on the UI thread.
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
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

type TabsApi = { index: number; goTo: (i: number) => void };
const TabsContext = createContext<TabsApi>({ index: 0, goTo: () => {} });
export const useTabs = () => useContext(TabsContext);

const SPRING = { damping: 26, stiffness: 260, mass: 0.9 };

export function TabPager({ tabs, initial = 0 }: { tabs: Tab[]; initial?: number }) {
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const last = tabs.length - 1;
  const [index, setIndex] = useState(initial);
  const position = useSharedValue(initial);
  const start = useSharedValue(initial);
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
      if (target === index && Math.abs(position.get() - target) < 0.001) return;
      if (reduceMotion) {
        position.set(target);
        land(target);
        return;
      }
      position.set(
        withSpring(target, SPRING, (done) => {
          if (done) scheduleOnRN(land, target);
        }),
      );
    },
    [index, last, position, land, reduceMotion],
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
    .activeOffsetX([-14, 14])
    .failOffsetY([-12, 12])
    .onBegin(() => {
      start.set(position.value);
      crossed.set(Math.round(position.value));
    })
    .onStart(() => {
      scheduleOnRN(cancelPresses);
    })
    .onUpdate((e) => {
      let p = start.value - e.translationX / width;
      // Rubber-band past the first and last tab.
      if (p < 0) p = p * 0.25;
      if (p > last) p = last + (p - last) * 0.25;
      position.set(p);
    })
    .onEnd((e) => {
      const projected = position.value - (e.velocityX / width) * 0.22;
      const from = Math.round(start.value);
      const target = Math.max(0, Math.min(last, Math.max(from - 1, Math.min(from + 1, Math.round(projected)))));
      position.set(
        withSpring(target, { ...SPRING, velocity: -e.velocityX / width }, (done) => {
          if (done) scheduleOnRN(land, target);
        }),
      );
    });

  const api = useMemo(() => ({ index, goTo }), [index, goTo]);

  return (
    <TabsContext.Provider value={api}>
      <View style={styles.root}>
        <GestureDetector gesture={pan}>
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
    const x = d >= 0 ? d * width : d * width * 0.3;
    return {
      transform: [{ translateX: visible ? x : d > 0 ? width : -width }],
      zIndex: i,
      opacity: visible ? 1 : 0,
    };
  });
  const dimStyle = useAnimatedStyle(() => {
    const d = i - position.value;
    return { opacity: interpolate(d, [-1, 0], [0.55, 0], Extrapolation.CLAMP) };
  });
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
  dim: { backgroundColor: '#000' },
});

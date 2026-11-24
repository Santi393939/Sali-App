import type { ComponentType } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts } from '@/theme';

export type TabSpec = {
  key: string;
  label: string;
  Icon: ComponentType<{ color: string; size?: number }>;
  /** This tab uses the dark (Night) tab bar. */
  dark?: boolean;
};

type Props = {
  tabs: TabSpec[];
  position: SharedValue<number>;
  landing: SharedValue<number>;
  bounce: SharedValue<number>;
  onPress: (i: number) => void;
};

const BAR_PAD = 8;
const PILL_INSET = 4;

const DARK_INACTIVE = 'rgba(251,246,236,0.62)';

/** 0 on light tabs, 1 on a dark tab, blending while swiping between them. */
function darknessAt(p: number, darkTabs: number[]) {
  'worklet';
  let d = 0;
  for (const t of darkTabs) d = Math.max(d, 1 - Math.min(1, Math.abs(p - t)));
  return d;
}

export function TabBar({ tabs, position, landing, bounce, onPress }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const inner = Math.min(width, 560) - BAR_PAD * 2;
  const tabW = inner / tabs.length;
  const darkTabs = tabs.flatMap((t, i) => (t.dark ? [i] : []));

  const barStyle = useAnimatedStyle(() => {
    const k = darknessAt(position.value, darkTabs);
    return {
      backgroundColor: interpolateColor(k, [0, 1], [colors.card, colors.night]),
      borderTopColor: interpolateColor(k, [0, 1], [colors.cardBorder, '#2C251D']),
    };
  });

  // The pill follows the finger and stretches up to 50% mid-swipe.
  const pillStyle = useAnimatedStyle(() => {
    const p = position.value;
    const frac = p - Math.floor(p);
    const stretch = Math.sin(frac * Math.PI) * 0.5 * tabW;
    const k = darknessAt(p, darkTabs);
    return {
      width: tabW - PILL_INSET * 2 + stretch,
      transform: [{ translateX: p * tabW + PILL_INSET - stretch / 2 }],
      backgroundColor: interpolateColor(k, [0, 1], ['rgba(30,92,70,0.10)', 'rgba(233,184,96,0.14)']),
    };
  });

  return (
    <Animated.View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }, barStyle]}>
      <View style={[styles.row, { width: inner }]}>
        <Animated.View style={[styles.pill, pillStyle]} />
        {tabs.map((t, i) => (
          <TabButton
            key={t.key}
            tab={t}
            i={i}
            darkTabs={darkTabs}
            position={position}
            landing={landing}
            bounce={bounce}
            onPress={onPress}
          />
        ))}
      </View>
    </Animated.View>
  );
}

function TabButton({
  tab,
  i,
  darkTabs,
  position,
  landing,
  bounce,
  onPress,
}: {
  tab: TabSpec;
  i: number;
  darkTabs: number[];
  position: SharedValue<number>;
  landing: SharedValue<number>;
  bounce: SharedValue<number>;
  onPress: (i: number) => void;
}) {
  // Four stacked icon colours, cross-faded: inactive/active × light/dark bar.
  const darkInactive = useAnimatedStyle(() => ({ opacity: darknessAt(position.value, darkTabs) }));
  const lightActive = useAnimatedStyle(() => {
    const a = Math.max(0, 1 - Math.abs(position.value - i));
    return { opacity: a * (1 - darknessAt(position.value, darkTabs)) };
  });
  const darkActive = useAnimatedStyle(() => {
    const a = Math.max(0, 1 - Math.abs(position.value - i));
    return { opacity: a * darknessAt(position.value, darkTabs) };
  });
  const labelStyle = useAnimatedStyle(() => {
    const k = darknessAt(position.value, darkTabs);
    const inactive = interpolateColor(k, [0, 1], [colors.muted, DARK_INACTIVE]);
    const active = interpolateColor(k, [0, 1], [colors.zelligeGreen, colors.lightGold]);
    return { color: interpolateColor(Math.min(1, Math.abs(position.value - i)), [0, 1], [active, inactive]) };
  });
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: landing.value === i ? bounce.value : 1 }] }));
  const { Icon } = tab;
  return (
    <Pressable style={styles.tab} onPress={() => onPress(i)} accessibilityRole="tab" accessibilityLabel={tab.label}>
      <Animated.View style={iconStyle}>
        <Icon color={colors.muted} />
        <Animated.View style={[StyleSheet.absoluteFill, darkInactive]}>
          <Icon color={DARK_INACTIVE} />
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, lightActive]}>
          <Icon color={colors.zelligeGreen} />
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, darkActive]}>
          <Icon color={colors.lightGold} />
        </Animated.View>
      </Animated.View>
      <Animated.Text style={[styles.label, labelStyle]} numberOfLines={1}>
        {tab.label}
      </Animated.Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: 1,
    paddingTop: 6,
    alignItems: 'center',
  },
  row: { flexDirection: 'row' },
  pill: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    left: 0,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(201,142,43,0.45)',
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 7, gap: 2, minHeight: 52 },
  label: { fontFamily: fonts.uiSemi, fontSize: 11, color: colors.muted, textAlign: 'center' },
});

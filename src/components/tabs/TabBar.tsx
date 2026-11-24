import type { ComponentType } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts } from '@/theme';

export type TabSpec = {
  key: string;
  label: string;
  Icon: ComponentType<{ color: string; size?: number }>;
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

export function TabBar({ tabs, position, landing, bounce, onPress }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const inner = Math.min(width, 560) - BAR_PAD * 2;
  const tabW = inner / tabs.length;

  // The pill follows the finger and stretches up to 50% mid-swipe.
  const pillStyle = useAnimatedStyle(() => {
    const p = position.value;
    const frac = p - Math.floor(p);
    const stretch = Math.sin(frac * Math.PI) * 0.5 * tabW;
    return {
      width: tabW - PILL_INSET * 2 + stretch,
      transform: [{ translateX: p * tabW + PILL_INSET - stretch / 2 }],
    };
  });

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={[styles.row, { width: inner }]}>
        <Animated.View style={[styles.pill, pillStyle]} />
        {tabs.map((t, i) => (
          <TabButton key={t.key} tab={t} i={i} position={position} landing={landing} bounce={bounce} onPress={onPress} />
        ))}
      </View>
    </View>
  );
}

function TabButton({
  tab,
  i,
  position,
  landing,
  bounce,
  onPress,
}: {
  tab: TabSpec;
  i: number;
  position: SharedValue<number>;
  landing: SharedValue<number>;
  bounce: SharedValue<number>;
  onPress: (i: number) => void;
}) {
  const activeStyle = useAnimatedStyle(() => ({ opacity: Math.max(0, 1 - Math.abs(position.value - i)) }));
  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(Math.min(1, Math.abs(position.value - i)), [0, 1], [colors.zelligeGreen, colors.muted]),
  }));
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: landing.value === i ? bounce.value : 1 }] }));
  const { Icon } = tab;
  return (
    <Pressable
      style={styles.tab}
      onPress={() => onPress(i)}
      accessibilityRole="tab"
      accessibilityLabel={tab.label}>
      <Animated.View style={iconStyle}>
        <Icon color={colors.muted} />
        <Animated.View style={[StyleSheet.absoluteFill, activeStyle]}>
          <Icon color={colors.zelligeGreen} />
        </Animated.View>
      </Animated.View>
      <View>
        <Animated.Text style={[styles.label, labelStyle]} numberOfLines={1}>
          {tab.label}
        </Animated.Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
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
    backgroundColor: 'rgba(30,92,70,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(201,142,43,0.45)',
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 7, gap: 2, minHeight: 52 },
  label: { fontFamily: fonts.uiSemi, fontSize: 11, color: colors.muted, textAlign: 'center' },
});

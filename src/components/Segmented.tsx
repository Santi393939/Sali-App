import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { feedback } from '@/lib/feedback';
import { colors, fonts, themedStyles } from '@/theme';

type Props<T extends string> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
};

/** The bottom tab bar's spring, so every switch in the app moves the same way. */
const SPRING = { damping: 28, stiffness: 300, mass: 0.75, overshootClamping: true };

/**
 * Pill switch (e.g. Week / Month / Year) with a sliding thumb that moves like
 * the bottom tab bar: same spring, and the same "worm" (the leading edge runs
 * ahead, the trailing edge catches up). The pill moves the moment you tap,
 * even when the change itself is applied a moment later.
 */
export function Segmented<T extends string>({ options, value, onChange }: Props<T>) {
  const [w, setW] = useState(0);
  const [local, setLocal] = useState(value);
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    setLocal(value);
  }
  const index = Math.max(0, options.findIndex((o) => o.value === local));
  const count = options.length;
  const seg = w / count;
  const pos = useSharedValue(index);
  useEffect(() => {
    pos.set(withSpring(index, SPRING));
  }, [index, pos]);
  const thumb = useAnimatedStyle(() => {
    const p = Math.max(0, Math.min(count - 1, pos.value));
    const k0 = Math.floor(p);
    const t = p - k0;
    const left = k0 + t * t;
    const right = k0 + 1 + (1 - (1 - t) * (1 - t));
    return { width: (right - left) * seg - 4, transform: [{ translateX: left * seg + 2 }] };
  });
  return (
    <View style={[styles.wrap, { direction: 'ltr' }]} onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)} accessibilityRole="tablist">
      {w > 0 && <Animated.View style={[styles.thumb, thumb]} />}
      {options.map((o) => {
        const active = o.value === local;
        return (
          <Pressable
            key={o.value}
            style={styles.option}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (!active) {
                feedback.selection();
                setLocal(o.value);
                onChange(o.value);
              }
            }}>
            <Text style={[styles.label, active && styles.labelActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 0,
  },
  thumb: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    left: 0,
    borderRadius: 20,
    backgroundColor: colors.zelligeGreen,
    borderWidth: 1,
    borderColor: colors.saffron,
  },
  option: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: fonts.uiSemi, fontSize: 14, color: colors.muted },
  labelActive: { color: colors.onPrimary },
}),
);

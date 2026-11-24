import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { feedback } from '@/lib/feedback';
import { colors, fonts, themedStyles } from '@/theme';

type Props<T extends string> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
};

/** Pill switch (e.g. Week / Month / Year) with a sliding thumb. */
export function Segmented<T extends string>({ options, value, onChange }: Props<T>) {
  const [w, setW] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const seg = w / options.length;
  const thumb = useAnimatedStyle(() => ({
    width: seg - 4,
    transform: [{ translateX: withSpring(index * seg + 2, { damping: 20, stiffness: 260 }) }],
  }));
  return (
    <View style={styles.wrap} onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)} accessibilityRole="tablist">
      {w > 0 && <Animated.View style={[styles.thumb, thumb]} />}
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            style={styles.option}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (!active) {
                feedback.selection();
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

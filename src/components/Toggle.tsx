import { Pressable, StyleSheet } from 'react-native';
import { useEffect } from 'react';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { feedback } from '@/lib/feedback';
import { colors } from '@/theme';

type Props = {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
};

/** On/off switch: the knob slides with a spring and a Medium impact. */
export function Toggle({ value, onChange, label }: Props) {
  const on = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    on.set(withSpring(value ? 1 : 0, { damping: 18, stiffness: 320, overshootClamping: true }));
  }, [value, on]);
  const track = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(on.value, [0, 1], [colors.cardBorder, colors.zelligeGreen]),
    borderColor: interpolateColor(on.value, [0, 1], [colors.cardBorder, colors.saffron]),
  }));
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: 2 + Math.min(1, Math.max(0, on.value)) * 20 }] }));
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      hitSlop={8}
      onPress={() => {
        feedback.medium();
        onChange(!value);
      }}>
      <Animated.View style={[styles.track, track]}>
        <Animated.View style={[styles.knob, knob]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { width: 52, height: 32, borderRadius: 16, borderWidth: 1, justifyContent: 'center' },
  knob: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.card,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
});

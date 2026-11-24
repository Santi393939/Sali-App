import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { colors, fonts, themedStyles } from '@/theme';

type Props = {
  id: number;
  amount: number;
  onDone: (id: number) => void;
};

/** "+300" that floats up and fades out. */
export function FloatingAmount({ id, amount, onDone }: Props) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(1, { duration: 1000, easing: Easing.out(Easing.cubic) }, (finished) => {
      if (finished) scheduleOnRN(onDone, id);
    });
  }, [id, onDone, p]);
  const style = useAnimatedStyle(() => ({
    opacity: p.value < 0.15 ? p.value / 0.15 : 1 - Math.max(0, (p.value - 0.45) / 0.55),
    transform: [{ translateY: -38 * p.value }, { scale: 0.9 + 0.15 * Math.min(1, p.value * 3) }],
  }));
  return (
    <Animated.Text style={[styles.text, style]} pointerEvents="none">
      +{amount.toLocaleString('en-US')}
    </Animated.Text>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
  text: {
    position: 'absolute',
    alignSelf: 'center',
    fontFamily: fonts.display,
    fontVariant: ['lining-nums'],
    fontSize: 28,
    color: colors.lightGold,
    textShadowColor: 'rgba(23,72,54,0.6)',
    textShadowRadius: 6,
    textShadowOffset: { width: 0, height: 1 },
  },
}),
);

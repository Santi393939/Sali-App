/** Full-screen wash shown while the app switches theme (see lib/themeSwitch). */
import { useEffect, useSyncExternalStore } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { getVeil, subscribeVeil, VEIL_IN_MS, VEIL_OUT_MS } from '@/lib/themeSwitch';

import { Medallion } from './milestones/Medallion';

export function ThemeVeil() {
  const veil = useSyncExternalStore(subscribeVeil, getVeil, getVeil);
  const opacity = useSharedValue(0);
  const pop = useSharedValue(0.6);

  useEffect(() => {
    if (veil.visible) {
      opacity.set(withTiming(1, { duration: VEIL_IN_MS, easing: Easing.out(Easing.quad) }));
      pop.set(0.6);
      pop.set(withSequence(withSpring(1.08, { damping: 10, stiffness: 260 }), withSpring(1, { damping: 14, stiffness: 220 })));
    } else {
      opacity.set(withTiming(0, { duration: VEIL_OUT_MS, easing: Easing.inOut(Easing.quad) }));
    }
  }, [veil.visible, veil.id, opacity, pop]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const badgeStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  return (
    <Animated.View pointerEvents={veil.visible ? 'auto' : 'none'} style={[StyleSheet.absoluteFill, styles.veil, { backgroundColor: veil.color }, style]}>
      {veil.badge && (
        <Animated.View style={badgeStyle}>
          <Medallion size={120} milestone={veil.badge} earned />
        </Animated.View>
      )}
      <View />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  veil: { zIndex: 1000, alignItems: 'center', justifyContent: 'center' },
});

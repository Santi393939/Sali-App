import { useEffect, useSyncExternalStore } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { dismissToast, getToasts, subscribeToasts, type Toast } from '@/lib/toast';
import { colors, fonts, radius, spacing, themedStyles } from '@/theme';

import { EightPointStar } from './EightPointStar';

export function ToastHost() {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, getToasts);
  const insets = useSafeAreaInsets();
  const t = toasts[0];
  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { paddingTop: insets.top + 8, zIndex: 900 }]}>
      {t && <ToastView key={t.id} toast={t} />}
    </View>
  );
}

function ToastView({ toast }: { toast: Toast }) {
  const y = useSharedValue(-120);
  useEffect(() => {
    const hold = toast.tone === 'big' ? 2600 : 1900;
    y.set(
      withSequence(
        withSpring(0, { damping: 16, stiffness: 220 }),
        withDelay(
          hold,
          withTiming(-140, { duration: 260, easing: Easing.in(Easing.quad) }, (done) => {
            if (done) scheduleOnRN(dismissToast, toast.id);
          }),
        ),
      ),
    );
  }, [toast.id, toast.tone, y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const big = toast.tone === 'big';
  return (
    <Animated.View style={[styles.wrap, style]}>
      <Pressable onPress={() => dismissToast(toast.id)} style={[styles.toast, big && styles.big]} accessibilityRole="alert">
        <EightPointStar size={30} fill={big ? colors.lightGold : colors.zelligeGreen} stroke={colors.saffron} strokeWidth={1.5} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, big && { color: colors.onPrimary }]}>{toast.title}</Text>
          {toast.sub ? <Text style={[styles.sub, big && { color: colors.onPrimary, opacity: 0.85 }]}>{toast.sub}</Text> : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
    wrap: { alignItems: 'center', paddingHorizontal: spacing.lg },
    toast: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      width: '100%',
      maxWidth: 480,
      backgroundColor: colors.card,
      borderRadius: radius.card,
      borderWidth: 1.5,
      borderColor: colors.saffron,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    big: { backgroundColor: colors.zelligeGreen, borderColor: colors.lightGold },
    title: { fontFamily: fonts.uiSemi, fontSize: 15, color: colors.ink },
    sub: { fontFamily: fonts.ui, fontSize: 13, color: colors.muted, marginTop: 1 },
  }),
);

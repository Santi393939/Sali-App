/** 33 beads that fill as you tap the arch; each full ring is a round. */
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { colors, fonts, themedStyles } from '@/theme';
import { t } from '@/lib/i18n';

export const ROUND = 33;

export function TasbihBeads({ taps }: { taps: number }) {
  const inRound = taps % ROUND;
  const rounds = Math.floor(taps / ROUND);
  const justCompleted = taps > 0 && inRound === 0;
  const shown = justCompleted ? ROUND : inRound;
  const flash = useSharedValue(0);
  useEffect(() => {
    if (justCompleted) flash.set(withSequence(withTiming(1, { duration: 120 }), withTiming(0, { duration: 700 })));
  }, [justCompleted, taps, flash]);
  const glow = useAnimatedStyle(() => ({ opacity: flash.value }));
  return (
    <View style={styles.wrap} accessibilityLabel={t('Tasbih: round {r}, {n} of {total}', { r: rounds + (justCompleted ? 0 : 1), n: shown, total: ROUND })}>
      <View style={styles.row}>
        {Array.from({ length: ROUND }, (_, i) => (
          <Bead key={i} filled={i < shown} newest={i === shown - 1} />
        ))}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.glow, glow]} />
      </View>
      <Text style={styles.label}>
        {taps === 0 ? t('Tap the arch to count') : t('Round {r} · {n}/{total}', { r: rounds + (justCompleted ? 0 : 1), n: shown, total: ROUND }) + (rounds > 0 ? t(rounds === 1 ? ' · {n} round done' : ' · {n} rounds done', { n: rounds }) : '')}
      </Text>
    </View>
  );
}

function Bead({ filled, newest }: { filled: boolean; newest: boolean }) {
  const s = useSharedValue(1);
  useEffect(() => {
    if (newest && filled) s.set(withSequence(withTiming(1.6, { duration: 90 }), withSpring(1, { damping: 8, stiffness: 300 })));
  }, [newest, filled, s]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return <Animated.View style={[styles.bead, filled && styles.beadOn, style]} />;
}

const styles = themedStyles(() =>
  StyleSheet.create({
    wrap: { alignItems: 'center', marginTop: 8, gap: 4 },
    row: { flexDirection: 'row', gap: 2.5, paddingHorizontal: 4, paddingVertical: 3, borderRadius: 8 },
    bead: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.cardBorder },
    beadOn: { backgroundColor: colors.saffron },
    glow: { borderRadius: 8, backgroundColor: colors.lightGold, opacity: 0 },
    label: { fontFamily: fonts.ui, fontSize: 11, color: colors.muted },
  }),
);

/** Slim reminder on Today of the next milestone, opening the journey on Me. */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { MilestoneProgress } from '@/store/milestones';
import { colors, fonts, radius, spacing, themedStyles } from '@/theme';

import { Medallion } from './Medallion';

export function NextMilestoneStrip({ progress, onPress }: { progress: MilestoneProgress; onPress: () => void }) {
  const { next, lifetime, fraction } = progress;
  if (!next) return null;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Next milestone: ${next.name}`} style={({ pressed }) => [styles.strip, pressed && { opacity: 0.85 }]}>
      <Medallion size={46} milestone={next} earned={false} next progress={fraction} />
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>
          {(next.amount - lifetime).toLocaleString('en-US')} to {next.name}
        </Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.max(2, fraction * 100)}%` }]} />
        </View>
      </View>
      <Text style={styles.short}>{next.short}</Text>
    </Pressable>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  title: { fontFamily: fonts.uiSemi, fontSize: 14, color: colors.ink },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.plaster, marginTop: 6, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3, backgroundColor: colors.saffron },
  short: { fontFamily: fonts.display, fontVariant: ['lining-nums'], fontSize: 22, color: colors.terracotta },
}),
);

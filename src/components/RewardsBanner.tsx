/**
 * The doorway to Rewards & themes on Me: the badge you're wearing, the six
 * badges in a row (earned ones bright, the next one glowing with its
 * progress), and how far the next unlock is. The main incentive, so it sits
 * near the top.
 */
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Milestone } from '@/content/milestones';
import { t } from '@/lib/i18n';
import type { MilestoneProgress } from '@/store/milestones';
import { colors, fonts, radius, spacing, themedStyles } from '@/theme';

import { Medallion } from './milestones/Medallion';
import { PlasterPattern } from './PlasterPattern';

export function RewardsBanner({ progress, featured }: { progress: MilestoneProgress; featured: Milestone | null }) {
  const { list, next, lifetime, fraction } = progress;
  const earned = list.filter((m) => m.earned).length;
  return (
    <Pressable
      onPress={() => router.push('/rewards')}
      accessibilityRole="button"
      accessibilityLabel={t('Rewards & themes')}
      style={({ pressed }) => [styles.card, pressed && { transform: [{ scale: 0.98 }] }]}>
      <PlasterPattern color={colors.lightGold} opacity={0.1} cell={36} />
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>{t('Rewards & themes')}</Text>
          <Text style={styles.title}>
            {next ? t('Next unlock: {name}', { name: next.name.replace(/^The /, '') }) : t('Every badge earned')}
          </Text>
          <Text style={styles.sub}>
            {next
              ? t('{n} to go · a new theme, sound and title', { n: (next.amount - lifetime).toLocaleString('en-US') })
              : t('Wear any set you like')}
          </Text>
        </View>
        <Text style={styles.chev}>›</Text>
      </View>
      <View style={styles.badges}>
        {list.map((m) => (
          <View key={m.amount} style={[styles.badge, !m.earned && m !== next && { opacity: 0.4 }]}>
            <Medallion size={40} milestone={m} earned={m.earned} next={m === next} progress={m === next ? fraction : 0} />
            {featured?.amount === m.amount && <View style={styles.wearing} />}
          </View>
        ))}
      </View>
      <Text style={styles.count}>{t('{n} of {total} badges earned', { n: earned, total: list.length })}</Text>
    </Pressable>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
    card: { backgroundColor: colors.zelligeGreen, borderRadius: radius.card, borderWidth: 1, borderColor: colors.saffron, padding: spacing.lg, gap: spacing.md, overflow: 'hidden' },
    head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    eyebrow: { fontFamily: fonts.uiSemi, fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase', color: colors.lightGold },
    title: { fontFamily: fonts.display, fontSize: 24, color: colors.onPrimary, marginTop: 2 },
    sub: { fontFamily: fonts.ui, fontSize: 13, color: colors.onPrimary, opacity: 0.85, marginTop: 2 },
    chev: { fontSize: 30, color: colors.lightGold },
    badges: { flexDirection: 'row', justifyContent: 'space-between', direction: 'ltr' },
    badge: { alignItems: 'center' },
    wearing: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.lightGold, marginTop: 4 },
    count: { fontFamily: fonts.uiMedium, fontSize: 12, color: colors.lightGold },
  }),
);

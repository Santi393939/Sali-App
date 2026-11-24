/**
 * This Hijri month's challenge: light your lantern on a number of days set
 * from your own recent consistency, like a personal monthly challenge.
 */
import { StyleSheet, Text, View } from 'react-native';

import { t } from '@/lib/i18n';
import type { ChallengeProgress } from '@/store/growth';
import { colors, fonts, spacing, themedStyles } from '@/theme';

import { Card } from './Card';
import { Lantern } from './Lantern';

export function ChallengeCard({ c }: { c: ChallengeProgress }) {
  const pct = Math.min(1, c.lit / c.target);
  const needed = Math.max(0, c.target - c.lit);
  return (
    <Card>
      <View style={styles.head}>
        <Lantern size={34} lit={c.done} glow={false} />
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>{t('{month} challenge', { month: c.name })}</Text>
          <Text style={styles.title}>{t('Light your lantern on {n} days', { n: c.target })}</Text>
        </View>
        <Text style={styles.count}>
          {c.lit}/{c.target}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.max(3, pct * 100)}%` }]} />
      </View>
      <Text style={styles.foot}>
        {c.done
          ? t('Challenge complete. ما شاء الله')
          : t(c.daysLeft === 1 ? '{n} more to go · {d} day left this month' : '{n} more to go · {d} days left this month', { n: needed, d: c.daysLeft })}
      </Text>
      <Text style={styles.note}>{t('Set from your own last 30 days, a little above your usual.')}</Text>
    </Card>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
    head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    eyebrow: { fontFamily: fonts.uiSemi, fontSize: 12, color: colors.terracotta, textTransform: 'uppercase', letterSpacing: 0.8 },
    title: { fontFamily: fonts.display, fontSize: 22, color: colors.ink, marginTop: 2 },
    count: { fontFamily: fonts.display, fontVariant: ['lining-nums'], fontSize: 24, color: colors.terracotta },
    track: { height: 8, borderRadius: 4, backgroundColor: colors.plaster, marginTop: spacing.md, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: 4, backgroundColor: colors.saffron },
    foot: { fontFamily: fonts.uiMedium, fontSize: 13, color: colors.ink, marginTop: spacing.sm },
    note: { fontFamily: fonts.ui, fontSize: 12, color: colors.muted, marginTop: 2 },
  }),
);

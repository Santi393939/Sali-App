/** Shown the day after a missed day broke a streak: reach 2× the goal to relight it. */
import { StyleSheet, Text, View } from 'react-native';

import { keyToDate } from '@/lib/salliDay';
import { colors, fonts, radius, spacing, themedStyles } from '@/theme';

import { Lantern } from './Lantern';
import { dateLocale, isRTL, t } from '@/lib/i18n';

type Props = { repair: { day: string; streak: number; target: number }; total: number };

export function RepairCard({ repair, total }: Props) {
  const weekday = keyToDate(repair.day).toLocaleDateString(dateLocale(), { weekday: 'long' });
  const pct = Math.min(1, total / repair.target);
  return (
    <View style={styles.card} accessibilityRole="summary">
      <View style={styles.row}>
        <Lantern size={40} lit={false} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t('Your {n}-day streak can still be saved', { n: repair.streak })}</Text>
          <Text style={styles.body}>
            {t('{day} was missed. Send {n} today, double your goal, before Maghrib and it lights up again.', { day: weekday, n: repair.target.toLocaleString('en-US') })}
          </Text>
        </View>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.max(3, pct * 100)}%` }]} />
      </View>
      <Text style={styles.count}>
        {total.toLocaleString('en-US')} / {repair.target.toLocaleString('en-US')}
      </Text>
    </View>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
    card: { backgroundColor: colors.highlight, borderColor: colors.saffron, borderWidth: 1.5, borderRadius: radius.card, padding: spacing.lg, gap: spacing.sm },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    title: { fontFamily: fonts.uiSemi, fontSize: 15, color: colors.ink },
    body: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 19, color: colors.muted, marginTop: 2 },
    track: { height: 8, borderRadius: 4, backgroundColor: colors.card, overflow: 'hidden', borderWidth: 1, borderColor: colors.cardBorder },
    fill: { height: '100%', borderRadius: 4, backgroundColor: colors.saffron },
    count: { fontFamily: fonts.uiSemi, fontSize: 12, color: colors.terracotta, textAlign: isRTL() ? 'left' : 'right' },
  }),
);

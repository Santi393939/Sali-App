/**
 * Stats cards for steady growth: this week against your usual range, and
 * your personal bests. Numbers are always compared with your own history,
 * never with anyone else's.
 */
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { useState } from 'react';

import { dateLocale, t } from '@/lib/i18n';
import { keyToDate } from '@/lib/salliDay';
import type { Records, WeekRange } from '@/store/growth';
import { colors, fonts, spacing, themedStyles } from '@/theme';

import { Card } from './Card';

const fmt = (n: number) => n.toLocaleString('en-US');

export function RangeCard({ range }: { range: WeekRange }) {
  const [w, setW] = useState(0);
  const max = Math.max(range.high, range.thisWeek) * 1.15 || 1;
  const x = (n: number) => (n / max) * w;
  const line = {
    new: t('Keep counting for a few weeks and your usual range will show here.'),
    below: t('A lighter week than usual. Every salawat counts, and the next one can start now.'),
    within: t('Right in your usual range. Steady is how habits grow.'),
    above: `${t('Above your usual range. Pace yourself so it lasts.')} ما شاء الله`,
  }[range.status];
  return (
    <Card>
      <Text style={styles.title}>{t('Your usual range')}</Text>
      <Text style={styles.sub}>{t('The last 7 days against your four weeks before')}</Text>
      <Text style={styles.big}>{fmt(range.thisWeek)}</Text>
      {range.status !== 'new' && (
        <View style={styles.scale} onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}>
          <View style={styles.rail} />
          {w > 0 && (
            <>
              <View style={[styles.band, { left: x(range.low), width: Math.max(6, x(range.high) - x(range.low)) }]} />
              <View style={[styles.marker, { left: Math.min(w - 4, Math.max(0, x(range.thisWeek) - 2)) }]} />
            </>
          )}
        </View>
      )}
      {range.status !== 'new' && (
        <Text style={styles.rangeText}>{t('Usual: {low} – {high} a week', { low: fmt(range.low), high: fmt(range.high) })}</Text>
      )}
      <Text style={styles.line}>{line}</Text>
    </Card>
  );
}

export function RecordsCard({ records, longestStreak }: { records: Records; longestStreak: number }) {
  const day = (key: string) => keyToDate(key).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short', year: 'numeric' });
  const rows = [
    { label: t('Best day'), value: records.bestDay ? fmt(records.bestDay.total) : '—', sub: records.bestDay ? day(records.bestDay.date) : '' },
    { label: t('Best Jumu’ah week'), value: records.bestWeek ? fmt(records.bestWeek.total) : '—', sub: records.bestWeek ? t('ending {date}', { date: day(records.bestWeek.end) }) : '' },
    { label: t('Longest streak'), value: t('{n} days', { n: longestStreak }), sub: '' },
    { label: t('Lit days, all time'), value: fmt(records.litDays), sub: '' },
  ];
  return (
    <Card>
      <Text style={styles.title}>{t('Personal bests')}</Text>
      <Text style={styles.sub}>{t('Beat your best day and Salli celebrates it.')}</Text>
      {rows.map((r, i) => (
        <View key={r.label} style={[styles.row, i > 0 && styles.rowBorder]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowLabel}>{r.label}</Text>
            {r.sub ? <Text style={styles.rowSub}>{r.sub}</Text> : null}
          </View>
          <Text style={styles.rowValue}>{r.value}</Text>
        </View>
      ))}
    </Card>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
    title: { fontFamily: fonts.display, fontSize: 24, color: colors.ink },
    sub: { fontFamily: fonts.ui, fontSize: 12, color: colors.muted, marginTop: 2 },
    big: { fontFamily: fonts.display, fontVariant: ['lining-nums'], fontSize: 40, color: colors.ink, marginTop: spacing.sm },
    scale: { height: 22, justifyContent: 'center', marginTop: spacing.sm, direction: 'ltr' },
    rail: { height: 6, borderRadius: 3, backgroundColor: colors.plaster },
    band: { position: 'absolute', height: 10, borderRadius: 5, backgroundColor: colors.saffron, opacity: 0.45 },
    marker: { position: 'absolute', width: 4, height: 22, borderRadius: 2, backgroundColor: colors.link },
    rangeText: { fontFamily: fonts.uiMedium, fontSize: 12, color: colors.terracotta, marginTop: 6 },
    line: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 19, color: colors.ink, marginTop: spacing.sm },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
    rowBorder: { borderTopWidth: 1, borderTopColor: colors.cardBorder },
    rowLabel: { fontFamily: fonts.uiMedium, fontSize: 14, color: colors.ink },
    rowSub: { fontFamily: fonts.ui, fontSize: 12, color: colors.muted, marginTop: 1 },
    rowValue: { fontFamily: fonts.display, fontVariant: ['lining-nums'], fontSize: 22, color: colors.terracotta },
  }),
);

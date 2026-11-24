/**
 * Month of Salli days: lit days in gold, partly-done days tinted, shield and
 * repaired days marked. Arrows move between months; tapping a day shows its
 * total underneath.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { feedback } from '@/lib/feedback';
import { keyToDate, toDayKey } from '@/lib/salliDay';
import { getDay, savedDayKeys } from '@/store/days';
import type { DayStatus } from '@/store/streaks';
import { colors, fonts, hexA, spacing, themedStyles } from '@/theme';

import { ShieldIcon } from './StreakTakeover';

const WEEK_HEAD = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const STATUS_LABEL: Record<DayStatus, string> = {
  lit: 'Lantern lit',
  shield: 'Covered by a shield',
  repaired: 'Repaired the next day',
  missed: 'Not lit',
  pending: 'In progress',
};

type Props = {
  today: string;
  status: Record<string, DayStatus>;
  /** Changes on every count so totals stay fresh. */
  version?: number;
};

export function MonthCalendar({ today, status }: Props) {
  const t = keyToDate(today);
  const [offset, setOffset] = useState(0); // months back from this one
  const [picked, setPicked] = useState<string | null>(null);
  const first = new Date(t.getFullYear(), t.getMonth() - offset, 1, 12);
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: first.getDay() }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => toDayKey(new Date(first.getFullYear(), first.getMonth(), i + 1, 12))),
  ];
  while (cells.length % 7) cells.push(null);

  const earliest = savedDayKeys()[0];
  const canGoBack = !!earliest && earliest < toDayKey(first);
  const monthName = first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  let hijri = '';
  try {
    hijri = new Intl.DateTimeFormat('ar-u-ca-islamic-umalqura-nu-latn', { month: 'long', year: 'numeric' })
      .format(new Date(first.getFullYear(), first.getMonth(), 15))
      .replace(/\s?هـ$/, '');
  } catch {}
  const litCount = cells.filter((k) => k && status[k] === 'lit').length;

  const move = (d: number) => {
    feedback.selection();
    setPicked(null);
    setOffset((o) => Math.max(0, o + d));
  };

  const pickedDay = picked ? getDay(picked) : null;
  const pickedStatus: DayStatus | undefined = picked ? (status[picked] ?? (pickedDay && pickedDay.total > 0 ? 'missed' : undefined)) : undefined;

  return (
    <View>
      <View style={styles.head}>
        <Arrow dir="left" disabled={!canGoBack} onPress={() => move(1)} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.title}>{monthName}</Text>
          {hijri ? <Text style={styles.hijri}>{hijri}</Text> : null}
        </View>
        <Arrow dir="right" disabled={offset === 0} onPress={() => move(-1)} />
      </View>
      <Text style={styles.count}>
        {litCount} lit {litCount === 1 ? 'day' : 'days'}
      </Text>
      <View style={styles.grid}>
        {WEEK_HEAD.map((d, i) => (
          <Text key={`h${i}`} style={styles.weekday}>
            {d}
          </Text>
        ))}
        {cells.map((key, i) => {
          if (!key) return <View key={`e${i}`} style={styles.cell} />;
          const day = getDay(key);
          const st = status[key];
          const lit = st === 'lit';
          const covered = st === 'shield' || st === 'repaired';
          const future = key > today;
          const ratio = Math.min(1, day.total / day.goal);
          const isPicked = key === picked;
          return (
            <Pressable
              key={key}
              style={styles.cell}
              disabled={future}
              onPress={() => {
                feedback.selection();
                setPicked(isPicked ? null : key);
              }}
              accessibilityRole="button"
              accessibilityLabel={`${keyToDate(key).toDateString()}, ${day.total} salawat`}>
              <View
                style={[
                  styles.dot,
                  !lit && day.total > 0 && { backgroundColor: hexA(colors.saffron, 0.12 + ratio * 0.35) },
                  lit && styles.dotLit,
                  key === today && styles.dotToday,
                  isPicked && styles.dotPicked,
                  future && { opacity: 0.35 },
                ]}>
                {covered ? (
                  <ShieldIcon size={14} color={colors.saffron} />
                ) : (
                  <Text style={[styles.num, lit && styles.numLit]}>{keyToDate(key).getDate()}</Text>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>

      {picked && pickedDay ? (
        <View style={styles.detail}>
          <Text style={styles.detailDate}>{keyToDate(picked).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
          <Text style={styles.detailText}>
            {pickedDay.total.toLocaleString('en-US')} of {pickedDay.goal.toLocaleString('en-US')} salawat
            {pickedStatus ? ` · ${STATUS_LABEL[pickedStatus]}` : ''}
          </Text>
        </View>
      ) : (
        <View style={styles.legend}>
          <View style={[styles.legendDot, styles.dotLit]} />
          <Text style={styles.legendText}>Lit</Text>
          <View style={[styles.legendDot, { backgroundColor: hexA(colors.saffron, 0.3) }]} />
          <Text style={styles.legendText}>Partly</Text>
          <ShieldIcon size={12} color={colors.saffron} />
          <Text style={styles.legendText}>Shield or repaired</Text>
        </View>
      )}
    </View>
  );
}

function Arrow({ dir, disabled, onPress }: { dir: 'left' | 'right'; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={dir === 'left' ? 'Previous month' : 'Next month'} style={[styles.arrow, disabled && { opacity: 0.25 }]} hitSlop={6}>
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Path d={dir === 'left' ? 'm15 6-6 6 6 6' : 'm9 6 6 6-6 6'} />
      </Svg>
    </Pressable>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
    head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    title: { fontFamily: fonts.display, fontSize: 24, color: colors.ink },
    hijri: { fontFamily: fonts.arabic, fontSize: 14, color: colors.terracotta },
    count: { fontFamily: fonts.uiMedium, fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 2, marginBottom: spacing.md },
    arrow: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.cardBorder, alignItems: 'center', justifyContent: 'center' },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    weekday: { width: `${100 / 7}%`, textAlign: 'center', fontFamily: fonts.uiSemi, fontSize: 11, color: colors.muted, marginBottom: 6 },
    cell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 3 },
    dot: { flex: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.plaster },
    dotLit: { backgroundColor: colors.lightGold },
    dotToday: { borderWidth: 2, borderColor: colors.zelligeGreen },
    dotPicked: { borderWidth: 2, borderColor: colors.saffron },
    num: { fontFamily: fonts.uiMedium, fontSize: 13, color: colors.muted },
    numLit: { color: '#1F1A10', fontFamily: fonts.uiSemi },
    legend: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md, flexWrap: 'wrap' },
    legendDot: { width: 12, height: 12, borderRadius: 4 },
    legendText: { fontFamily: fonts.ui, fontSize: 12, color: colors.muted, marginRight: 8 },
    detail: { marginTop: spacing.md, backgroundColor: colors.highlight, borderRadius: 12, padding: spacing.md, alignItems: 'center' },
    detailDate: { fontFamily: fonts.uiSemi, fontSize: 14, color: colors.ink },
    detailText: { fontFamily: fonts.ui, fontSize: 13, color: colors.muted, marginTop: 2 },
  }),
);

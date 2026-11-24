/** Stats: totals per week / month / year, streak cards and a month heatmap. */
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Card, Lantern, PlasterPattern, ScreenHeader, Segmented, ShieldIcon, ZelligeBand } from '@/components';
import { keyToDate, toDayKey } from '@/lib/salliDay';
import { useToday } from '@/store/counts';
import { getDay } from '@/store/days';
import { periodStats, type Bar, type Period } from '@/store/stats';
import { LEVELS } from '@/store/streaks';
import { colors, fonts, radius, spacing } from '@/theme';

const fmt = (n: number) => n.toLocaleString('en-US');
const PERIOD_LABEL: Record<Period, string> = { week: 'Last 7 days', month: 'Last 30 days', year: 'Last 12 months' };

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const today = useToday();
  const [period, setPeriod] = useState<Period>('week');
  // Recompute when counts change (today.total) or the day rolls over.
  const stats = useMemo(() => periodStats(period, today.date), [period, today.date, today.total]); // eslint-disable-line react-hooks/exhaustive-deps
  const { streak } = today;
  const levelName = LEVELS.find((l) => l.level === streak.level)!.name;

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}>
      <ScreenHeader title="Stats" arabic="إحصاءات" />

      <Segmented
        options={[
          { value: 'week', label: 'Week' },
          { value: 'month', label: 'Month' },
          { value: 'year', label: 'Year' },
        ]}
        value={period}
        onChange={setPeriod}
      />

      {/* Green tiled panel */}
      <View style={styles.panel}>
        <PlasterPattern color={colors.lightGold} opacity={0.1} cell={40} />
        <View style={styles.panelBody}>
          <Text style={styles.panelLabel}>{PERIOD_LABEL[period]}</Text>
          <View style={styles.totalRow}>
            <Text style={styles.total}>{fmt(stats.total)}</Text>
            {stats.change !== null && (
              <View style={[styles.badge, stats.change < 0 && styles.badgeDown]}>
                <Text style={styles.badgeText}>
                  {stats.change >= 0 ? '▲' : '▼'} {Math.abs(stats.change)}%
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.panelMeta}>
            salawat · {stats.litDays} lit {stats.litDays === 1 ? 'day' : 'days'}
          </Text>
          <ArchBars bars={stats.bars} thin={period === 'month'} />
        </View>
        <ZelligeBand height={16} />
      </View>

      {/* Streak cards */}
      <View style={styles.cardsRow}>
        <Card style={styles.half}>
          <View style={styles.streakHead}>
            <Lantern size={34} lit={today.lit} level={streak.level} glow={false} />
            <View>
              <Text style={styles.streakNum}>{streak.current}</Text>
              <Text style={styles.streakLabel}>current streak</Text>
            </View>
          </View>
          <Text style={styles.streakMeta}>{levelName} lantern</Text>
        </Card>
        <Card style={styles.half}>
          <View style={styles.streakHead}>
            <Lantern size={34} lit level={streak.level} glow={false} />
            <View>
              <Text style={styles.streakNum}>{streak.best}</Text>
              <Text style={styles.streakLabel}>best streak</Text>
            </View>
          </View>
          <View style={styles.shieldRow}>
            <ShieldIcon size={14} color={colors.saffron} />
            <Text style={styles.streakMeta}>
              {streak.shields} {streak.shields === 1 ? 'shield' : 'shields'}
            </Text>
          </View>
        </Card>
      </View>

      <MonthHeatmap today={today.date} status={streak.status} />
    </ScrollView>
  );
}

// ---------- arch-shaped bars ----------

function ArchBars({ bars, thin }: { bars: Bar[]; thin: boolean }) {
  const [w, setW] = useState(0);
  const H = 120;
  const max = Math.max(1, ...bars.map((b) => b.total));
  const slot = w / bars.length;
  const bw = Math.max(4, slot * (thin ? 0.62 : 0.56));
  const arch = (x: number, h: number) => {
    const r = bw / 2;
    const top = H - Math.max(h, bw);
    return `M${x},${H} V${top + r} A${r},${r} 0 0 1 ${x + bw},${top + r} V${H} Z`;
  };
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ marginTop: spacing.md }}>
      {w > 0 && (
        <>
          <Svg width={w} height={H}>
            {bars.map((b, i) => {
              const x = i * slot + (slot - bw) / 2;
              return (
                <Path key={`t${b.key}`} d={arch(x, H)} fill={colors.card} opacity={0.08} />
              );
            })}
            {bars.map((b, i) => {
              if (b.total === 0) return null;
              const x = i * slot + (slot - bw) / 2;
              const h = (b.total / max) * (H - 4);
              return <Path key={b.key} d={arch(x, h)} fill={b.current ? colors.lightGold : colors.card} opacity={b.current ? 1 : 0.7} />;
            })}
          </Svg>
          <View style={styles.barLabels}>
            {bars.map((b) => (
              <Text key={b.key} style={[styles.barLabel, { width: slot }, b.current && { color: colors.lightGold }]} numberOfLines={1}>
                {b.label}
              </Text>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

// ---------- month heatmap ----------

const WEEK_HEAD = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function MonthHeatmap({ today, status }: { today: string; status: Record<string, string> }) {
  const t = keyToDate(today);
  const first = new Date(t.getFullYear(), t.getMonth(), 1, 12);
  const daysInMonth = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: first.getDay() }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => toDayKey(new Date(t.getFullYear(), t.getMonth(), i + 1, 12))),
  ];
  while (cells.length % 7) cells.push(null);
  const monthName = first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  let hijri = '';
  try {
    hijri = new Intl.DateTimeFormat('ar-u-ca-islamic-umalqura-nu-latn', { month: 'long', year: 'numeric' })
      .format(t)
      .replace(/\s?هـ$/, '');
  } catch {}
  const litCount = cells.filter((k) => k && status[k] === 'lit').length;

  return (
    <Card>
      <View style={styles.calHead}>
        <View>
          <Text style={styles.calTitle}>{monthName}</Text>
          {hijri ? <Text style={styles.calHijri}>{hijri}</Text> : null}
        </View>
        <Text style={styles.calCount}>
          {litCount} lit {litCount === 1 ? 'day' : 'days'}
        </Text>
      </View>
      <View style={styles.calGrid}>
        {WEEK_HEAD.map((d, i) => (
          <Text key={`h${i}`} style={styles.calWeekday}>
            {d}
          </Text>
        ))}
        {cells.map((key, i) => {
          if (!key) return <View key={`e${i}`} style={styles.calCell} />;
          const day = getDay(key);
          const lit = status[key] === 'lit';
          const shield = status[key] === 'shield';
          const future = key > today;
          const ratio = Math.min(1, day.total / day.goal);
          return (
            <View key={key} style={styles.calCell}>
              <View
                style={[
                  styles.calDot,
                  !lit && day.total > 0 && { backgroundColor: `rgba(201,142,43,${0.12 + ratio * 0.35})` },
                  lit && styles.calDotLit,
                  key === today && styles.calDotToday,
                  future && { opacity: 0.35 },
                ]}>
                {shield ? (
                  <ShieldIcon size={14} color={colors.saffron} />
                ) : (
                  <Text style={[styles.calNum, lit && styles.calNumLit]}>{keyToDate(key).getDate()}</Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
      <View style={styles.legend}>
        <View style={[styles.legendDot, styles.calDotLit]} />
        <Text style={styles.legendText}>Lit</Text>
        <View style={[styles.legendDot, { backgroundColor: 'rgba(201,142,43,0.3)' }]} />
        <Text style={styles.legendText}>Partly</Text>
        <ShieldIcon size={12} color={colors.saffron} />
        <Text style={styles.legendText}>Shield</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingBottom: 32, gap: spacing.lg, maxWidth: 520, width: '100%', alignSelf: 'center' },
  panel: { backgroundColor: colors.zelligeGreen, borderRadius: radius.card, overflow: 'hidden', borderWidth: 1, borderColor: colors.saffron },
  panelBody: { padding: spacing.lg },
  panelLabel: { fontFamily: fonts.uiSemi, fontSize: 12, color: colors.lightGold, textTransform: 'uppercase', letterSpacing: 0.8 },
  totalRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: 2 },
  total: { fontFamily: fonts.display, fontVariant: ['lining-nums'], fontSize: 52, lineHeight: 58, color: colors.card },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: 'rgba(233,184,96,0.22)' },
  badgeDown: { backgroundColor: 'rgba(251,246,236,0.14)' },
  badgeText: { fontFamily: fonts.uiSemi, fontSize: 12, color: colors.lightGold },
  panelMeta: { fontFamily: fonts.ui, fontSize: 13, color: 'rgba(251,246,236,0.8)' },
  barLabels: { flexDirection: 'row', marginTop: 6 },
  barLabel: { fontFamily: fonts.uiMedium, fontSize: 11, color: 'rgba(251,246,236,0.7)', textAlign: 'center' },

  cardsRow: { flexDirection: 'row', gap: spacing.md },
  half: { flex: 1 },
  streakHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  streakNum: { fontFamily: fonts.display, fontVariant: ['lining-nums'], fontSize: 34, lineHeight: 38, color: colors.ink },
  streakLabel: { fontFamily: fonts.uiMedium, fontSize: 12, color: colors.muted },
  streakMeta: { fontFamily: fonts.ui, fontSize: 12, color: colors.terracotta, marginTop: spacing.sm },
  shieldRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm - 2 },

  calHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  calTitle: { fontFamily: fonts.display, fontSize: 24, color: colors.ink },
  calHijri: { fontFamily: 'Amiri_400Regular', fontSize: 14, color: colors.terracotta, textAlign: 'left' },
  calCount: { fontFamily: fonts.uiMedium, fontSize: 12, color: colors.muted, marginTop: 8 },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calWeekday: { width: `${100 / 7}%`, textAlign: 'center', fontFamily: fonts.uiSemi, fontSize: 11, color: colors.muted, marginBottom: 6 },
  calCell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 3 },
  calDot: { flex: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.plaster },
  calDotLit: { backgroundColor: colors.lightGold },
  calDotToday: { borderWidth: 2, borderColor: colors.zelligeGreen },
  calNum: { fontFamily: fonts.uiMedium, fontSize: 13, color: colors.muted },
  calNumLit: { color: colors.deepGreen, fontFamily: fonts.uiSemi },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md },
  legendDot: { width: 12, height: 12, borderRadius: 4 },
  legendText: { fontFamily: fonts.ui, fontSize: 12, color: colors.muted, marginRight: 8 },
});

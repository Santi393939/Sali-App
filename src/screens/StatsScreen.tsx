/** Stats: totals per week / month / year, streak cards and a month heatmap. */
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Card, Lantern, MonthCalendar, PlasterPattern, ScreenHeader, Segmented, ShieldIcon, ZelligeBand } from '@/components';
import { useTabs } from '@/components/tabs';
import { useToday } from '@/store/counts';
import { periodStats, type Bar, type Period } from '@/store/stats';
import { LEVELS } from '@/store/streaks';
import { colors, fonts, radius, spacing, themedStyles } from '@/theme';
import { isRTL, t } from '@/lib/i18n';

const fmt = (n: number) => n.toLocaleString('en-US');
const PERIOD_LABEL = (): Record<Period, string> => ({ week: t('Last 7 days'), month: t('Last 30 days'), year: t('Last 12 months') });

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const today = useToday();
  const [period, setPeriod] = useState<Period>('week');
  // `today.version` changes on every count, so the numbers stay live.
  const stats = periodStats(period, today.date, today.version);
  const { streak } = today;
  const levelName = LEVELS.find((l) => l.level === streak.level)!.name;
  const tabs = useTabs();
  const avg30 = Math.round(periodStats('month', today.date, today.version).total / 30);

  if (today.lifetime === 0) {
    return (
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}>
        <ScreenHeader title={t('Stats')} arabic="إحصاءات" />
        <View style={styles.empty}>
          <PlasterPattern />
          <View style={styles.emptyBody}>
            <ArchBarsPreview />
            <Text style={styles.emptyTitle}>{t('Your story starts with one')}</Text>
            <Text style={styles.emptyText}>{t('Count your first salawat and your days, streaks and totals will fill in here.')}</Text>
            <Pressable onPress={() => tabs.goTo(0)} accessibilityRole="button" style={styles.emptyBtn}>
              <Text style={styles.emptyBtnText}>{t('Start on Today')}</Text>
            </Pressable>
          </View>
          <ZelligeBand height={16} />
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}>
      <ScreenHeader title={t('Stats')} arabic="إحصاءات" />

      <Segmented
        options={[
          { value: 'week', label: t('Week') },
          { value: 'month', label: t('Month') },
          { value: 'year', label: t('Year') },
        ]}
        value={period}
        onChange={setPeriod}
      />

      {/* Green tiled panel */}
      <View style={styles.panel}>
        <PlasterPattern color={colors.lightGold} opacity={0.1} cell={40} />
        <View style={styles.panelBody}>
          <Text style={styles.panelLabel}>{PERIOD_LABEL()[period]}</Text>
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
            {t(stats.litDays === 1 ? 'salawat · {n} lit day' : 'salawat · {n} lit days', { n: stats.litDays })}
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
              <Text style={styles.streakLabel}>{t('current streak')}</Text>
            </View>
          </View>
          <Text style={styles.streakMeta}>{t('{name} lantern', { name: levelName })}</Text>
        </Card>
        <Card style={styles.half}>
          <View style={styles.streakHead}>
            <Lantern size={34} lit level={streak.level} glow={false} />
            <View>
              <Text style={styles.streakNum}>{streak.best}</Text>
              <Text style={styles.streakLabel}>{t('best streak')}</Text>
            </View>
          </View>
          <View style={styles.shieldRow}>
            <ShieldIcon size={14} color={colors.saffron} />
            <Text style={styles.streakMeta}>
              {t(streak.shields === 1 ? '{n} shield' : '{n} shields', { n: streak.shields })}
            </Text>
          </View>
        </Card>
      </View>

      {/* At a glance */}
      <View style={styles.tiles}>
        <Tile label={t('All time')} value={fmt(today.lifetime)} />
        <Tile label={t('Daily average')} value={fmt(avg30)} sub={t('last 30 days')} />
        <Tile label={t('Quest days')} value={String(streak.questDays)} sub={t(streak.shields === 1 ? '{n} shield ready' : '{n} shields ready', { n: streak.shields })} />
      </View>

      <Card>
        <MonthCalendar today={today.date} status={streak.status} version={today.version} />
      </Card>
    </ScrollView>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.tileLabel}>{label}</Text>
      {sub ? <Text style={styles.tileSub}>{sub}</Text> : null}
    </View>
  );
}

/** Faint arch bars for the empty state. */
function ArchBarsPreview() {
  const hs = [40, 64, 52, 80, 58, 72, 30];
  return (
    <Svg width={170} height={90}>
      {hs.map((h, i) => {
        const x = 8 + i * 23;
        const w = 14;
        return <Path key={i} d={`M${x},90 V${90 - h + 7} A7,7 0 0 1 ${x + w},${90 - h + 7} V90 Z`} fill={i === 6 ? colors.lightGold : colors.zelligeGreen} opacity={i === 6 ? 1 : 0.25} />;
      })}
    </Svg>
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
                <Path key={`t${b.key}`} d={arch(x, H)} fill={colors.onPrimary} opacity={0.08} />
              );
            })}
            {bars.map((b, i) => {
              if (b.total === 0) return null;
              const x = i * slot + (slot - bw) / 2;
              const h = (b.total / max) * (H - 4);
              return <Path key={b.key} d={arch(x, h)} fill={b.current ? colors.lightGold : colors.onPrimary} opacity={b.current ? 1 : 0.7} />;
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

const styles = themedStyles(() =>
  StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingBottom: 32, gap: spacing.lg, maxWidth: 520, width: '100%', alignSelf: 'center' },
  tiles: { flexDirection: 'row', gap: spacing.sm },
  tile: { flex: 1, backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.cardBorder, padding: spacing.md, alignItems: 'center' },
  tileValue: { fontFamily: fonts.display, fontVariant: ['lining-nums'], fontSize: 26, color: colors.ink },
  tileLabel: { fontFamily: fonts.uiSemi, fontSize: 11, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.6, textAlign: 'center' },
  tileSub: { fontFamily: fonts.ui, fontSize: 11, color: colors.terracotta, marginTop: 2, textAlign: 'center' },
  empty: { backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.cardBorder, overflow: 'hidden' },
  emptyBody: { alignItems: 'center', padding: spacing.xl, gap: spacing.sm },
  emptyTitle: { fontFamily: fonts.display, fontSize: 26, color: colors.ink, textAlign: 'center' },
  emptyText: { fontFamily: fonts.ui, fontSize: 15, lineHeight: 22, color: colors.muted, textAlign: 'center', maxWidth: 300 },
  emptyBtn: { marginTop: spacing.sm, height: 48, paddingHorizontal: spacing.xl, borderRadius: radius.button, backgroundColor: colors.zelligeGreen, alignItems: 'center', justifyContent: 'center' },
  emptyBtnText: { fontFamily: fonts.uiSemi, fontSize: 15, color: colors.onPrimary },
  panel: { backgroundColor: colors.zelligeGreen, borderRadius: radius.card, overflow: 'hidden', borderWidth: 1, borderColor: colors.saffron },
  panelBody: { padding: spacing.lg },
  panelLabel: { fontFamily: fonts.uiSemi, fontSize: 12, color: colors.lightGold, textTransform: 'uppercase', letterSpacing: 0.8 },
  totalRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: 2 },
  total: { fontFamily: fonts.display, fontVariant: ['lining-nums'], fontSize: 52, lineHeight: 58, color: colors.onPrimary },
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
  calHijri: { fontFamily: 'Amiri_400Regular', fontSize: 14, color: colors.terracotta, textAlign: isRTL() ? 'right' : 'left' },
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
}),
);

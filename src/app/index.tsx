/**
 * Prompt 1 sample screen: a static Today layout built only from the design
 * pieces, followed by a small design kit. Nothing counts yet.
 */
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import {
  Card,
  EightPointStar,
  HorseshoeArch,
  Lantern,
  Logo,
  PlasterPattern,
  PrimaryButton,
  ProgressStar,
  ZelligeBand,
} from '@/components';
import { hijriDateArabic } from '@/lib/hijri';
import { colors, fonts, radius, spacing, type } from '@/theme';

const SAMPLE = { count: 412, goal: 1000, streak: 12, groupTotal: 6200, groupGoal: 10000 };

const fmt = (n: number) => n.toLocaleString('en-US');

export default function SampleScreen() {
  const insets = useSafeAreaInsets();
  const left = SAMPLE.goal - SAMPLE.count;

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + 40 }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.hijri}>{hijriDateArabic()}</Text>
          <Text style={styles.title}>Today</Text>
        </View>
        <View style={styles.streakPill}>
          <Lantern size={20} />
          <Text style={styles.streakPillText}>{SAMPLE.streak}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Reminders" style={styles.bell}>
          <BellIcon />
        </Pressable>
      </View>

      {/* Hero */}
      <View style={styles.hero}>
        <PlasterPattern />
        <View style={styles.heroRow}>
          <View style={styles.heroSide}>
            <Lantern size={46} />
            <Text style={styles.sideNumber}>{SAMPLE.streak}</Text>
            <Text style={styles.sideLabel}>day streak</Text>
            <Text style={styles.sideStatus}>Light it today</Text>
          </View>

          <HorseshoeArch width={170} height={214}>
            <View style={{ marginTop: 18 }}>
              <ProgressStar size={132} progress={SAMPLE.count / SAMPLE.goal}>
                <Text style={styles.count}>{fmt(SAMPLE.count)}</Text>
                <Text style={styles.countOf}>of {fmt(SAMPLE.goal)}</Text>
              </ProgressStar>
            </View>
          </HorseshoeArch>

          <View style={styles.heroSide}>
            <Text style={[styles.sideNumber, { color: colors.terracotta }]}>{fmt(left)}</Text>
            <Text style={styles.sideLabel}>left today</Text>
          </View>
        </View>
        <Text style={styles.salawat}>اللهم صل وسلم على نبينا محمد</Text>
        <ZelligeBand height={22} />
      </View>

      {/* Quick add */}
      <View style={styles.quickRow}>
        <PrimaryButton label="+100" style={styles.quickBtn} />
        <PrimaryButton label="+300" style={styles.quickBtn} />
        <PrimaryButton label="+1,000" style={styles.quickBtn} />
        <PrimaryButton label="Other" variant="secondary" style={styles.quickBtn} />
      </View>

      {/* Family Jumu'ah goal */}
      <Card band>
        <Text style={styles.cardEyebrow}>Family Jumu&apos;ah goal</Text>
        <View style={styles.goalRow}>
          <Text style={styles.goalNumber}>{fmt(SAMPLE.groupTotal)}</Text>
          <Text style={styles.goalOf}> / {fmt(SAMPLE.groupGoal)}</Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${(SAMPLE.groupTotal / SAMPLE.groupGoal) * 100}%` }]} />
        </View>
        <Text style={styles.cardMeta}>Ends Friday at Maghrib</Text>
      </Card>

      {/* Design kit */}
      <Text style={styles.sectionTitle}>Design kit</Text>

      <Card>
        <Text style={styles.cardEyebrow}>Logo and stars</Text>
        <View style={styles.kitRow}>
          <Logo size={96} />
          <EightPointStar size={56} fill={colors.cobalt} />
          <EightPointStar size={56} fill={colors.zelligeGreen} stroke={colors.saffron} strokeWidth={2} />
          <EightPointStar size={40} fill={colors.saffron} rotation={22.5} />
        </View>
      </Card>

      <Card>
        <Text style={styles.cardEyebrow}>Zellige band, 14 / 20 / 28 px</Text>
        <View style={{ gap: spacing.md, marginTop: spacing.sm }}>
          <ZelligeBand height={14} />
          <ZelligeBand height={20} />
          <ZelligeBand height={28} />
        </View>
      </Card>

      <Card>
        <Text style={styles.cardEyebrow}>Lantern: unlit / lit (placeholder)</Text>
        <View style={styles.kitRow}>
          <Lantern size={64} />
          <Lantern size={64} lit />
          <HorseshoeArch width={70} height={90} frameWidth={1.5} />
        </View>
      </Card>

      <Card>
        <Text style={styles.cardEyebrow}>Colours</Text>
        <View style={styles.swatches}>
          {(Object.entries(colors) as [string, string][]).map(([name, hex]) => (
            <View key={name} style={styles.swatch}>
              <View style={[styles.swatchChip, { backgroundColor: hex }]} />
              <Text style={styles.swatchName}>{name}</Text>
              <Text style={styles.swatchHex}>{hex}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <Text style={styles.cardEyebrow}>Type</Text>
        <Text style={styles.title}>Cormorant Garamond</Text>
        <Text style={[styles.salawat, { textAlign: 'left', writingDirection: 'rtl' }]}>أميري — صلِّ على النبي</Text>
        <Text style={styles.body}>Inter 15 — interface text. Small text never goes below 11.</Text>
        <View style={{ marginTop: spacing.md }}>
          <PrimaryButton label="Primary button" />
        </View>
      </Card>
    </ScrollView>
  );
}

function BellIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.ink} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16Z" />
      <Path d="M10 20.5a2 2 0 0 0 4 0" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.plaster },
  content: { paddingHorizontal: spacing.lg, gap: spacing.lg, maxWidth: 520, width: '100%', alignSelf: 'center' },

  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  hijri: { fontFamily: fonts.arabic, fontSize: 15, color: colors.terracotta, textAlign: 'left' },
  title: { fontFamily: fonts.display, fontSize: type.screenTitle, color: colors.ink, lineHeight: 40 },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  streakPillText: { fontFamily: fonts.uiSemi, fontSize: 15, color: colors.muted },
  bell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },

  hero: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  heroRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: 20, paddingHorizontal: 10 },
  heroSide: { flex: 1, alignItems: 'center', paddingBottom: 18 },
  sideNumber: { fontFamily: fonts.display, fontVariant: ['lining-nums'], fontSize: 34, color: colors.ink, lineHeight: 38, marginTop: 4 },
  sideLabel: { fontFamily: fonts.uiMedium, fontSize: 12, color: colors.muted },
  sideStatus: { fontFamily: fonts.ui, fontSize: 11, color: colors.terracotta, marginTop: 6, textAlign: 'center' },
  count: { fontFamily: fonts.display, fontVariant: ['lining-nums'], fontSize: 40, color: colors.card, lineHeight: 44 },
  countOf: { fontFamily: fonts.uiMedium, fontSize: 12, color: colors.lightGold },
  salawat: {
    fontFamily: fonts.arabic,
    fontSize: 20,
    lineHeight: 36,
    color: colors.terracotta,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },

  quickRow: { flexDirection: 'row', gap: spacing.sm },
  quickBtn: { flex: 1, paddingHorizontal: 4 },

  cardEyebrow: { fontFamily: fonts.uiSemi, fontSize: 12, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.8 },
  goalRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: spacing.sm },
  goalNumber: { fontFamily: fonts.display, fontVariant: ['lining-nums'], fontSize: 34, color: colors.ink },
  goalOf: { fontFamily: fonts.display, fontVariant: ['lining-nums'], fontSize: 22, color: colors.terracotta },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.plaster, marginTop: spacing.sm, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: colors.saffron },
  cardMeta: { fontFamily: fonts.ui, fontSize: 13, color: colors.muted, marginTop: spacing.sm },

  sectionTitle: { fontFamily: fonts.display, fontSize: 28, color: colors.ink, marginTop: spacing.lg },
  kitRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginTop: spacing.md, flexWrap: 'wrap', gap: spacing.md },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.md },
  swatch: { width: '30%', minWidth: 90 },
  swatchChip: { height: 40, borderRadius: 10, borderWidth: 1, borderColor: colors.cardBorder },
  swatchName: { fontFamily: fonts.uiMedium, fontSize: 12, color: colors.ink, marginTop: 4 },
  swatchHex: { fontFamily: fonts.ui, fontSize: 11, color: colors.muted },
  body: { fontFamily: fonts.ui, fontSize: type.body, color: colors.ink },
});

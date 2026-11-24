/**
 * Today: the daily counter. Counts are saved on the phone instantly (MMKV).
 * Every add plays its motion, haptic and sound together (see CounterHero).
 */
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import {
  Card,
  CounterHero,
  Lantern,
  NumberPadSheet,
  PlasterPattern,
  PrimaryButton,
  TodayLog,
  ZelligeBand,
  type AddEvent,
} from '@/components';
import { addKind, feedback } from '@/lib/feedback';
import { hijriDateArabic } from '@/lib/hijri';
import { addSalawat, useToday } from '@/store/counts';
import { colors, fonts, radius, spacing, type } from '@/theme';

/** Sample group numbers until Groups are built (Prompt 8). */
const SAMPLE_GROUP = { name: 'Family', total: 6200, goal: 10000 };

const fmt = (n: number) => n.toLocaleString('en-US');

/** Wait for the number pad to slide away before celebrating. */
const PAD_CLOSE_DELAY = 220;

let nextEventId = 1;

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const today = useToday();
  const [padOpen, setPadOpen] = useState(false);
  const [event, setEvent] = useState<AddEvent>();

  /** Save instantly, then play motion, haptic and sound together. */
  const add = (amount: number, source: 'tap' | 'quick' | 'pad') => {
    addSalawat(amount, source);
    const kind = addKind(amount, source);
    const delay = source === 'pad' ? PAD_CLOSE_DELAY : 0;
    setEvent({ id: nextEventId++, amount, kind, delay });
    if (delay) setTimeout(() => feedback.add(kind), delay);
    else feedback.add(kind);
  };

  const openPad = () => {
    feedback.sheetOpen();
    setPadOpen(true);
  };

  return (
    <View style={styles.page}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + 40 }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.hijri}>{hijriDateArabic()}</Text>
            <Text style={styles.title}>Today</Text>
          </View>
          <View
            style={[styles.streakPill, today.lit && styles.streakPillLit]}
            accessibilityLabel={`${today.streak} day streak${today.lit ? ', lit today' : ''}`}>
            <Lantern size={20} lit={today.lit} />
            <Text style={[styles.streakPillText, today.lit && styles.streakPillTextLit]}>{today.streak}</Text>
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
              <Lantern size={46} lit={today.lit} />
              <Text style={styles.sideNumber}>{today.streak}</Text>
              <Text style={styles.sideLabel}>day streak</Text>
              <Text style={[styles.sideStatus, today.lit && { color: colors.zelligeGreen }]}>
                {today.lit ? 'Lit today' : 'Light it today'}
              </Text>
            </View>

            <CounterHero total={today.total} goal={today.goal} event={event} onTap={() => add(1, 'tap')} />

            <View style={styles.heroSide}>
              {today.lit ? (
                <>
                  <Text style={[styles.sideNumber, { color: colors.zelligeGreen }]}>✓</Text>
                  <Text style={styles.sideLabel}>goal met</Text>
                </>
              ) : (
                <>
                  <Text style={[styles.sideNumber, { color: colors.terracotta }]}>{fmt(today.left)}</Text>
                  <Text style={styles.sideLabel}>left today</Text>
                </>
              )}
            </View>
          </View>
          <Text style={styles.tapHint}>Tap the arch to count</Text>
          <Text style={styles.salawat}>اللهم صل وسلم على نبينا محمد</Text>
          <ZelligeBand height={22} />
        </View>

        {/* Quick add */}
        <View style={styles.quickRow}>
          <PrimaryButton label="+100" style={styles.quickBtn} onPress={() => add(100, 'quick')} />
          <PrimaryButton label="+300" style={styles.quickBtn} onPress={() => add(300, 'quick')} />
          <PrimaryButton label="+1,000" style={styles.quickBtn} onPress={() => add(1000, 'quick')} />
          <PrimaryButton label="Other" variant="secondary" style={styles.quickBtn} onPress={openPad} />
        </View>

        {/* Family Jumu'ah goal (sample until Groups) */}
        <Pressable accessibilityRole="button" accessibilityLabel="Open group">
          <Card band>
            <Text style={styles.cardEyebrow}>{SAMPLE_GROUP.name} Jumu&apos;ah goal</Text>
            <View style={styles.goalRow}>
              <Text style={styles.goalNumber}>{fmt(SAMPLE_GROUP.total)}</Text>
              <Text style={styles.goalOf}> / {fmt(SAMPLE_GROUP.goal)}</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${(SAMPLE_GROUP.total / SAMPLE_GROUP.goal) * 100}%` }]} />
            </View>
            <Text style={styles.cardMeta}>Ends Friday at Maghrib</Text>
          </Card>
        </Pressable>

        <TodayLog entries={today.entries} />
      </ScrollView>

      <NumberPadSheet
        visible={padOpen}
        onClose={() => setPadOpen(false)}
        onAdd={(n) => {
          setPadOpen(false);
          add(n, 'pad');
        }}
      />
    </View>
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
  streakPillLit: { borderColor: colors.saffron, backgroundColor: '#FBEFD6' },
  streakPillText: { fontFamily: fonts.uiSemi, fontSize: 15, color: colors.muted },
  streakPillTextLit: { color: colors.saffron },
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
  tapHint: { fontFamily: fonts.ui, fontSize: 11, color: colors.muted, textAlign: 'center', marginTop: spacing.sm },
  salawat: {
    fontFamily: fonts.arabic,
    fontSize: 20,
    lineHeight: 36,
    color: colors.terracotta,
    textAlign: 'center',
    paddingBottom: spacing.md,
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
});

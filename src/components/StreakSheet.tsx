/** Opened from the streak pill: streak, best, shields, next goal and the calendar. */
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import type { TodaySnapshot } from '@/store/counts';
import { LEVELS, QUEST_DAYS_PER_SHIELD, REPAIR_MULTIPLIER } from '@/store/streaks';
import { colors, fonts, radius, spacing, themedStyles } from '@/theme';

import { Lantern } from './Lantern';
import { MonthCalendar } from './MonthCalendar';
import { PrimaryButton } from './PrimaryButton';
import { ShieldIcon } from './StreakTakeover';
import { t } from '@/lib/i18n';

type Props = { visible: boolean; today: TodaySnapshot; onClose: () => void; onShare?: () => void };

export function StreakSheet({ visible, today, onClose, onShare }: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(visible);
  if (visible && !mounted) setMounted(true);
  const y = useSharedValue(height);
  const shade = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      y.set(reduce ? 0 : withSpring(0, { damping: 22, stiffness: 300, mass: 0.85 }));
      shade.set(withTiming(1, { duration: 200 }));
    } else {
      shade.set(withTiming(0, { duration: 180 }));
      y.set(
        withTiming(reduce ? 0 : height, { duration: reduce ? 0 : 220, easing: Easing.in(Easing.quad) }, (done) => {
          if (done) scheduleOnRN(setMounted, false);
        }),
      );
    }
  }, [visible, reduce, y, shade, height]);

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const shadeStyle = useAnimatedStyle(() => ({ opacity: shade.value }));

  const { streak, goalBar } = today;
  const level = LEVELS.find((l) => l.level === streak.level)!;
  const nextLevel = [...LEVELS].reverse().find((l) => l.from > streak.current);
  const towardShield = streak.questDays % QUEST_DAYS_PER_SHIELD;

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, shadeStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t('Close')} />
        </Animated.View>
        <Animated.View style={[styles.sheet, { maxHeight: height - insets.top - 24 }, sheetStyle]}>
          <View style={styles.grabber} />
          <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing.lg, gap: spacing.lg }} showsVerticalScrollIndicator={false}>
            {/* Streak hero */}
            <View style={styles.hero}>
              <Lantern size={84} lit={today.lit} level={streak.level} />
              <View style={{ flex: 1 }}>
                <Text style={styles.big}>{streak.current}</Text>
                <Text style={styles.bigLabel}>{t('day streak')}</Text>
                <Text style={styles.status}>{today.lit ? t('Lit today · ما شاء الله') : t('Your lantern is waiting today')}</Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <Stat value={String(streak.best)} label={t('Best streak')} />
              <Stat value={String(streak.shields)} label={streak.shields === 1 ? t('Shield') : t('Shields')} icon />
              <Stat value={level.name} label={t('Lantern')} small />
            </View>

            {/* Next goal */}
            <View style={styles.box}>
              <View style={styles.boxHead}>
                <Text style={styles.boxTitle}>{goalBar.reached ? t('{n}-day goal reached!', { n: goalBar.next }) : t('Next goal: {n} days', { n: goalBar.next })}</Text>
                {!goalBar.reached && <Text style={styles.boxSub}>{t('{n} to go', { n: goalBar.toGo })}</Text>}
              </View>
              <View style={styles.segments}>
                {Array.from({ length: goalBar.segments }, (_, i) => (
                  <View key={i} style={[styles.segment, i < goalBar.filled && styles.segmentOn]} />
                ))}
              </View>
              {nextLevel && (
                <Text style={styles.boxNote}>
                  {t(nextLevel.from - streak.current === 1 ? '{n} more day to the {name} lantern' : '{n} more days to the {name} lantern', { n: nextLevel.from - streak.current, name: nextLevel.name })}
                </Text>
              )}
            </View>

            {/* Calendar */}
            <View style={styles.box}>
              <MonthCalendar today={today.date} status={streak.status} version={today.version} />
            </View>

            {onShare && <PrimaryButton label={t('Share my streak')} onPress={onShare} />}

            {/* How it works */}
            <View style={styles.box}>
              <Text style={styles.boxTitle}>{t('Keeping your lantern lit')}</Text>
              <Rule text={t('Reach your daily goal before Maghrib to light the day.')} />
              <Rule text={t('7 lit days in a row earns a shield (hold up to 2). A shield covers a missed day automatically.')} />
              <Rule text={t('Finishing all three quests on {total} days also earns a shield · {n}/{total} so far.', { n: towardShield, total: QUEST_DAYS_PER_SHIELD })} />
              <Rule text={t('Missed a day with no shield? Send {x}× your goal the next day to relight it.', { x: REPAIR_MULTIPLIER })} />
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function Stat({ value, label, icon, small }: { value: string; label: string; icon?: boolean; small?: boolean }) {
  return (
    <View style={styles.stat}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {icon && <ShieldIcon size={16} color={colors.saffron} />}
        <Text style={[styles.statValue, small && { fontSize: 22 }]} numberOfLines={1}>
          {value}
        </Text>
      </View>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Rule({ text }: { text: string }) {
  return (
    <View style={styles.rule}>
      <View style={styles.ruleDot} />
      <Text style={styles.ruleText}>{text}</Text>
    </View>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
    root: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(22,19,15,0.45)' },
    sheet: {
      backgroundColor: colors.plaster,
      borderTopLeftRadius: radius.card,
      borderTopRightRadius: radius.card,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      width: '100%',
      maxWidth: 560,
      alignSelf: 'center',
    },
    grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.cardBorder, marginBottom: spacing.md },
    hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, paddingHorizontal: spacing.sm },
    big: { fontFamily: fonts.display, fontVariant: ['lining-nums'], fontSize: 64, lineHeight: 70, color: colors.ink },
    bigLabel: { fontFamily: fonts.uiSemi, fontSize: 14, color: colors.muted, marginTop: -6 },
    status: { fontFamily: fonts.uiMedium, fontSize: 13, color: colors.terracotta, marginTop: 4 },
    statsRow: { flexDirection: 'row', gap: spacing.sm },
    stat: { flex: 1, backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder, paddingVertical: spacing.md, alignItems: 'center' },
    statValue: { fontFamily: fonts.display, fontVariant: ['lining-nums'], fontSize: 28, color: colors.ink },
    statLabel: { fontFamily: fonts.uiSemi, fontSize: 11, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.6 },
    box: { backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.cardBorder, padding: spacing.lg, gap: spacing.sm },
    boxHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    boxTitle: { fontFamily: fonts.uiSemi, fontSize: 15, color: colors.ink },
    boxSub: { fontFamily: fonts.uiSemi, fontSize: 13, color: colors.terracotta },
    boxNote: { fontFamily: fonts.ui, fontSize: 12, color: colors.muted },
    segments: { flexDirection: 'row', gap: 4 },
    segment: { flex: 1, height: 10, borderRadius: 5, backgroundColor: colors.plaster },
    segmentOn: { backgroundColor: colors.lightGold },
    rule: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
    ruleDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.saffron, marginTop: 7 },
    ruleText: { flex: 1, fontFamily: fonts.ui, fontSize: 13, lineHeight: 19, color: colors.muted },
  }),
);

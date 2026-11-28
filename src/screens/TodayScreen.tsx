/**
 * Today: the daily counter. Counts are saved on the phone instantly.
 * Every add plays its motion, haptic and sound together (see CounterHero).
 */
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import {
  CounterHero,
  Lantern,
  NumberPadSheet,
  PlasterPattern,
  PrimaryButton,
  MaghribCountdown,
  QuestsCard,
  RepairCard,
  ChallengeCard,
  StepUpCard,
  FridayBanner,
  ShareSheet,
  ShieldNotice,
  StreakSheet,
  TasbihBeads,
  StreakTakeover,
  TodayLog,
  ZelligeBand,
  type AddEvent,
  type TakeoverData,
} from '@/components';
import { MilestoneUnlock, NextMilestoneStrip } from '@/components/milestones';
import { useTabs } from '@/components/tabs';
import type { Milestone } from '@/content/milestones';
import { ROUND } from '@/components/TasbihBeads';
import { GLASSES, LAMP_STEP } from '@/content/extras';
import { addKind, feedback } from '@/lib/feedback';
import { showToast } from '@/lib/toast';
import { onQuestEvent } from '@/store/quests';
import { QUEST_DAYS_PER_SHIELD } from '@/store/streaks';
import { hijriDateArabic } from '@/lib/hijri';
import {
  addSalawat,
  dismissShieldNotice,
  getToday,
  markTakeoverShown,
  onGoalLit,
  onFridayBadge,
  onDayRecord,
  onChallengeDone,
  onLampLit,
  onStreakRepaired,
  onMilestone,
  takeoverShown,
  useToday,
} from '@/store/counts';
import { useSettings } from '@/store/settings';
import { colors, fonts, radius, spacing, themedStyles, type } from '@/theme';
import { isRTL, t } from '@/lib/i18n';
import { stepDownOffer, stepUpOffer } from '@/store/habit';
import { monthChallenge } from '@/store/growth';

const fmt = (n: number) => n.toLocaleString('en-US');

/** Wait for the number pad to slide away before celebrating. */
const PAD_CLOSE_DELAY = 220;
/** The takeover starts this long after the count lands. */
const TAKEOVER_AFTER_LAND = 650;
/** How long the count takes to land for each kind of add. */
const LAND_MS = { tap: 0, small: 750, medium: 750, large: 750 } as const;

function takeoverData(): TakeoverData {
  const t = getToday();
  return {
    from: t.streak.beforeToday,
    to: t.streak.current,
    level: t.streak.level,
    shields: t.streak.shields,
    week: t.week.map((key) => ({ key, status: t.streak.status[key] ?? 'missed' })),
    goal: t.goalBar,
  };
}

let nextEventId = 1;

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const today = useToday();
  const settingsNow = useSettings();
  // Re-read when counts or the goal change.
  const goalOffer =
    stepUpOffer(today.date, today.version + settingsNow.dailyGoal) ?? stepDownOffer(today.date, today.version + settingsNow.dailyGoal);
  const tabs = useTabs();
  const settings = useSettings();
  const countDown = settings.countingStyle === 'down';
  const [padOpen, setPadOpen] = useState(false);
  const [streakOpen, setStreakOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [event, setEvent] = useState<AddEvent>();
  const [takeover, setTakeover] = useState<TakeoverData | null>(null);
  const [unlock, setUnlock] = useState<Milestone | null>(null);
  const { streak } = today;
  const journey = today.milestones;

  // Celebrations play one at a time: the streak takeover first, then a
  // milestone reached on the same add.
  const streakPending = useRef(false);
  const queuedMilestone = useRef<Milestone | null>(null);

  const scheduleTakeover = (after: number) => {
    streakPending.current = true;
    setTimeout(() => setTakeover(takeoverData()), after);
  };
  const scheduleMilestone = (m: Milestone, after: number) => {
    if (streakPending.current) queuedMilestone.current = m;
    else setTimeout(() => setUnlock(m), after);
  };
  const closeTakeover = () => {
    setTakeover(null);
    streakPending.current = false;
    const m = queuedMilestone.current;
    queuedMilestone.current = null;
    if (m) setTimeout(() => setUnlock(m), 350);
  };

  // Adds from other tabs (e.g. "Send 10" on a reminder) can light the lantern
  // or reach a milestone too.
  useEffect(() => {
    const offLit = onGoalLit((source) => {
      if (source !== 'reminder') return; // Today's own adds are timed in add()
      const date = getToday().date;
      if (takeoverShown(date)) return;
      markTakeoverShown(date);
      scheduleTakeover(1100);
    });
    const offMilestone = onMilestone((m, source) => {
      if (source === 'reminder') scheduleMilestone(m, 1100);
    });
    // Quests: a toast for each, a bigger one when all three are done.
    const offQuest = onQuestEvent(({ quest, allDone, questDays }) => {
      feedback.quest(allDone);
      if (allDone) {
        const left = QUEST_DAYS_PER_SHIELD - (questDays % QUEST_DAYS_PER_SHIELD);
        showToast({
          tone: 'big',
          title: t('All of today’s quests done!'),
          sub: questDays % QUEST_DAYS_PER_SHIELD === 0 ? t('You earned a streak shield') : t(left === 1 ? '{n} more quest day to a streak shield' : '{n} more quest days to a streak shield', { n: left }),
        });
      } else {
        showToast({ tone: 'quest', title: t('Quest complete'), sub: quest.title });
      }
    });
    // A repair made from another tab (e.g. Send 10) still celebrates.
    const offRepair = onStreakRepaired(({ streak: kept }) => {
      showToast({ tone: 'big', title: t('Streak repaired!'), sub: t('Your {n}-day streak is lit again', { n: kept }) });
    });
    const offLamp = onLampLit((lamps) => {
      feedback.quest(true);
      const glass = GLASSES.find((g) => g.lamp === lamps);
      showToast({
        tone: 'big',
        title: t('Lamp {n} lit · {total}', { n: lamps, total: (lamps * LAMP_STEP).toLocaleString('en-US') }),
        sub: glass ? t('New lantern glass: {name} · choose it in Me', { name: glass.name }) : t('Another lamp burns in your masjid'),
      });
    });
    const offRecord = onDayRecord(({ total }) => {
      feedback.quest(true);
      showToast({ tone: 'big', title: t('New personal best!'), sub: t('{n} in one day, your most yet', { n: total.toLocaleString('en-US') }) });
    });
    const offChallenge = onChallengeDone((c) => {
      feedback.quest(true);
      showToast({ tone: 'big', title: t('{month} challenge complete!', { month: c.name }), sub: t('{n} lit days this month', { n: c.lit }) });
    });
    const offFriday = onFridayBadge(() => {
      feedback.quest(true);
      showToast({ tone: 'big', title: t('Jumu’ah Keeper earned!'), sub: t('Four Fridays in a row with your lantern lit') });
    });
    return () => {
      offLit();
      offMilestone();
      offQuest();
      offRepair();
      offLamp();
      offFriday();
      offRecord();
      offChallenge();
    };
  }, []);

  /** Save instantly, then play motion, haptic and sound together. */
  const add = (amount: number, source: 'tap' | 'quick' | 'pad') => {
    const repairing = getToday().repair; // a repair offer before this add
    const { litNow, milestone } = addSalawat(amount, source);
    const repairedNow = !!repairing && !getToday().repair;
    const kind = addKind(amount, source);
    const delay = source === 'pad' ? PAD_CLOSE_DELAY : 0;
    setEvent({ id: nextEventId++, amount, kind, delay });
    if (delay) setTimeout(() => feedback.add(kind), delay);
    else feedback.add(kind);

    // Goal met for the first time today: play the streak takeover once.
    const date = getToday().date;
    const after = delay + LAND_MS[kind] + TAKEOVER_AFTER_LAND;
    // While a repair is on offer, wait for it: the takeover then shows the saved streak.
    if ((litNow && !repairing) || repairedNow) {
      if (!takeoverShown(date)) {
        markTakeoverShown(date);
        scheduleTakeover(after);
      }
    }
    // Tasbih: every 33 taps on the arch completes a round; 99 completes the tasbih.
    if (source === 'tap') {
      const taps = getToday().taps;
      if (taps % ROUND === 0) {
        feedback.round(taps % (ROUND * 3) === 0);
        if (taps % (ROUND * 3) === 0) showToast({ tone: 'quest', title: t('Tasbih complete'), sub: `${t('{n} taps on the arch today', { n: taps })} · سبحان الله` });
      }
    }
    // Reached a lifetime milestone: reveal the new part of the masjid.
    if (milestone) scheduleMilestone(milestone, after);
  };

  const openPad = () => {
    feedback.sheetOpen();
    setPadOpen(true);
  };

  return (
    <View style={styles.page}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md, paddingBottom: 32 }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.hijri}>{hijriDateArabic()}</Text>
            <Text style={styles.title}>{t('Today')}</Text>
          </View>
          <Pressable
            onPress={() => {
              feedback.sheetOpen();
              setStreakOpen(true);
            }}
            style={({ pressed }) => [styles.streakPill, today.lit && styles.streakPillLit, pressed && { transform: [{ scale: 0.96 }] }]}
            accessibilityRole="button"
            accessibilityLabel={t(today.lit ? '{n} day streak, lit today. Open streak calendar' : '{n} day streak. Open streak calendar', { n: streak.current })}>
            <Lantern size={20} lit={today.lit} level={streak.level} glow={false} />
            <Text style={[styles.streakPillText, today.lit && styles.streakPillTextLit]}>{streak.current}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={t('Reminder settings')} style={styles.bell} onPress={() => tabs.goTo(4)}>
            <BellIcon />
          </Pressable>
        </View>

        {today.friday.isFriday && <FridayBanner streak={today.friday.streak} badge={today.friday.badge} />}

        {today.repair && <RepairCard repair={today.repair} total={today.total} />}
        {goalOffer && !today.repair && <StepUpCard offer={goalOffer} today={today.date} />}

        {today.shieldNotice && (
          <ShieldNotice
            day={today.shieldNotice}
            shieldsLeft={streak.shields}
            onDismiss={() => dismissShieldNotice(today.shieldNotice!)}
          />
        )}

        {/* Hero */}
        <View style={styles.hero}>
          <PlasterPattern />
          {today.friday.isFriday && (
            <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
              <Defs>
                <RadialGradient id="friGlow" cx="50%" cy="38%" r="55%">
                  <Stop offset="0" stopColor={colors.lightGold} stopOpacity={0.85} />
                  <Stop offset="0.6" stopColor={colors.lightGold} stopOpacity={0.25} />
                  <Stop offset="1" stopColor={colors.lightGold} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Rect x={0} y={0} width="100%" height="100%" fill="url(#friGlow)" />
            </Svg>
          )}
          <View style={styles.heroRow}>
            <View style={styles.heroSide}>
              <Lantern size={46} lit={today.lit} level={streak.level} />
              <Text style={styles.sideNumber}>{streak.current}</Text>
              <Text style={styles.sideLabel}>{t('day streak')}</Text>
              <Text style={[styles.sideStatus, today.lit && { color: colors.link }]}>
                {today.lit ? t('Lit today') : t('Your lantern is waiting')}
              </Text>
            </View>

            <CounterHero total={today.total} goal={today.goal} event={event} countDown={countDown} onTap={() => add(1, 'tap')} />

            <View style={styles.heroSide}>
              {today.lit ? (
                <>
                  <Text style={[styles.sideNumber, { color: colors.link }]}>✓</Text>
                  <Text style={styles.sideLabel}>{t('goal met')}</Text>
                </>
              ) : (
                <>
                  <Text style={[styles.sideNumber, { color: colors.terracotta }]}>
                    {fmt(countDown ? today.total : today.left)}
                  </Text>
                  <Text style={styles.sideLabel}>{countDown ? t('done today') : t('left today')}</Text>
                </>
              )}
            </View>
          </View>
          <TasbihBeads taps={today.taps} />
          <Pressable onPress={() => router.push('/tasbih')} accessibilityRole="button" style={({ pressed }) => [styles.fullBtn, pressed && { opacity: 0.7 }]}>
            <Text style={styles.fullBtnText}>{t('⤢ Full-screen counter')}</Text>
          </Pressable>
          <Text style={styles.salawat}>اللهم صل وسلم على نبينا محمد</Text>
          <MaghribCountdown endsAt={today.endsAt} lit={today.lit} />
          <ZelligeBand height={22} />
        </View>

        {/* Next milestone, right under today's count */}
        <NextMilestoneStrip progress={journey} onPress={() => tabs.goTo(4)} />

        {/* Quick add */}
        <View style={styles.quickRow}>
          {quickAmounts(today.goal).map((n) => (
            <PrimaryButton key={n} label={`+${n.toLocaleString('en-US')}`} style={styles.quickBtn} onPress={() => add(n, 'quick')} />
          ))}
          <PrimaryButton label={t('Other')} variant="secondary" style={styles.quickBtn} onPress={openPad} />
        </View>

        <QuestsCard quests={today.quests} questDays={streak.questDays} />

        <ChallengeCard c={monthChallenge(today.date, today.version)} />

        <TodayLog entries={today.entries} />
      </ScrollView>

      <StreakSheet
        visible={streakOpen}
        today={today}
        onClose={() => setStreakOpen(false)}
        onShare={() => {
          setStreakOpen(false);
          setTimeout(() => setShareOpen(true), 260);
        }}
      />
      <ShareSheet visible={shareOpen} initial="streak" today={today} onClose={() => setShareOpen(false)} />
      <StreakTakeover data={takeover} onClose={closeTakeover} />
      <MilestoneUnlock milestone={unlock} onClose={() => setUnlock(null)} />

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

/** Quick-add amounts sized to the daily goal, so small goals get small steps. */
function quickAmounts(goal: number) {
  if (goal < 50) return [1, 5, 10];
  if (goal < 300) return [10, 33, 100];
  return [100, 300, 1000];
}

const styles = themedStyles(() =>
  StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.plaster },
  content: { paddingHorizontal: spacing.lg, gap: spacing.lg, maxWidth: 520, width: '100%', alignSelf: 'center' },

  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  hijri: { fontFamily: fonts.arabic, fontSize: 15, color: colors.terracotta, textAlign: isRTL() ? 'right' : 'left' },
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
  streakPillLit: { borderColor: colors.saffron, backgroundColor: colors.highlight },
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
  fullBtn: { alignSelf: 'center', borderRadius: 999, borderWidth: 1, borderColor: colors.saffron, paddingHorizontal: 14, paddingVertical: 6, marginTop: spacing.sm },
  fullBtnText: { fontFamily: fonts.uiSemi, fontSize: 12, color: colors.link },
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
}),
);

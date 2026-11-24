/**
 * Group (preview until accounts): what a family group looks like — the
 * Jumu'ah goal with ten arched windows, who logged today, the activity feed
 * with reactions — and how privacy works. Sample names, clearly marked.
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { ArchWindows, Card, EightPointStar, PlasterPattern, PrimaryButton, ScreenHeader, ZelligeBand } from '@/components';
import { Medallion } from '@/components/milestones/Medallion';
import { milestoneByAmount } from '@/content/milestones';
import { feedback } from '@/lib/feedback';
import { addDays } from '@/lib/salliDay';
import { useToday } from '@/store/counts';
import { getDay, isLit } from '@/store/days';
import { weekEnd } from '@/store/growth';
import { useSettings } from '@/store/settings';
import { colors, fonts, radius, spacing, themedStyles } from '@/theme';
import { t } from '@/lib/i18n';

const MEMBERS = [
  { name: 'Amina', streak: 23, logged: true },
  { name: 'Yusuf', streak: 9, logged: true },
  { name: 'You', streak: 0, logged: true },
  { name: 'Khadija', streak: 4, logged: false },
  { name: 'Omar', streak: 15, logged: true },
];

type Reaction = 'ameen' | 'mashallah';
type Activity = { id: string; who: string; what: string; when: string; milestone?: number; reactions: Record<Reaction, number> };

const ACTIVITY = (): Activity[] => [
  { id: 'a1', who: 'Yusuf', what: t('built The Courtyard · 10,000 salawat'), when: t('8 min'), milestone: 10000, reactions: { ameen: 4, mashallah: 3 } },
  { id: 'a2', who: 'Amina', what: t('lit her lantern · 23-day streak'), when: t('12 min'), reactions: { ameen: 3, mashallah: 2 } },
  { id: 'a3', who: 'Omar', what: t('logged salawat after Asr'), when: t('1 h'), reactions: { ameen: 1, mashallah: 0 } },
  { id: 'a4', who: t('The family'), what: t('passed 6,000 toward the Jumu’ah goal'), when: t('2 h'), reactions: { ameen: 0, mashallah: 4 } },
];

/** Sample lit days this Jumu'ah week for the preview family (yours are real). */
const SAMPLE_LIT: Record<string, number> = { Amina: 6, Omar: 5, Yusuf: 4, Khadija: 2 };

/** Lit days so far this Jumu'ah week (Saturday to Friday), and how many days have passed. */
function yourWeek(today: string) {
  const end = weekEnd(today);
  let lit = 0;
  let days = 0;
  for (let k = addDays(end, -6); k <= today; k = addDays(k, 1)) {
    days++;
    if (isLit(getDay(k))) lit++;
  }
  return { lit, days };
}

export default function GroupScreen() {
  const insets = useSafeAreaInsets();
  const settings = useSettings();
  const you = settings.name.trim() || t('You');
  const today = useToday();
  const week = yourWeek(today.date);
  const board = [
    ...Object.entries(SAMPLE_LIT).map(([name, lit]) => ({ name, lit: Math.min(lit, week.days), me: false })),
    { name: you, lit: week.lit, me: true },
  ].sort((a, b) => b.lit - a.lit || Number(b.me) - Number(a.me));
  const [mine, setMine] = useState<Record<string, Reaction | undefined>>({});
  const react = (id: string, r: Reaction) => {
    feedback.selection();
    setMine((m) => ({ ...m, [id]: m[id] === r ? undefined : r }));
  };

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}>
      <ScreenHeader
        title={t('Group')}
        arabic="العائلة"
        right={
          <View style={styles.previewPill}>
            <Text style={styles.previewText}>{t('Preview')}</Text>
          </View>
        }
      />

      {/* Goal card */}
      <View style={styles.goal}>
        <PlasterPattern color={colors.lightGold} opacity={0.1} cell={44} />
        <View style={styles.goalBody}>
          <Text style={styles.goalEyebrow}>{t('Family · Jumu’ah goal')}</Text>
          <View style={styles.goalRow}>
            <Text style={styles.goalNum}>6,200</Text>
            <Text style={styles.goalOf}> / 10,000</Text>
          </View>
          <Text style={styles.goalMeta}>{t('Ends Friday at Maghrib · 5 members')}</Text>
          <View style={styles.windows}>
            <ArchWindows lit={6} size={24} />
          </View>
          <Text style={styles.goalHint}>{t('A window lights for every 1,000 the family sends together.')}</Text>
        </View>
        <ZelligeBand height={16} />
      </View>

      {/* Logged today */}
      <Card>
        <Text style={styles.cardTitle}>{t('Logged today')}</Text>
        <View style={styles.members}>
          {MEMBERS.map((m) => (
            <View key={m.name} style={styles.member}>
              <View style={[styles.avatar, !m.logged && styles.avatarDashed]}>
                {m.logged ? (
                  <EightPointStar size={46} fill={m.name === 'You' ? colors.saffron : colors.zelligeGreen} stroke={colors.saffron} strokeWidth={1.5} />
                ) : null}
                <Text style={[styles.initial, !m.logged && { color: colors.muted }]}>{(m.name === 'You' ? you : m.name).charAt(0)}</Text>
              </View>
              <Text style={styles.memberName} numberOfLines={1}>
                {m.name === 'You' ? t('You') : m.name}
              </Text>
              <Text style={styles.memberStreak}>{m.logged ? (m.streak ? t('{n} days', { n: m.streak }) : '•') : t('not yet')}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.note}>{t('Members see the family total and each other’s streaks, never each other’s counts, unless someone turns sharing on.')}</Text>
      </Card>

      {/* Consistency board: lit days, not counts, so every lantern weighs the same */}
      <Card>
        <Text style={styles.cardTitle}>{t('This week’s lanterns')}</Text>
        <Text style={styles.boardSub}>{t('Ranked by lit days this Jumu’ah week, not by how many. Every lantern counts the same.')}</Text>
        {board.map((m, i) => (
          <View key={m.name + i} style={[styles.boardRow, m.me && styles.boardMe]}>
            <Text style={styles.rank}>{i + 1}</Text>
            <View style={styles.boardAvatar}>
              <EightPointStar size={34} fill={m.me ? colors.saffron : colors.zelligeGreen} stroke={colors.saffron} strokeWidth={1.2} />
              <Text style={styles.boardInitial}>{m.name.charAt(0)}</Text>
            </View>
            <Text style={styles.boardName} numberOfLines={1}>
              {m.me ? t('{name} (you)', { name: m.name }) : m.name}
            </Text>
            <View style={styles.lamps}>
              {Array.from({ length: 7 }, (_, d) => (
                <View key={d} style={[styles.lampDot, d < m.lit && styles.lampDotOn, d >= week.days && styles.lampDotFuture]} />
              ))}
            </View>
            <Text style={styles.boardCount}>
              {m.lit}/{week.days}
            </Text>
          </View>
        ))}
      </Card>

      {/* Activity */}
      <Card>
        <Text style={styles.cardTitle}>{t('Activity')}</Text>
        {ACTIVITY().map((a, i) => {
          const m = a.milestone ? milestoneByAmount(a.milestone) : undefined;
          return (
            <View key={a.id} style={[styles.event, i > 0 && styles.eventBorder]}>
              <View style={styles.eventRow}>
                {m && <Medallion size={40} milestone={m} earned />}
                <Text style={[styles.eventText, { flex: 1 }]}>
                  <Text style={styles.eventWho}>{a.who}</Text> {a.what}
                </Text>
              </View>
              <View style={styles.reactions}>
                {(['ameen', 'mashallah'] as const).map((r) => {
                  const on = mine[a.id] === r;
                  const n = a.reactions[r] + (on ? 1 : 0);
                  return (
                    <Pressable
                      key={r}
                      onPress={() => react(a.id, r)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      style={({ pressed }) => [styles.reaction, on && styles.reactionOn, pressed && { transform: [{ scale: 0.94 }] }]}>
                      <Text style={[styles.reactionText, on && { color: colors.onPrimary }]}>
                        {r === 'ameen' ? t('Ameen') : t('MashaAllah')}
                        {n > 0 ? ` ${n}` : ''}
                      </Text>
                    </Pressable>
                  );
                })}
                <Text style={styles.when}>{a.when}</Text>
              </View>
            </View>
          );
        })}
      </Card>

      {/* How it works */}
      <Card>
        <Text style={styles.cardTitle}>{t('How groups work')}</Text>
        <Point icon="code" text={t('Create a group and share its 6-letter invite code with family.')} />
        <Point icon="live" text={t('Everyone’s salawat add up live toward the week’s goal, until Friday at Maghrib.')} />
        <Point icon="lock" text={t('Your own count stays private. Sharing is off unless you switch it on in Me.')} />
        <Point icon="chat" text={t('Log from your family’s Telegram group too, with the Salli bot.')} />
        <View style={{ marginTop: spacing.md }}>
          <PrimaryButton label={t('Sign in to create a group')} onPress={() => router.push('/sign-in')} />
        </View>
        <Text style={styles.foot}>{t('Groups switch on once accounts are connected.')}</Text>
      </Card>
    </ScrollView>
  );
}

function Point({ icon, text }: { icon: 'code' | 'live' | 'lock' | 'chat'; text: string }) {
  const d = {
    code: 'M8 8 4 12l4 4M16 8l4 4-4 4M13.5 6l-3 12',
    live: 'M3 12h3l3-7 4 14 3-7h5',
    lock: 'M6 11h12v9H6Z M8.5 11V8a3.5 3.5 0 0 1 7 0v3',
    chat: 'M21 4 3 11l6 2 2 6 3-4 5 4Z M9 13l9-6',
  }[icon];
  return (
    <View style={styles.point}>
      <View style={styles.pointIcon}>
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.link} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <Path d={d} />
        </Svg>
      </View>
      <Text style={styles.pointText}>{text}</Text>
    </View>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
    content: { paddingHorizontal: spacing.lg, paddingBottom: 32, gap: spacing.lg, maxWidth: 520, width: '100%', alignSelf: 'center' },
    previewPill: { borderRadius: 999, borderWidth: 1, borderColor: colors.saffron, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 6 },
    previewText: { fontFamily: fonts.uiSemi, fontSize: 12, color: colors.terracotta },
    goal: { backgroundColor: colors.zelligeGreen, borderRadius: radius.card, borderWidth: 1, borderColor: colors.saffron, overflow: 'hidden' },
    goalBody: { padding: spacing.lg },
    goalEyebrow: { fontFamily: fonts.uiSemi, fontSize: 12, color: colors.lightGold, textTransform: 'uppercase', letterSpacing: 0.8 },
    goalRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 2 },
    goalNum: { fontFamily: fonts.display, fontVariant: ['lining-nums'], fontSize: 48, color: colors.onPrimary },
    goalOf: { fontFamily: fonts.display, fontVariant: ['lining-nums'], fontSize: 24, color: colors.lightGold },
    goalMeta: { fontFamily: fonts.ui, fontSize: 13, color: colors.onPrimary, opacity: 0.85 },
    windows: { marginTop: spacing.lg, marginBottom: spacing.sm },
    goalHint: { fontFamily: fonts.ui, fontSize: 12, color: colors.onPrimary, opacity: 0.75 },
    cardTitle: { fontFamily: fonts.display, fontSize: 24, color: colors.ink, marginBottom: spacing.sm },
    members: { flexDirection: 'row', justifyContent: 'space-between' },
    member: { alignItems: 'center', width: 60 },
    avatar: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
    avatarDashed: { borderRadius: 23, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.cardBorder },
    initial: { position: 'absolute', fontFamily: fonts.display, fontSize: 20, color: colors.onPrimary },
    memberName: { fontFamily: fonts.uiMedium, fontSize: 12, color: colors.ink, marginTop: 4 },
    memberStreak: { fontFamily: fonts.ui, fontSize: 11, color: colors.terracotta },
    note: { fontFamily: fonts.ui, fontSize: 12, lineHeight: 18, color: colors.muted, marginTop: spacing.md },
    event: { paddingVertical: 10 },
    eventBorder: { borderTopWidth: 1, borderTopColor: colors.cardBorder },
    eventText: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 20, color: colors.ink },
    eventWho: { fontFamily: fonts.uiSemi },
    reactions: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
    reactionOn: { backgroundColor: colors.zelligeGreen },
    eventRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    boardSub: { fontFamily: fonts.ui, fontSize: 12, lineHeight: 17, color: colors.muted, marginTop: -4, marginBottom: spacing.sm },
    boardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 8, paddingHorizontal: 6, borderRadius: 12 },
    boardMe: { backgroundColor: colors.highlight },
    rank: { width: 18, fontFamily: fonts.display, fontVariant: ['lining-nums'], fontSize: 20, color: colors.terracotta, textAlign: 'center' },
    boardAvatar: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
    boardInitial: { position: 'absolute', fontFamily: fonts.display, fontSize: 15, color: colors.onPrimary },
    boardName: { flex: 1, fontFamily: fonts.uiMedium, fontSize: 14, color: colors.ink },
    lamps: { flexDirection: 'row', gap: 3, direction: 'ltr' },
    lampDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.cardBorder },
    lampDotOn: { backgroundColor: colors.saffron },
    lampDotFuture: { opacity: 0.35 },
    boardCount: { width: 30, fontFamily: fonts.uiSemi, fontSize: 12, color: colors.muted, textAlign: 'right' },
    reaction: { borderRadius: 999, backgroundColor: colors.highlight, paddingHorizontal: 10, paddingVertical: 3 },
    reactionText: { fontFamily: fonts.uiMedium, fontSize: 12, color: colors.terracotta },
    when: { fontFamily: fonts.ui, fontSize: 12, color: colors.muted, marginLeft: 'auto' },
    point: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 6 },
    pointIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.plaster, borderWidth: 1, borderColor: colors.cardBorder, alignItems: 'center', justifyContent: 'center' },
    pointText: { flex: 1, fontFamily: fonts.ui, fontSize: 14, lineHeight: 20, color: colors.ink },
    foot: { fontFamily: fonts.ui, fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: spacing.sm },
  }),
);

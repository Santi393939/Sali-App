/**
 * Groups: count together with family and friends.
 *
 * Built to read at a glance:
 *  - your groups as chips at the top (switch like chats, + New);
 *  - the group's weekly goal: ten arch windows and one number;
 *  - one leaderboard with three tabs (Streak, Days lit, Salawat), top three
 *    with medals, a lantern by each name showing who has lit today, and a
 *    gentle Nudge for those who haven't;
 *  - the activity feed with Ameen / MashaAllah.
 *
 * Until accounts are connected this is a preview: the other members are
 * samples, your own row uses your real numbers. Counts stay private unless a
 * member turns on "Show my count to group".
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArchWindows, Card, EightPointStar, Lantern, PlasterPattern, PrimaryButton, ScreenHeader, Segmented, ZelligeBand } from '@/components';
import { Medallion } from '@/components/milestones/Medallion';
import { milestoneByAmount } from '@/content/milestones';
import { feedback } from '@/lib/feedback';
import { t } from '@/lib/i18n';
import { addDays, keyToDate } from '@/lib/salliDay';
import { showToast } from '@/lib/toast';
import { useToday } from '@/store/counts';
import { getDay, isLit } from '@/store/days';
import { weekEnd } from '@/store/growth';
import { useSettings } from '@/store/settings';
import { colors, fonts, radius, spacing, themedStyles } from '@/theme';

type Board = 'streak' | 'days' | 'salawat';
type Reaction = 'ameen' | 'mashallah';

type Member = { name: string; streak: number; litDays: number; litToday: boolean; salawat: number | null; me?: boolean };
type Activity = { id: string; who: string; what: string; when: string; milestone?: number; reactions: Record<Reaction, number> };
type Group = { id: string; name: string; goal: number; progress: number; members: Member[]; activity: () => Activity[] };

/** Preview groups. `salawat: null` = that member keeps their count private. */
const GROUPS: Group[] = [
  {
    id: 'family',
    name: 'Family',
    goal: 10000,
    progress: 6200,
    members: [
      { name: 'Amina', streak: 23, litDays: 6, litToday: true, salawat: 4200 },
      { name: 'Omar', streak: 15, litDays: 5, litToday: true, salawat: 3100 },
      { name: 'Yusuf', streak: 9, litDays: 4, litToday: true, salawat: null },
      { name: 'Khadija', streak: 4, litDays: 2, litToday: false, salawat: 600 },
    ],
    activity: () => [
      { id: 'f1', who: 'Yusuf', what: t('built The Courtyard · 10,000 salawat'), when: t('8 min'), milestone: 10000, reactions: { ameen: 4, mashallah: 3 } },
      { id: 'f2', who: 'Amina', what: t('lit her lantern · 23-day streak'), when: t('12 min'), reactions: { ameen: 3, mashallah: 2 } },
      { id: 'f3', who: t('The family'), what: t('passed 6,000 toward the weekly goal'), when: t('2 h'), reactions: { ameen: 0, mashallah: 4 } },
    ],
  },
  {
    id: 'friends',
    name: 'Friends',
    goal: 25000,
    progress: 14300,
    members: [
      { name: 'Bilal', streak: 41, litDays: 7, litToday: true, salawat: 7000 },
      { name: 'Hamza', streak: 12, litDays: 5, litToday: false, salawat: null },
      { name: 'Zayd', streak: 7, litDays: 4, litToday: true, salawat: 2500 },
      { name: 'Ibrahim', streak: 3, litDays: 3, litToday: false, salawat: 900 },
      { name: 'Musa', streak: 0, litDays: 1, litToday: false, salawat: null },
    ],
    activity: () => [
      { id: 'r1', who: 'Bilal', what: t('reached a 41-day streak'), when: t('30 min'), reactions: { ameen: 2, mashallah: 5 } },
      { id: 'r2', who: 'Zayd', what: t('lit his lantern after Asr'), when: t('1 h'), reactions: { ameen: 1, mashallah: 0 } },
    ],
  },
];

/** This Jumu'ah week (Saturday to Friday) for you: lit days, days passed, total, days left. */
function yourWeek(today: string) {
  const end = weekEnd(today);
  let lit = 0;
  let days = 0;
  let total = 0;
  for (let k = addDays(end, -6); k <= today; k = addDays(k, 1)) {
    const day = getDay(k);
    days++;
    total += day.total;
    if (isLit(day)) lit++;
  }
  const left = Math.round((keyToDate(end).getTime() - keyToDate(today).getTime()) / 86400000) + 1;
  return { lit, days, total, left };
}

const fmt = (n: number) => n.toLocaleString('en-US');
const MEDAL = ['#E9B860', '#C9CED6', '#C98A5A'];

export default function GroupScreen() {
  const insets = useSafeAreaInsets();
  const settings = useSettings();
  const today = useToday();
  const [groupId, setGroupId] = useState(GROUPS[0].id);
  const [board, setBoard] = useState<Board>('streak');
  const [nudged, setNudged] = useState<Record<string, boolean>>({});
  const [mine, setMine] = useState<Record<string, Reaction | undefined>>({});

  const group = GROUPS.find((g) => g.id === groupId) ?? GROUPS[0];
  const week = yourWeek(today.date);
  const you: Member = {
    name: settings.name.trim() || t('You'),
    streak: today.streak.current,
    litDays: week.lit,
    litToday: today.lit,
    salawat: week.total,
    me: true,
  };
  const members = [...group.members.map((m) => ({ ...m, litDays: Math.min(m.litDays, week.days) })), you];
  const progress = group.progress + week.total;
  const pct = Math.min(1, progress / group.goal);

  // Private counts sit at the bottom of the Salawat board (your own always shows to you).
  const value = (m: Member) => (board === 'streak' ? m.streak : board === 'days' ? m.litDays : m.me || m.salawat !== null ? (m.salawat ?? -1) : -1);
  const ranked = [...members].sort((a, b) => value(b) - value(a) || Number(!!b.me) - Number(!!a.me));
  const litTodayCount = members.filter((m) => m.litToday).length;

  const nudge = (name: string) => {
    feedback.selection();
    setNudged((n) => ({ ...n, [`${group.id}:${name}`]: true }));
    showToast({ tone: 'quest', title: t('Nudge sent to {name}', { name }), sub: t('A gentle reminder, never pressure.') });
  };
  const react = (id: string, r: Reaction) => {
    feedback.selection();
    setMine((m) => ({ ...m, [id]: m[id] === r ? undefined : r }));
  };

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}>
      <ScreenHeader
        title={t('Groups')}
        arabic="الجماعة"
        right={
          <View style={styles.previewPill}>
            <Text style={styles.previewText}>{t('Preview')}</Text>
          </View>
        }
      />

      {/* Your groups */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {GROUPS.map((g) => {
          const on = g.id === group.id;
          return (
            <Pressable
              key={g.id}
              onPress={() => {
                feedback.selection();
                setGroupId(g.id);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              style={({ pressed }) => [styles.chip, on && styles.chipOn, pressed && { transform: [{ scale: 0.96 }] }]}>
              <Text style={[styles.chipText, on && { color: colors.onPrimary }]}>{t(g.name)}</Text>
              <Text style={[styles.chipCount, on && { color: colors.lightGold }]}>{g.members.length + 1}</Text>
            </Pressable>
          );
        })}
        <Pressable onPress={() => router.push('/sign-in')} accessibilityRole="button" style={({ pressed }) => [styles.chip, styles.chipNew, pressed && { opacity: 0.7 }]}>
          <Text style={styles.chipNewText}>{t('+ New group')}</Text>
        </Pressable>
      </ScrollView>

      {/* Weekly goal */}
      <View style={styles.goal}>
        <PlasterPattern color={colors.lightGold} opacity={0.1} cell={44} />
        <View style={styles.goalBody}>
          <View style={styles.goalTop}>
            <Text style={styles.goalEyebrow}>{t('Weekly goal')}</Text>
            <Text style={styles.goalLeft}>{t(week.left === 1 ? 'Ends today at Maghrib' : '{n} days left', { n: week.left })}</Text>
          </View>
          <View style={styles.goalRow}>
            <Text style={styles.goalNum}>{fmt(progress)}</Text>
            <Text style={styles.goalOf}> / {fmt(group.goal)}</Text>
          </View>
          <View style={styles.windows}>
            <ArchWindows lit={Math.floor(pct * 10)} size={24} />
          </View>
          <View style={styles.goalStats}>
            <Text style={styles.goalStat}>{pct >= 1 ? `${t('Goal reached ✓')} ما شاء الله` : t('{p}% there', { p: Math.round(pct * 100) })}</Text>
            <Text style={styles.goalStat}>{t('Your part: {n}', { n: fmt(week.total) })}</Text>
            <Text style={styles.goalStat}>{t('{n} of {total} lit today', { n: litTodayCount, total: members.length })}</Text>
          </View>
        </View>
        <ZelligeBand height={16} />
      </View>

      {/* Leaderboard */}
      <Card>
        <Text style={styles.cardTitle}>{t('Leaderboard')}</Text>
        <Segmented<Board>
          options={[
            { value: 'streak', label: t('Streak') },
            { value: 'days', label: t('Days lit') },
            { value: 'salawat', label: t('Salawat') },
          ]}
          value={board}
          onChange={setBoard}
        />
        <Text style={styles.boardCaption}>
          {board === 'streak' ? t('Days in a row') : board === 'days' ? t('This week, Saturday to Friday') : t('This week · private counts stay hidden')}
        </Text>
        {ranked.map((m, i) => {
          const hidden = board === 'salawat' && !m.me && m.salawat === null;
          const canNudge = !m.me && !m.litToday;
          const sent = nudged[`${group.id}:${m.name}`];
          return (
            <View key={m.name + (m.me ? '-me' : '')} style={[styles.row, m.me && styles.rowMe]}>
              <View style={[styles.rank, i < 3 && !hidden && { backgroundColor: MEDAL[i] }]}>
                <Text style={[styles.rankText, i < 3 && !hidden && { color: '#2A1E10' }]}>{i + 1}</Text>
              </View>
              <View style={styles.avatar}>
                <EightPointStar size={38} fill={m.me ? colors.saffron : colors.zelligeGreen} stroke={colors.saffron} strokeWidth={1.2} />
                <Text style={styles.initial}>{m.name.charAt(0)}</Text>
                <View style={styles.lanternBadge}>
                  <Lantern size={16} lit={m.litToday} glow={false} />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {m.me ? t('{name} (you)', { name: m.name }) : m.name}
                </Text>
                {board === 'days' ? (
                  <View style={styles.dots}>
                    {Array.from({ length: 7 }, (_, d) => (
                      <View key={d} style={[styles.dot, d < m.litDays && styles.dotOn, d >= week.days && styles.dotLater]} />
                    ))}
                  </View>
                ) : (
                  <Text style={[styles.status, m.litToday && { color: colors.link }]}>{m.litToday ? t('Lit today') : t('Not yet today')}</Text>
                )}
              </View>
              <Text style={[styles.value, hidden && styles.valueHidden]}>
                {board === 'streak' ? `🔥 ${m.streak}` : board === 'days' ? `${m.litDays}` : hidden ? '🔒' : fmt(m.salawat ?? 0)}
              </Text>
              {canNudge && (
                <Pressable
                  onPress={() => !sent && nudge(m.name)}
                  disabled={sent}
                  accessibilityRole="button"
                  accessibilityLabel={t('Nudge {name}', { name: m.name })}
                  style={({ pressed }) => [styles.nudge, sent && styles.nudgeSent, pressed && { opacity: 0.7 }]}>
                  <Text style={[styles.nudgeText, sent && { color: colors.muted }]}>{sent ? t('Sent') : t('Nudge')}</Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </Card>

      {/* Activity */}
      <Card>
        <Text style={styles.cardTitle}>{t('Activity')}</Text>
        {group.activity().map((a, i) => {
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

      {/* Going live */}
      <Card>
        <Text style={styles.liveTitle}>{t('Start a group for real')}</Text>
        <Text style={styles.liveText}>{t('Invite family or friends with a 6-letter code. Your count stays private unless you choose to share it in Me.')}</Text>
        <View style={{ marginTop: spacing.md }}>
          <PrimaryButton label={t('Sign in to create a group')} onPress={() => router.push('/sign-in')} />
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
    content: { paddingHorizontal: spacing.lg, paddingBottom: 32, gap: spacing.lg, maxWidth: 520, width: '100%', alignSelf: 'center' },
    previewPill: { borderRadius: 999, borderWidth: 1, borderColor: colors.saffron, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 6 },
    previewText: { fontFamily: fonts.uiSemi, fontSize: 12, color: colors.terracotta },
    chips: { gap: spacing.sm, paddingVertical: 2 },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: 999,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      backgroundColor: colors.card,
      paddingHorizontal: 16,
      height: 40,
    },
    chipOn: { backgroundColor: colors.zelligeGreen, borderColor: colors.saffron },
    chipText: { fontFamily: fonts.uiSemi, fontSize: 14, color: colors.ink },
    chipCount: { fontFamily: fonts.uiSemi, fontSize: 12, color: colors.muted },
    chipNew: { borderStyle: 'dashed' },
    chipNewText: { fontFamily: fonts.uiSemi, fontSize: 14, color: colors.link },
    goal: { backgroundColor: colors.zelligeGreen, borderRadius: radius.card, borderWidth: 1, borderColor: colors.saffron, overflow: 'hidden' },
    goalBody: { padding: spacing.lg },
    goalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    goalEyebrow: { fontFamily: fonts.uiSemi, fontSize: 12, color: colors.lightGold, textTransform: 'uppercase', letterSpacing: 0.8 },
    goalLeft: { fontFamily: fonts.uiSemi, fontSize: 12, color: colors.onPrimary, opacity: 0.85 },
    goalRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 2 },
    goalNum: { fontFamily: fonts.display, fontVariant: ['lining-nums'], fontSize: 48, color: colors.onPrimary },
    goalOf: { fontFamily: fonts.display, fontVariant: ['lining-nums'], fontSize: 24, color: colors.lightGold },
    windows: { marginTop: spacing.md, marginBottom: spacing.md },
    goalStats: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
    goalStat: { fontFamily: fonts.uiMedium, fontSize: 12, color: colors.onPrimary, opacity: 0.9 },
    cardTitle: { fontFamily: fonts.display, fontSize: 24, color: colors.ink, marginBottom: spacing.sm },
    boardCaption: { fontFamily: fonts.ui, fontSize: 12, color: colors.muted, marginTop: spacing.sm, marginBottom: 4 },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 8, paddingHorizontal: 6, borderRadius: 14 },
    rowMe: { backgroundColor: colors.highlight },
    rank: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    rankText: { fontFamily: fonts.uiSemi, fontSize: 12, color: colors.muted },
    avatar: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
    initial: { position: 'absolute', fontFamily: fonts.display, fontSize: 16, color: colors.onPrimary },
    lanternBadge: { position: 'absolute', right: -6, bottom: -6 },
    name: { fontFamily: fonts.uiSemi, fontSize: 15, color: colors.ink },
    status: { fontFamily: fonts.ui, fontSize: 12, color: colors.muted },
    dots: { flexDirection: 'row', gap: 4, marginTop: 4, direction: 'ltr' },
    dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.cardBorder },
    dotOn: { backgroundColor: colors.saffron },
    dotLater: { opacity: 0.35 },
    value: { minWidth: 44, fontFamily: fonts.display, fontVariant: ['lining-nums'], fontSize: 20, color: colors.terracotta, textAlign: 'center' },
    valueHidden: { fontSize: 16, opacity: 0.7 },
    nudge: { borderRadius: 999, borderWidth: 1, borderColor: colors.saffron, paddingHorizontal: 10, paddingVertical: 5 },
    nudgeSent: { borderColor: colors.cardBorder },
    nudgeText: { fontFamily: fonts.uiSemi, fontSize: 12, color: colors.link },
    event: { paddingVertical: 10 },
    eventBorder: { borderTopWidth: 1, borderTopColor: colors.cardBorder },
    eventRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    eventText: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 20, color: colors.ink },
    eventWho: { fontFamily: fonts.uiSemi },
    reactions: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
    reaction: { borderRadius: 999, backgroundColor: colors.highlight, paddingHorizontal: 10, paddingVertical: 4 },
    reactionOn: { backgroundColor: colors.zelligeGreen },
    reactionText: { fontFamily: fonts.uiMedium, fontSize: 12, color: colors.terracotta },
    when: { fontFamily: fonts.ui, fontSize: 12, color: colors.muted, marginLeft: 'auto' },
    liveTitle: { fontFamily: fonts.uiSemi, fontSize: 15, color: colors.ink },
    liveText: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 19, color: colors.muted, marginTop: 4 },
  }),
);

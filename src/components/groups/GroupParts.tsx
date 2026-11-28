/**
 * The pieces of the Groups tab, shared by the live groups (signed in) and
 * the preview (signed out): group chips, the weekly goal card, the
 * leaderboard with Streak / Days lit / Salawat, and the activity feed with
 * Ameen / MashaAllah.
 */
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { milestoneByAmount } from '@/content/milestones';
import { feedback } from '@/lib/feedback';
import { t } from '@/lib/i18n';
import { colors, fonts, radius, spacing, themedStyles } from '@/theme';

import { Card } from '../Card';
import { EightPointStar } from '../EightPointStar';
import { ArchWindows } from '../GroupTeaser';
import { Lantern } from '../Lantern';
import { Medallion } from '../milestones/Medallion';
import { PlasterPattern } from '../PlasterPattern';
import { Segmented } from '../Segmented';
import { ZelligeBand } from '../ZelligeBand';

const fmt = (n: number) => n.toLocaleString('en-US');
const MEDAL = ['#E9B860', '#C9CED6', '#C98A5A'];

export type Reaction = 'ameen' | 'mashallah';
export type BoardMember = { key: string; name: string; streak: number; litDays: number; litToday: boolean; salawat: number | null; me?: boolean };
export type FeedItem = { id: string; who: string; what: string; when: string; milestone?: number; reactions: Record<Reaction, number>; mine: Reaction[] };

// ---------- chips ----------

export function GroupChips({
  groups,
  selected,
  onSelect,
  onNew,
}: {
  groups: { id: string; name: string; count?: number }[];
  selected: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {groups.map((g) => {
        const on = g.id === selected;
        return (
          <Pressable
            key={g.id}
            onPress={() => {
              feedback.selection();
              onSelect(g.id);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={({ pressed }) => [styles.chip, on && styles.chipOn, pressed && { transform: [{ scale: 0.96 }] }]}>
            <Text style={[styles.chipText, on && { color: colors.onPrimary }]} numberOfLines={1}>
              {g.name}
            </Text>
            {g.count ? <Text style={[styles.chipCount, on && { color: colors.lightGold }]}>{g.count}</Text> : null}
          </Pressable>
        );
      })}
      <Pressable onPress={onNew} accessibilityRole="button" style={({ pressed }) => [styles.chip, styles.chipNew, pressed && { opacity: 0.7 }]}>
        <Text style={styles.chipNewText}>{t('+ New group')}</Text>
      </Pressable>
    </ScrollView>
  );
}

// ---------- weekly goal ----------

export function GoalCard({
  progress,
  goal,
  daysLeft,
  yourPart,
  litToday,
  members,
  footer,
  onEditGoal,
}: {
  progress: number;
  goal: number;
  daysLeft: number;
  yourPart: number;
  litToday: number;
  members: number;
  footer?: ReactNode;
  onEditGoal?: () => void;
}) {
  const pct = Math.min(1, progress / Math.max(1, goal));
  return (
    <View style={styles.goal}>
      <PlasterPattern color={colors.lightGold} opacity={0.1} cell={44} />
      <View style={styles.goalBody}>
        <View style={styles.goalTop}>
          <Text style={styles.goalEyebrow}>{t('Weekly goal')}</Text>
          <Text style={styles.goalLeft}>{t(daysLeft === 1 ? 'Ends today at Maghrib' : '{n} days left', { n: daysLeft })}</Text>
        </View>
        <Pressable disabled={!onEditGoal} onPress={onEditGoal} accessibilityRole={onEditGoal ? 'button' : undefined} style={styles.goalRow}>
          <Text style={styles.goalNum}>{fmt(progress)}</Text>
          <Text style={styles.goalOf}> / {fmt(goal)}</Text>
          {onEditGoal ? <Text style={styles.goalEdit}>{t('Edit')}</Text> : null}
        </Pressable>
        <View style={styles.windows}>
          <ArchWindows lit={Math.floor(pct * 10)} size={24} />
        </View>
        <View style={styles.goalStats}>
          <Text style={styles.goalStat}>{pct >= 1 ? `${t('Goal reached ✓')} ما شاء الله` : t('{p}% there', { p: Math.round(pct * 100) })}</Text>
          <Text style={styles.goalStat}>{t('Your part: {n}', { n: fmt(yourPart) })}</Text>
          <Text style={styles.goalStat}>{t('{n} of {total} lit today', { n: litToday, total: members })}</Text>
        </View>
        {footer}
      </View>
      <ZelligeBand height={16} />
    </View>
  );
}

// ---------- leaderboard ----------

type Board = 'streak' | 'days' | 'salawat';

export function Leaderboard({
  members,
  weekDays,
  nudged,
  onNudge,
}: {
  members: BoardMember[];
  weekDays: number;
  nudged: (key: string) => boolean;
  onNudge: (m: BoardMember) => void;
}) {
  const [board, setBoard] = useState<Board>('streak');
  const value = (m: BoardMember) => (board === 'streak' ? m.streak : board === 'days' ? m.litDays : (m.salawat ?? -1));
  const ranked = [...members].sort((a, b) => value(b) - value(a) || Number(!!b.me) - Number(!!a.me));
  return (
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
        const hidden = board === 'salawat' && m.salawat === null;
        const canNudge = !m.me && !m.litToday;
        const sent = nudged(m.key);
        return (
          <View key={m.key} style={[styles.row, m.me && styles.rowMe]}>
            <View style={[styles.rank, i < 3 && !hidden && { backgroundColor: MEDAL[i] }]}>
              <Text style={[styles.rankText, i < 3 && !hidden && { color: '#2A1E10' }]}>{i + 1}</Text>
            </View>
            <View style={styles.avatar}>
              <EightPointStar size={38} fill={m.me ? colors.saffron : colors.zelligeGreen} stroke={colors.saffron} strokeWidth={1.2} />
              <Text style={styles.initial}>{m.name.charAt(0).toUpperCase()}</Text>
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
                    <View key={d} style={[styles.dot, d < m.litDays && styles.dotOn, d >= weekDays && styles.dotLater]} />
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
                onPress={() => !sent && onNudge(m)}
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
  );
}

// ---------- activity ----------

export function ActivityFeed({ items, onReact, empty }: { items: FeedItem[]; onReact: (id: string, r: Reaction) => void; empty?: string }) {
  return (
    <Card>
      <Text style={styles.cardTitle}>{t('Activity')}</Text>
      {items.length === 0 && empty ? <Text style={styles.empty}>{empty}</Text> : null}
      {items.map((a, i) => {
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
                const on = a.mine.includes(r);
                const n = a.reactions[r];
                return (
                  <Pressable
                    key={r}
                    onPress={() => {
                      feedback.selection();
                      onReact(a.id, r);
                    }}
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
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
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
      maxWidth: 200,
    },
    chipOn: { backgroundColor: colors.zelligeGreen, borderColor: colors.saffron },
    chipText: { fontFamily: fonts.uiSemi, fontSize: 14, color: colors.ink, flexShrink: 1 },
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
    goalEdit: { fontFamily: fonts.uiSemi, fontSize: 12, color: colors.lightGold, marginLeft: spacing.sm, textDecorationLine: 'underline' },
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
    empty: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 19, color: colors.muted },
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
  }),
);

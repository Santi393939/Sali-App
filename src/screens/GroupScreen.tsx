/**
 * Groups: count together with family and friends.
 *
 * Signed in, the tab is live: your groups as chips, the group's weekly goal,
 * the leaderboard (Streak / Days lit / Salawat) with a gentle Nudge, and the
 * activity feed with Ameen / MashaAllah. Create a group or join one with a
 * 6-letter code; share the code to invite family or friends.
 *
 * Signed out, the same layout shows a preview with sample members (your own
 * row uses your real numbers) and an invitation to sign in.
 */
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, NumberPadSheet, PrimaryButton, ScreenHeader, Segmented } from '@/components';
import { ActivityFeed, GoalCard, GroupChips, Leaderboard, type BoardMember, type FeedItem, type Reaction } from '@/components/groups/GroupParts';
import { feedback } from '@/lib/feedback';
import { t } from '@/lib/i18n';
import { addDays, keyToDate } from '@/lib/salliDay';
import { showToast } from '@/lib/toast';
import { useAuth } from '@/store/auth';
import { storage } from '@/store/storage';
import { useToday } from '@/store/counts';
import { getDay, isLit } from '@/store/days';
import {
  createGroup,
  eventText,
  joinGroup,
  leaveGroup,
  loadGroup,
  loadGroups,
  nudge,
  setWeeklyGoal,
  toggleReaction,
  useGroups,
  type LiveGroup,
} from '@/store/groups';
import { weekEnd } from '@/store/growth';
import { useSettings } from '@/store/settings';
import { colors, fonts, radius, spacing, themedStyles } from '@/theme';

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

function ago(iso: string) {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return t('just now');
  if (s < 3600) return t('{n} min', { n: Math.round(s / 60) });
  if (s < 86400) return t('{n} h', { n: Math.round(s / 3600) });
  return t('{n} d', { n: Math.round(s / 86400) });
}

export default function GroupScreen() {
  const auth = useAuth();
  const insets = useSafeAreaInsets();
  const live = auth.configured && !!auth.session;
  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]} keyboardShouldPersistTaps="handled">
      <ScreenHeader title={t('Groups')} arabic="الجماعة" />
      {live ? <LiveGroups userId={auth.session!.user.id} /> : <SignedOutGroups />}
    </ScrollView>
  );
}

// ============================ live ============================

/** The group you last looked at, kept while the app is open. */
let lastGroupId: string | null = null;

function LiveGroups({ userId }: { userId: string }) {
  const today = useToday();
  const settings = useSettings();
  const { groups, details, loading, error } = useGroups();
  const [selected, setSelected] = useState<string | null>(lastGroupId);
  const [sheet, setSheet] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  useEffect(() => {
    void loadGroups();
  }, []);

  const group: LiveGroup | undefined = groups.find((g) => g.id === selected) ?? groups[0];
  const groupId = group?.id ?? null;
  useEffect(() => {
    if (groupId) {
      lastGroupId = groupId;
      void loadGroup(groupId);
    }
  }, [groupId, today.version]);

  const week = yourWeek(today.date);
  const detail = groupId ? details[groupId] : undefined;

  if (!groups.length) {
    return (
      <>
        <PreviewFrame />
        {loading ? (
          <ActivityIndicator color={colors.saffron} style={{ marginTop: spacing.xl }} />
        ) : (
          <Card>
            <Text style={styles.emptyTitle}>{t('Count together')}</Text>
            <Text style={styles.emptyText}>
              {t('Make a group for your family or friends, or join one with the 6-letter code someone shared with you.')}
            </Text>
            <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
              <PrimaryButton label={t('Create a group')} onPress={() => setSheet(true)} />
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </Card>
        )}
        <NewGroupSheet visible={sheet} onClose={() => setSheet(false)} onDone={(g) => setSelected(g.id)} />
      </>
    );
  }

  const members: BoardMember[] = (detail?.board ?? []).map((r) => ({
    key: r.userId,
    name: r.userId === userId ? settings.name.trim() || r.name || t('You') : r.name,
    streak: r.userId === userId ? today.streak.current : r.streak,
    litDays: r.userId === userId ? week.lit : r.litDays,
    litToday: r.userId === userId ? today.lit : r.litToday,
    salawat: r.userId === userId ? week.total : r.weekTotal,
    me: r.userId === userId,
  }));
  const names = new Map(members.map((m) => [m.key, m.name]));
  const feed: FeedItem[] = (detail?.events ?? []).map((e) => ({
    id: e.id,
    who: e.userId === userId ? t('You') : (names.get(e.userId) ?? t('A member')),
    what: eventText(e),
    when: ago(e.createdAt),
    milestone: e.kind === 'milestone' ? (e.value ?? undefined) : undefined,
    reactions: e.reactions,
    mine: e.mine,
  }));
  const isOwner = group?.role === 'owner';

  const invite = async () => {
    if (!group) return;
    feedback.selection();
    await Share.share({
      message: t('Join my group “{name}” on Salli and let’s send salawat together. Code: {code}', { name: group.name, code: group.inviteCode }),
    });
  };

  return (
    <>
      <GroupChips
        groups={groups.map((g) => ({ id: g.id, name: g.name, count: details[g.id]?.board.length }))}
        selected={groupId}
        onSelect={setSelected}
        onNew={() => setSheet(true)}
      />

      {group && (
        <GoalCard
          progress={detail ? Math.max(detail.weekTotal, week.total) : week.total}
          goal={group.weeklyGoal}
          daysLeft={week.left}
          yourPart={week.total}
          litToday={members.filter((m) => m.litToday).length}
          members={Math.max(1, members.length)}
          onEditGoal={isOwner ? () => setGoalOpen(true) : undefined}
          footer={
            <Pressable onPress={invite} accessibilityRole="button" style={({ pressed }) => [styles.invite, pressed && { opacity: 0.8 }]}>
              <Text style={styles.inviteLabel}>{t('Invite code')}</Text>
              <Text style={styles.inviteCode}>{group.inviteCode}</Text>
              <Text style={styles.inviteShare}>{t('Share ›')}</Text>
            </Pressable>
          }
        />
      )}

      {detail ? (
        <>
          <Leaderboard
            members={members}
            weekDays={week.days}
            nudged={(key) => detail.nudgedToday.includes(key)}
            onNudge={async (m) => {
              feedback.selection();
              try {
                await nudge(groupId!, m.key);
                showToast({ tone: 'quest', title: t('Nudge sent to {name}', { name: m.name }), sub: t('A gentle reminder, never pressure.') });
              } catch (e) {
                showToast({ tone: 'quest', title: e instanceof Error ? e.message : String(e) });
              }
            }}
          />
          <ActivityFeed
            items={feed}
            onReact={(id, r: Reaction) => void toggleReaction(groupId!, id, r)}
            empty={t('When someone lights their lantern or builds part of their masjid, it shows here.')}
          />
        </>
      ) : (
        <ActivityIndicator color={colors.saffron} style={{ marginTop: spacing.lg }} />
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable onPress={() => setConfirmLeave(true)} accessibilityRole="button" style={styles.leave}>
        <Text style={styles.leaveText}>{t('Leave {name}', { name: group?.name ?? '' })}</Text>
      </Pressable>

      <NewGroupSheet visible={sheet} onClose={() => setSheet(false)} onDone={(g) => setSelected(g.id)} />

      <NumberPadSheet
        visible={goalOpen}
        title={t('Weekly goal')}
        max={10000000}
        actionLabel={(a) => (a ? t('Set goal to {n}', { n: a }) : t('Set goal'))}
        onClose={() => setGoalOpen(false)}
        onAdd={async (n) => {
          setGoalOpen(false);
          feedback.medium();
          try {
            await setWeeklyGoal(groupId!, n);
          } catch (e) {
            showToast({ tone: 'quest', title: e instanceof Error ? e.message : String(e) });
          }
        }}
      />

      <Modal visible={confirmLeave} transparent animationType="fade" onRequestClose={() => setConfirmLeave(false)}>
        <View style={styles.modalRoot}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>{t('Leave {name}?', { name: group?.name ?? '' })}</Text>
            <Text style={styles.dialogText}>{t('Your own counts stay with you. You can rejoin any time with the code.')}</Text>
            <Pressable
              accessibilityRole="button"
              style={styles.dangerBtn}
              onPress={async () => {
                setConfirmLeave(false);
                if (groupId) await leaveGroup(groupId).catch(() => {});
                setSelected(null);
              }}>
              <Text style={styles.dangerText}>{t('Leave group')}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" style={styles.cancelBtn} onPress={() => setConfirmLeave(false)}>
              <Text style={styles.cancelText}>{t('Stay')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

/** Create a group or join one with a code. */
function NewGroupSheet({ visible, onClose, onDone }: { visible: boolean; onClose: () => void; onDone: (g: LiveGroup) => void }) {
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const ready = mode === 'create' ? name.trim().length > 0 : code.replace(/\s/g, '').length === 6;

  const submit = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const g = mode === 'create' ? await createGroup(name) : await joinGroup(code);
      feedback.add('medium');
      showToast({
        tone: 'quest',
        title: mode === 'create' ? t('{name} is ready', { name: g.name }) : t('You joined {name}', { name: g.name }),
        sub: mode === 'create' ? t('Share the code {code} to invite people', { code: g.inviteCode }) : t('Your lantern now counts with theirs'),
      });
      setName('');
      setCode('');
      onDone(g);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetRoot}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t('Close')} />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <Segmented<'create' | 'join'>
            options={[
              { value: 'create', label: t('Create a group') },
              { value: 'join', label: t('Join with a code') },
            ]}
            value={mode}
            onChange={(m) => {
              setMode(m);
              setErr(null);
            }}
          />
          {mode === 'create' ? (
            <>
              <Text style={styles.fieldLabel}>{t('Group name')}</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={t('e.g. Family, Friends, Masjid brothers')}
                placeholderTextColor={colors.muted}
                style={styles.input}
                maxLength={60}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={submit}
              />
            </>
          ) : (
            <>
              <Text style={styles.fieldLabel}>{t('Invite code')}</Text>
              <TextInput
                value={code}
                onChangeText={(v) => setCode(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                placeholder="ABC123"
                placeholderTextColor={colors.muted}
                style={[styles.input, styles.codeInput]}
                autoCapitalize="characters"
                autoCorrect={false}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={submit}
              />
            </>
          )}
          {err ? <Text style={styles.error}>{err}</Text> : null}
          <PrimaryButton
            label={busy ? t('One moment…') : mode === 'create' ? t('Create group') : t('Join group')}
            onPress={submit}
            disabled={!ready || busy}
          />
        </View>
      </View>
    </Modal>
  );
}

// ============================ preview ============================

const PREVIEW_KEY = 'groups.previewDismissed';

/** The sample group, framed and clearly labelled, with a close button. */
function PreviewFrame() {
  const [hidden, setHidden] = useState(() => storage.getBoolean(PREVIEW_KEY) ?? false);
  useEffect(() => onPreviewToggle(setHidden), []);
  if (hidden) return null;
  return (
    <View style={styles.frame}>
      <View style={styles.frameHead}>
        <View style={styles.framePill}>
          <Text style={styles.framePillText}>{t('Preview')}</Text>
        </View>
        <Text style={styles.frameTitle} numberOfLines={2}>
          {t('A sample group, to show how it works')}
        </Text>
        <Pressable
          onPress={() => setPreviewHidden(true)}
          accessibilityRole="button"
          accessibilityLabel={t('Close preview')}
          hitSlop={10}
          style={styles.frameClose}>
          <Text style={styles.frameCloseText}>✕</Text>
        </Pressable>
      </View>
      <View style={styles.frameBody}>
        <PreviewGroups />
      </View>
      <PrimaryButton label={t('Close preview')} variant="secondary" onPress={() => setPreviewHidden(true)} />
    </View>
  );
}

const previewListeners = new Set<(hidden: boolean) => void>();
function setPreviewHidden(hidden: boolean) {
  storage.set(PREVIEW_KEY, hidden);
  previewListeners.forEach((l) => l(hidden));
}
function onPreviewToggle(fn: (hidden: boolean) => void) {
  previewListeners.add(fn);
  return () => {
    previewListeners.delete(fn);
  };
}

/** Signed out: the preview (until closed), then the real, empty Groups page. */
function SignedOutGroups() {
  const [previewHidden, setHidden] = useState(() => storage.getBoolean(PREVIEW_KEY) ?? false);
  useEffect(() => onPreviewToggle(setHidden), []);
  return (
    <>
      <PreviewFrame />
      <Card>
        <Text style={styles.emptyTitle}>{t('No groups yet')}</Text>
        <Text style={styles.emptyText}>
          {t('Sign in, then create a group and share its 6-letter code with family or friends. Your count stays private unless you choose to share it in Me.')}
        </Text>
        <View style={{ marginTop: spacing.md }}>
          <PrimaryButton label={t('Sign in to create a group')} onPress={() => router.push('/sign-in')} />
        </View>
        {previewHidden && (
          <Pressable onPress={() => setPreviewHidden(false)} accessibilityRole="button" style={styles.showPreview}>
            <Text style={styles.showPreviewText}>{t('See the preview again')}</Text>
          </Pressable>
        )}
      </Card>
    </>
  );
}

type SampleGroup = { id: string; name: string; goal: number; progress: number; members: Omit<BoardMember, 'key'>[]; activity: () => FeedItem[] };

/** Preview groups. `salawat: null` = that member keeps their count private. */
const SAMPLES: SampleGroup[] = [
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
      { id: 'f1', who: 'Yusuf', what: t('built The Courtyard · 10,000 salawat'), when: t('8 min'), milestone: 10000, reactions: { ameen: 4, mashallah: 3 }, mine: [] },
      { id: 'f2', who: 'Amina', what: t('lit her lantern · 23-day streak'), when: t('12 min'), reactions: { ameen: 3, mashallah: 2 }, mine: [] },
      { id: 'f3', who: t('The family'), what: t('passed 6,000 toward the weekly goal'), when: t('2 h'), reactions: { ameen: 0, mashallah: 4 }, mine: [] },
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
      { id: 'r1', who: 'Bilal', what: t('reached a 41-day streak'), when: t('30 min'), reactions: { ameen: 2, mashallah: 5 }, mine: [] },
      { id: 'r2', who: 'Zayd', what: t('lit his lantern after Asr'), when: t('1 h'), reactions: { ameen: 1, mashallah: 0 }, mine: [] },
    ],
  },
];

function PreviewGroups() {
  const settings = useSettings();
  const today = useToday();
  const [groupId, setGroupId] = useState(SAMPLES[0].id);
  const [nudged, setNudged] = useState<Record<string, boolean>>({});
  const [mine, setMine] = useState<Record<string, Reaction[]>>({});

  const group = SAMPLES.find((g) => g.id === groupId) ?? SAMPLES[0];
  const week = yourWeek(today.date);
  const you: BoardMember = { key: 'you', name: settings.name.trim() || t('You'), streak: today.streak.current, litDays: week.lit, litToday: today.lit, salawat: week.total, me: true };
  const members: BoardMember[] = [...group.members.map((m) => ({ ...m, key: m.name, litDays: Math.min(m.litDays, week.days) })), you];
  const feed = group.activity().map((a) => {
    const m = mine[a.id] ?? [];
    return { ...a, mine: m, reactions: { ameen: a.reactions.ameen + (m.includes('ameen') ? 1 : 0), mashallah: a.reactions.mashallah + (m.includes('mashallah') ? 1 : 0) } };
  });

  return (
    <>
      <GroupChips groups={SAMPLES.map((g) => ({ id: g.id, name: t(g.name), count: g.members.length + 1 }))} selected={group.id} onSelect={setGroupId} onNew={() => router.push('/sign-in')} />
      <GoalCard
        progress={group.progress + week.total}
        goal={group.goal}
        daysLeft={week.left}
        yourPart={week.total}
        litToday={members.filter((m) => m.litToday).length}
        members={members.length}
      />
      <Leaderboard
        members={members}
        weekDays={week.days}
        nudged={(k) => !!nudged[`${group.id}:${k}`]}
        onNudge={(m) => {
          feedback.selection();
          setNudged((n) => ({ ...n, [`${group.id}:${m.key}`]: true }));
          showToast({ tone: 'quest', title: t('Nudge sent to {name}', { name: m.name }), sub: t('A gentle reminder, never pressure.') });
        }}
      />
      <ActivityFeed
        items={feed}
        onReact={(id, r) =>
          setMine((s) => {
            const cur = s[id] ?? [];
            return { ...s, [id]: cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r] };
          })
        }
      />
    </>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
    content: { paddingHorizontal: spacing.lg, paddingBottom: 32, gap: spacing.lg, maxWidth: 520, width: '100%', alignSelf: 'center' },
    frame: {
      borderRadius: radius.card + 6,
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: colors.saffron,
      padding: spacing.md,
      gap: spacing.md,
      backgroundColor: colors.highlight,
    },
    frameHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    framePill: { backgroundColor: colors.saffron, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
    framePillText: { fontFamily: fonts.uiSemi, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: '#2A1E10' },
    frameTitle: { flex: 1, fontFamily: fonts.uiMedium, fontSize: 13, color: colors.ink },
    frameClose: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
    frameCloseText: { fontSize: 16, color: colors.ink },
    frameBody: { gap: spacing.lg, opacity: 0.92 },
    showPreview: { alignSelf: 'center', paddingVertical: spacing.sm, marginTop: spacing.sm },
    showPreviewText: { fontFamily: fonts.uiSemi, fontSize: 13, color: colors.link },
    emptyTitle: { fontFamily: fonts.display, fontSize: 26, color: colors.ink },
    emptyText: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 21, color: colors.muted, marginTop: 4 },
    error: { fontFamily: fonts.uiMedium, fontSize: 13, color: colors.terracotta, marginTop: spacing.sm, textAlign: 'center' },
    invite: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.md,
      backgroundColor: 'rgba(251,246,236,0.12)',
      borderRadius: 14,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
    },
    inviteLabel: { fontFamily: fonts.uiSemi, fontSize: 12, color: colors.lightGold, textTransform: 'uppercase', letterSpacing: 0.8 },
    inviteCode: { flex: 1, fontFamily: fonts.uiSemi, fontSize: 18, letterSpacing: 3, color: colors.onPrimary },
    inviteShare: { fontFamily: fonts.uiSemi, fontSize: 14, color: colors.lightGold },
    leave: { alignSelf: 'center', paddingVertical: spacing.sm },
    leaveText: { fontFamily: fonts.uiMedium, fontSize: 13, color: colors.muted },
    liveTitle: { fontFamily: fonts.uiSemi, fontSize: 15, color: colors.ink },
    liveText: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 19, color: colors.muted, marginTop: 4 },
    sheetRoot: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(22,19,15,0.5)' },
    sheet: {
      backgroundColor: colors.plaster,
      borderTopLeftRadius: radius.card,
      borderTopRightRadius: radius.card,
      padding: spacing.lg,
      paddingBottom: spacing.xl,
      gap: spacing.md,
      width: '100%',
      maxWidth: 560,
      alignSelf: 'center',
    },
    grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.cardBorder },
    fieldLabel: { fontFamily: fonts.uiSemi, fontSize: 13, color: colors.muted, marginBottom: -spacing.sm },
    input: {
      height: 52,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      backgroundColor: colors.card,
      paddingHorizontal: spacing.md,
      fontFamily: fonts.uiMedium,
      fontSize: 17,
      color: colors.ink,
    },
    codeInput: { fontFamily: fonts.uiSemi, fontSize: 24, letterSpacing: 8, textAlign: 'center' },
    modalRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(22,19,15,0.5)', padding: spacing.lg },
    dialog: { width: '100%', maxWidth: 400, backgroundColor: colors.card, borderRadius: radius.card, padding: spacing.lg, gap: spacing.sm },
    dialogTitle: { fontFamily: fonts.display, fontSize: 24, color: colors.ink },
    dialogText: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 20, color: colors.muted },
    dangerBtn: { height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#B0412E', marginTop: spacing.sm },
    dangerText: { fontFamily: fonts.uiSemi, fontSize: 15, color: '#FFFFFF' },
    cancelBtn: { height: 44, alignItems: 'center', justifyContent: 'center' },
    cancelText: { fontFamily: fonts.uiSemi, fontSize: 15, color: colors.link },
  }),
);

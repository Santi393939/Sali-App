/** Me: profile, milestone badges and settings. */
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Card, EightPointStar, NumberPadSheet, PrimaryButton, ScreenHeader, Segmented, Toggle } from '@/components';
import { JourneyCard, Medallion, MilestoneSheet, MilestoneUnlock, RewardsCard } from '@/components/milestones';
import type { Milestone } from '@/content/milestones';
import { useRewards } from '@/store/rewards';
import { useTabs } from '@/components/tabs';
import { feedback } from '@/lib/feedback';
import { signOut, useAuth } from '@/store/auth';
import { useToday } from '@/store/counts';
import { GOAL_MAX, updateSettings, useSettings, type CountingStyle } from '@/store/settings';
import type { MilestoneState } from '@/store/milestones';
import { useSyncStatus } from '@/store/sync';
import { colors, fonts, radius, spacing } from '@/theme';

const fmt = (n: number) => n.toLocaleString('en-US');

export default function MeScreen() {
  const insets = useSafeAreaInsets();
  const today = useToday();
  const settings = useSettings();
  const [goalOpen, setGoalOpen] = useState(false);
  const totals = { lifetime: today.lifetime, year: today.yearTotal };
  const journey = today.milestones;
  const rewards = useRewards();
  const featured = rewards.featured;
  const [openMilestone, setOpenMilestone] = useState<MilestoneState | null>(null);
  const [replay, setReplay] = useState<Milestone | null>(null);
  const tabs = useTabs();
  const initial = settings.name.trim().charAt(0).toUpperCase();

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
        keyboardShouldPersistTaps="handled">
        <ScreenHeader title="Me" arabic="حسابي" />

        {/* Profile */}
        <Card>
          <View style={styles.profile}>
            <View style={styles.avatar}>
              <EightPointStar size={84} fill={colors.zelligeGreen} stroke={colors.saffron} strokeWidth={2} />
              <View style={[StyleSheet.absoluteFill, styles.center]}>
                {initial ? <Text style={styles.initial}>{initial}</Text> : <PersonGlyph />}
              </View>
              {featured && (
                <View style={styles.featured} accessibilityLabel={`Featured badge: ${featured.name}`}>
                  <Medallion size={36} milestone={featured} earned />
                </View>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <TextInput
                value={settings.name}
                onChangeText={(name) => updateSettings({ name })}
                placeholder="Add your name"
                placeholderTextColor={colors.muted}
                style={styles.name}
                maxLength={40}
                accessibilityLabel="Your name"
                returnKeyType="done"
              />
              <Text style={styles.yearTotal}>
                {fmt(totals.year)} salawat in {today.date.slice(0, 4)}
              </Text>
              <Text style={styles.lifetime}>{fmt(totals.lifetime)} all time</Text>
              {featured && <Text style={[styles.featuredName, { color: featured.palette.face }]}>{featured.title}</Text>}
            </View>
          </View>
        </Card>

        <AccountCard />

        {/* Milestones: the masjid journey */}
        <JourneyCard progress={journey} today={today.date} onOpen={setOpenMilestone} />

        <RewardsCard
          lifetime={today.lifetime}
          active={rewards}
          onLocked={(amount) => setOpenMilestone(journey.list.find((m) => m.amount === amount) ?? null)}
        />

        {/* Settings */}
        <Card padded={false}>
          <Text style={[styles.sectionTitle, styles.padded]}>Settings</Text>

          <Pressable
            style={styles.row}
            accessibilityRole="button"
            onPress={() => {
              feedback.sheetOpen();
              setGoalOpen(true);
            }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Daily goal</Text>
              <Text style={styles.rowHint}>Applies from today</Text>
            </View>
            <Text style={styles.rowValue}>{fmt(settings.dailyGoal)}</Text>
            <Chevron />
          </Pressable>

          <View style={[styles.row, styles.rowColumn]}>
            <Text style={styles.rowLabel}>Counting style</Text>
            <Segmented<CountingStyle>
              options={[
                { value: 'up', label: 'Count up' },
                { value: 'down', label: 'Count down' },
              ]}
              value={settings.countingStyle}
              onChange={(countingStyle) => updateSettings({ countingStyle })}
            />
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>After-Asr reminder</Text>
              <Text style={styles.rowHint}>A gentle nudge if your lantern is waiting</Text>
            </View>
            <Toggle label="After-Asr reminder" value={settings.asrReminder} onChange={(asrReminder) => updateSettings({ asrReminder })} />
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Friday reminders</Text>
              <Text style={styles.rowHint}>For the Jumu&apos;ah goal</Text>
            </View>
            <Toggle
              label="Friday reminders"
              value={settings.fridayReminders}
              onChange={(fridayReminders) => updateSettings({ fridayReminders })}
            />
          </View>

          <View style={[styles.row, styles.rowLast]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Show my count to group</Text>
              <Text style={styles.rowHint}>Off: members see only the group total and your streak</Text>
            </View>
            <Toggle
              label="Show my count to group"
              value={settings.shareCountWithGroup}
              onChange={(shareCountWithGroup) => updateSettings({ shareCountWithGroup })}
            />
          </View>
        </Card>

        {/* Telegram */}
        <Card>
          <View style={styles.telegram}>
            <View style={styles.tgIcon}>
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={colors.cobalt} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round">
                <Path d="M21 4 3 11l6 2 2 6 3-4 5 4Z M9 13l9-6" />
              </Svg>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Log from group chats</Text>
              <Text style={styles.rowHint}>Connect the Salli Telegram bot. Arrives with the bot step.</Text>
            </View>
            <View style={styles.soon}>
              <Text style={styles.soonText}>Soon</Text>
            </View>
          </View>
        </Card>
      </ScrollView>

      <MilestoneSheet
        milestone={openMilestone}
        progress={journey}
        today={today.date}
        onClose={() => setOpenMilestone(null)}
        onCountNow={() => {
          setOpenMilestone(null);
          tabs.goTo(0);
        }}
        onReplay={(m) => {
          setOpenMilestone(null);
          setTimeout(() => setReplay(m), 260);
        }}
      />

      <MilestoneUnlock milestone={replay} onClose={() => setReplay(null)} />

      <NumberPadSheet
        visible={goalOpen}
        title="Daily goal"
        max={GOAL_MAX}
        actionLabel={(a) => (a ? `Set goal to ${a}` : 'Set goal')}
        onClose={() => setGoalOpen(false)}
        onAdd={(n) => {
          feedback.medium();
          updateSettings({ dailyGoal: n });
          setGoalOpen(false);
        }}
      />
    </View>
  );
}

function AccountCard() {
  const { session, configured } = useAuth();
  const sync = useSyncStatus();
  if (session) {
    const email = session.user.email ?? 'Signed in';
    const when = sync.lastSyncedAt ? timeAgo(sync.lastSyncedAt) : 'not yet';
    return (
      <Card>
        <View style={styles.account}>
          <View style={[styles.syncDot, sync.state === 'error' && { backgroundColor: '#C2543D' }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.rowLabel} numberOfLines={1}>
              {email}
            </Text>
            <Text style={styles.rowHint}>
              {sync.state === 'syncing'
                ? 'Syncing…'
                : sync.state === 'error'
                  ? 'Will retry when you are back online'
                  : `Synced ${when}`}
            </Text>
          </View>
          <Pressable onPress={() => signOut()} accessibilityRole="button" style={styles.signOut}>
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </View>
      </Card>
    );
  }
  return (
    <Card>
      <Text style={styles.rowLabel}>Keep your counts safe</Text>
      <Text style={styles.rowHint}>
        {configured
          ? 'Sign in to sync across phones, join a family group and log from Telegram.'
          : 'Your counts are saved on this phone. Accounts switch on once Supabase is connected.'}
      </Text>
      <View style={{ marginTop: spacing.md }}>
        <PrimaryButton label="Sign in" onPress={() => router.push('/sign-in')} />
      </View>
    </Card>
  );
}

function timeAgo(iso: string) {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function PersonGlyph() {
  return (
    <Svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke={colors.card} strokeWidth={1.8} strokeLinecap="round">
      <Path d="M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM5.5 20c1-3.2 3.4-5 6.5-5s5.5 1.8 6.5 5" />
    </Svg>
  );
}

function Chevron() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.muted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="m9 6 6 6-6 6" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingBottom: 32, gap: spacing.lg, maxWidth: 520, width: '100%', alignSelf: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  profile: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  avatar: { width: 84, height: 84 },
  featured: { position: 'absolute', right: -8, bottom: -6 },
  featuredName: { fontFamily: fonts.uiSemi, fontSize: 12, color: colors.saffron, marginTop: 4 },
  initial: { fontFamily: fonts.display, fontSize: 34, color: colors.card },
  name: { fontFamily: fonts.display, fontSize: 28, color: colors.ink, padding: 0, minHeight: 36, outlineStyle: 'none' } as object,
  yearTotal: { fontFamily: fonts.uiMedium, fontSize: 14, color: colors.ink },
  lifetime: { fontFamily: fonts.ui, fontSize: 12, color: colors.muted, marginTop: 2 },

  sectionTitle: { fontFamily: fonts.display, fontSize: 24, color: colors.ink },
  padded: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    minHeight: 56,
  },
  rowColumn: { flexDirection: 'column', alignItems: 'stretch', gap: spacing.sm },
  rowLast: { paddingBottom: spacing.lg },
  rowLabel: { fontFamily: fonts.uiMedium, fontSize: 15, color: colors.ink },
  rowHint: { fontFamily: fonts.ui, fontSize: 12, color: colors.muted, marginTop: 2 },
  rowValue: { fontFamily: fonts.display, fontVariant: ['lining-nums'], fontSize: 22, color: colors.terracotta },

  telegram: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  account: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  syncDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.zelligeGreen },
  signOut: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm },
  signOutText: { fontFamily: fonts.uiSemi, fontSize: 14, color: colors.terracotta },
  tgIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.plaster,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soon: { borderRadius: radius.pill, borderWidth: 1, borderColor: colors.cardBorder, paddingHorizontal: 10, paddingVertical: 4 },
  soonText: { fontFamily: fonts.uiSemi, fontSize: 12, color: colors.muted },
});

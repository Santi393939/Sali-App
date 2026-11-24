/**
 * Me, in three views so the tab stays short:
 *  - main (the tab): profile, your year, account, your masjid, and a menu;
 *  - rewards (its own screen): lamps & Jumu'ah, badge sets, themes, glass, sounds;
 *  - settings (its own screen): settings, Telegram, privacy & data.
 */
import { router } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Card, EightPointStar, LampsCard, Logo, NumberPadSheet, RewardsBanner, ScreenHeader, Segmented, ShareSheet, Toggle, YearBanner } from '@/components';
import { JourneyCard, Medallion, MilestoneSheet, MilestoneUnlock, RewardsCard } from '@/components/milestones';
import type { Milestone } from '@/content/milestones';
import { switchTheme } from '@/lib/themeSwitch';
import { applyMilestoneRewards, useRewards } from '@/store/rewards';
import { useTabs } from '@/components/tabs';
import { feedback } from '@/lib/feedback';
import { signOut, useAuth } from '@/store/auth';
import { getLocation } from '@/lib/salliDay';
import { showToast } from '@/lib/toast';
import { deleteAllData, shareExport } from '@/store/dataControls';
import { useToday } from '@/store/counts';
import { GOAL_MAX, updateSettings, useSettings, type CountingStyle, type Appearance } from '@/store/settings';
import type { MilestoneState } from '@/store/milestones';
import { useSyncStatus } from '@/store/sync';
import { colors, fonts, isDarkMode, paletteFor, radius, spacing, themedStyles } from '@/theme';
import { LANGUAGES, dateLocale, t, type Lang } from '@/lib/i18n';
import { recapAsOf } from '@/store/recap';

const fmt = (n: number) => n.toLocaleString('en-US');

/** Your place in each view, kept when a theme or language change rebuilds the screens. */
const scrollMemory: Record<MeView, number> = {
  main: 0,
  rewards: 0,
  settings: 0,
};

export type MeView = 'main' | 'rewards' | 'settings';

export default function MeScreen({ view = 'main' }: { view?: MeView }) {
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  useEffect(() => {
    const y = scrollMemory[view];
    if (y > 0) scrollRef.current?.scrollTo({ y, animated: false });
  }, [view]);
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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const tabs = useTabs();
  const initial = settings.name.trim().charAt(0).toUpperCase();
  const recapDay = recapAsOf(today.date);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        ref={scrollRef}
        onScroll={(e) => (scrollMemory[view] = e.nativeEvent.contentOffset.y)}
        scrollEventThrottle={64}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
        keyboardShouldPersistTaps="handled">
        {view === 'main' ? (
          <ScreenHeader title={t('Me')} arabic="حسابي" />
        ) : (
          <View>
            <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={10} style={styles.back}>
              <Text style={styles.backText}>{t('‹ Me')}</Text>
            </Pressable>
            <ScreenHeader title={view === 'rewards' ? t('Rewards & themes') : t('Settings')} />
          </View>
        )}
        {view === 'main' && (
          <>
            {/* Profile */}
            <Card>
              <View style={styles.profile}>
                <View style={styles.avatar}>
                  <EightPointStar size={84} fill={colors.zelligeGreen} stroke={colors.saffron} strokeWidth={2} />
                  <View style={[StyleSheet.absoluteFill, styles.center]}>{initial ? <Text style={styles.initial}>{initial}</Text> : <PersonGlyph />}</View>
                  {featured && (
                    <View
                      style={styles.featured}
                      accessibilityLabel={t('Featured badge: {name}', {
                        name: featured.name,
                      })}>
                      <Medallion size={36} milestone={featured} earned />
                    </View>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <TextInput
                    value={settings.name}
                    onChangeText={(name) => updateSettings({ name })}
                    placeholder={t('Add your name')}
                    placeholderTextColor={colors.muted}
                    style={styles.name}
                    maxLength={40}
                    accessibilityLabel={t('Your name')}
                    returnKeyType="done"
                  />
                  <Text style={styles.yearTotal}>
                    {t('{n} salawat in {year}', {
                      n: fmt(totals.year),
                      year: today.date.slice(0, 4),
                    })}
                  </Text>
                  <Text style={styles.lifetime}>{t('{n} all time', { n: fmt(totals.lifetime) })}</Text>
                  {featured && (
                    <Text
                      style={[
                        styles.featuredName,
                        {
                          color: isDarkMode() ? colors.link : featured.palette.face,
                        },
                      ]}>
                      {featured.title}
                    </Text>
                  )}
                  <Pressable onPress={() => setShareOpen(true)} accessibilityRole="button" style={styles.shareBtn}>
                    <Text style={styles.shareText}>{t('Share my progress')}</Text>
                  </Pressable>
                </View>
              </View>
            </Card>

            <RewardsBanner progress={journey} featured={featured} />

            {recapDay && <YearBanner year={recapDay.slice(0, 4)} />}

            <AccountCard />

            {/* Milestones: the masjid journey */}
            <JourneyCard progress={journey} today={today.date} onOpen={setOpenMilestone} />

            {/* Everything else, one tap away */}
            <Card padded={false}>
              <Pressable style={[styles.row, styles.rowLast]} accessibilityRole="button" onPress={() => router.push('/settings')}>
                <View style={styles.menuIcon}>
                  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={colors.link} strokeWidth={1.8} strokeLinecap="round">
                    <Path d="M4 7h10M18 7h2M4 17h4M12 17h8M16 4v6M10 14v6" />
                  </Svg>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>{t('Settings')}</Text>
                  <Text style={styles.rowHint}>{t('Goal, reminders, language, appearance, privacy')}</Text>
                </View>
                <Chevron />
              </Pressable>
            </Card>
          </>
        )}

        {view === 'rewards' && (
          <>
            <LampsCard lamps={today.lamps.lit} nextIn={today.lamps.nextIn} fridayStreak={today.friday.streak} fridayBadge={today.friday.badge} />

            <RewardsCard
              lifetime={today.lifetime}
              active={rewards}
              onLocked={(amount) => setOpenMilestone(journey.list.find((m) => m.amount === amount) ?? null)}
            />
          </>
        )}

        {view === 'settings' && (
          <>
            {/* Settings */}
            <Card padded={false}>
              <Pressable
                style={styles.row}
                accessibilityRole="button"
                onPress={() => {
                  feedback.sheetOpen();
                  setGoalOpen(true);
                }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>{t('Daily goal')}</Text>
                  <Text style={styles.rowHint}>{t('Applies from today')}</Text>
                </View>
                <Text style={styles.rowValue}>{fmt(settings.dailyGoal)}</Text>
                <Chevron />
              </Pressable>

              <View style={[styles.row, styles.rowColumn]}>
                <Text style={styles.rowLabel}>{t('Counting style')}</Text>
                <Segmented<CountingStyle>
                  options={[
                    { value: 'up', label: t('Count up') },
                    { value: 'down', label: t('Count down') },
                  ]}
                  value={settings.countingStyle}
                  onChange={(countingStyle) => updateSettings({ countingStyle })}
                />
              </View>

              <View style={[styles.row, styles.rowColumn]}>
                <Text style={styles.rowLabel}>{t('Appearance')}</Text>
                <Segmented<Appearance>
                  options={[
                    { value: 'system', label: t('Automatic') },
                    { value: 'light', label: t('Light') },
                    { value: 'dark', label: t('Dark') },
                  ]}
                  value={settings.appearance}
                  onChange={(appearance) => updateSettings({ appearance })}
                />
              </View>

              <View style={[styles.row, styles.rowColumn]}>
                <Text style={styles.rowLabel}>{t('Language')}</Text>
                <Segmented<Lang>
                  options={LANGUAGES.map((l) => ({
                    value: l.id,
                    label: l.name,
                  }))}
                  value={settings.language}
                  onChange={(language) => updateSettings({ language })}
                />
              </View>

              <Pressable style={styles.row} accessibilityRole="button" onPress={() => router.push('/city')}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>{t('City')}</Text>
                  <Text style={styles.rowHint}>{t('Sets Maghrib (when your day turns) and reminder times')}</Text>
                </View>
                <Text style={styles.rowCity}>{getLocation()?.city ?? t('Not set')}</Text>
                <Chevron />
              </Pressable>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>{t('After-Asr reminder')}</Text>
                  <Text style={styles.rowHint}>{t('A gentle nudge if your lantern is waiting')}</Text>
                </View>
                <Toggle label={t('After-Asr reminder')} value={settings.asrReminder} onChange={(asrReminder) => updateSettings({ asrReminder })} />
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>{t('Before-Maghrib reminder')}</Text>
                  <Text style={styles.rowHint}>{t('An hour before the day turns, if your lantern is waiting')}</Text>
                </View>
                <Toggle
                  label={t('Before-Maghrib reminder')}
                  value={settings.preMaghribReminder}
                  onChange={(preMaghribReminder) => updateSettings({ preMaghribReminder })}
                />
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>{t('Friday reminders')}</Text>
                  <Text style={styles.rowHint}>{t('For the Jumu’ah goal')}</Text>
                </View>
                <Toggle label={t('Friday reminders')} value={settings.fridayReminders} onChange={(fridayReminders) => updateSettings({ fridayReminders })} />
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>{t('Sounds')}</Text>
                  <Text style={styles.rowHint}>{t('Ticks, chimes and your tap sound')}</Text>
                </View>
                <Toggle label={t('Sounds')} value={settings.sounds} onChange={(sounds) => updateSettings({ sounds })} />
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>{t('Vibration')}</Text>
                  <Text style={styles.rowHint}>{t('Taps you can feel with each count')}</Text>
                </View>
                <Toggle label={t('Vibration')} value={settings.haptics} onChange={(haptics) => updateSettings({ haptics })} />
              </View>

              <View style={[styles.row, styles.rowLast]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>{t('Show my count to group')}</Text>
                  <Text style={styles.rowHint}>{t('Off: members see only the group total and your streak')}</Text>
                </View>
                <Toggle
                  label={t('Show my count to group')}
                  value={settings.shareCountWithGroup}
                  onChange={(shareCountWithGroup) => updateSettings({ shareCountWithGroup })}
                />
              </View>
            </Card>

            {/* Telegram */}
            <Card>
              <View style={styles.telegram}>
                <View style={styles.tgIcon}>
                  <Svg
                    width={22}
                    height={22}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={colors.cobalt}
                    strokeWidth={1.8}
                    strokeLinejoin="round"
                    strokeLinecap="round">
                    <Path d="M21 4 3 11l6 2 2 6 3-4 5 4Z M9 13l9-6" />
                  </Svg>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>{t('Log from group chats')}</Text>
                  <Text style={styles.rowHint}>{t('Connect the Salli Telegram bot. Arrives with the bot step.')}</Text>
                </View>
                <View style={styles.soon}>
                  <Text style={styles.soonText}>{t('Soon')}</Text>
                </View>
              </View>
            </Card>

            {/* Privacy & data */}
            <Card padded={false}>
              <Text style={[styles.sectionTitle, styles.padded]}>{t('Privacy & data')}</Text>
              <Pressable style={styles.row} accessibilityRole="button" onPress={() => router.push('/privacy')}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>{t('Privacy policy')}</Text>
                  <Text style={styles.rowHint}>{t('No ads, no tracking. Here is what Salli keeps')}</Text>
                </View>
                <Chevron />
              </Pressable>
              <Pressable
                style={styles.row}
                accessibilityRole="button"
                onPress={async () => {
                  const r = await shareExport();
                  showToast(
                    r === 'failed'
                      ? {
                          tone: 'quest',
                          title: t('Could not export'),
                          sub: t('Please try again'),
                        }
                      : {
                          tone: 'quest',
                          title: r === 'copied' ? t('Copied your data') : t('Data ready to share'),
                          sub: t('Everything Salli keeps, as text'),
                        },
                  );
                }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>{t('Export my data')}</Text>
                  <Text style={styles.rowHint}>{t('A copy of your counts, streaks and settings')}</Text>
                </View>
                <Chevron />
              </Pressable>
              <Pressable style={[styles.row, styles.rowLast]} accessibilityRole="button" onPress={() => setConfirmDelete(true)}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowLabel, { color: '#B0412E' }]}>{t('Delete all my data')}</Text>
                  <Text style={styles.rowHint}>{t('Wipes everything from this phone')}</Text>
                </View>
              </Pressable>
            </Card>
          </>
        )}

        {view === 'settings' && (
          <View style={styles.footer}>
            <Logo size={44} />
            <Text style={styles.footerName}>Salli · صلِّ</Text>
            <Text style={styles.footerText}>{t('Version 0.1 · preview')}</Text>
            <Text style={styles.footerText}>{t('Qur’an and hadith texts are awaiting review by a qualified scholar.')}</Text>
          </View>
        )}
      </ScrollView>

      <MilestoneSheet
        milestone={openMilestone}
        progress={journey}
        today={today.date}
        onClose={() => setOpenMilestone(null)}
        onCountNow={() => {
          setOpenMilestone(null);
          if (view !== 'main') router.back();
          tabs.goTo(0);
        }}
        onWear={(m) => {
          setOpenMilestone(null);
          feedback.add('large');
          setTimeout(() => switchTheme(() => applyMilestoneRewards(m), m.theme, paletteFor(m.theme).plaster, m), 220);
        }}
        onReplay={(m) => {
          setOpenMilestone(null);
          setTimeout(() => setReplay(m), 260);
        }}
      />

      <MilestoneUnlock milestone={replay} onClose={() => setReplay(null)} />
      <ShareSheet visible={shareOpen} initial="masjid" today={today} onClose={() => setShareOpen(false)} />

      <Modal visible={confirmDelete} transparent animationType="fade" onRequestClose={() => setConfirmDelete(false)}>
        <View style={styles.confirmRoot}>
          <View style={styles.confirm}>
            <Text style={styles.confirmTitle}>{t('Delete everything?')}</Text>
            <Text style={styles.confirmText}>
              {t('Your counts, streaks, quests, rewards and settings will be removed from this phone. This can’t be undone.')}
            </Text>
            <Pressable
              accessibilityRole="button"
              style={styles.deleteBtn}
              onPress={async () => {
                setConfirmDelete(false);
                await deleteAllData();
                router.replace('/onboarding');
              }}>
              <Text style={styles.deleteText}>{t('Delete all my data')}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" style={styles.cancelBtn} onPress={() => setConfirmDelete(false)}>
              <Text style={styles.cancelText}>{t('Keep my data')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <NumberPadSheet
        visible={goalOpen}
        title={t('Daily goal')}
        max={GOAL_MAX}
        actionLabel={(a) => (a ? t('Set goal to {n}', { n: a }) : t('Set goal'))}
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
    const email = session.user.email ?? t('Signed in');
    const when = sync.lastSyncedAt ? timeAgo(sync.lastSyncedAt) : t('not yet');
    return (
      <Card>
        <View style={styles.account}>
          <View style={[styles.syncDot, sync.state === 'error' && { backgroundColor: '#C2543D' }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.rowLabel} numberOfLines={1}>
              {email}
            </Text>
            <Text style={styles.rowHint}>
              {sync.state === 'syncing' ? t('Syncing…') : sync.state === 'error' ? t('Will retry when you are back online') : t('Synced {when}', { when })}
            </Text>
          </View>
          <Pressable onPress={() => signOut()} accessibilityRole="button" style={styles.signOut}>
            <Text style={styles.signOutText}>{t('Sign out')}</Text>
          </Pressable>
        </View>
      </Card>
    );
  }
  return (
    <Pressable onPress={() => router.push('/sign-in')} accessibilityRole="button" style={({ pressed }) => [styles.accountRow, pressed && { opacity: 0.85 }]}>
      <View style={styles.menuIcon}>
        <PersonGlyph size={22} color={colors.link} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{t('Keep your counts safe')}</Text>
        <Text style={styles.rowHint} numberOfLines={2}>
          {configured ? t('Sync across phones and join groups') : t('Saved on this phone for now')}
        </Text>
      </View>
      <View style={styles.signInPill}>
        <Text style={styles.signInPillText}>{t('Sign in')}</Text>
      </View>
    </Pressable>
  );
}

function timeAgo(iso: string) {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return t('just now');
  if (s < 3600) return t('{n} min ago', { n: Math.round(s / 60) });
  if (s < 86400) return t('{n} h ago', { n: Math.round(s / 3600) });
  return new Date(iso).toLocaleDateString(dateLocale(), {
    month: 'short',
    day: 'numeric',
  });
}

function PersonGlyph({ size = 30, color = colors.onPrimary }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round">
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

const styles = themedStyles(() =>
  StyleSheet.create({
    accountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.card,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    signInPill: {
      backgroundColor: colors.zelligeGreen,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.saffron,
      paddingHorizontal: 14,
      paddingVertical: 7,
    },
    signInPillText: { fontFamily: fonts.uiSemi, fontSize: 13, color: colors.onPrimary },
    back: { alignSelf: 'flex-start', paddingVertical: 4, marginBottom: 4 },
    backText: { fontFamily: fonts.uiSemi, fontSize: 15, color: colors.link },
    menuIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.plaster,
    },
    content: {
      paddingHorizontal: spacing.lg,
      paddingBottom: 32,
      gap: spacing.lg,
      maxWidth: 520,
      width: '100%',
      alignSelf: 'center',
    },
    center: { alignItems: 'center', justifyContent: 'center' },
    profile: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
    avatar: { width: 84, height: 84 },
    featured: { position: 'absolute', right: -8, bottom: -6 },
    featuredName: {
      fontFamily: fonts.uiSemi,
      fontSize: 12,
      color: colors.saffron,
      marginTop: 4,
    },
    initial: {
      fontFamily: fonts.display,
      fontSize: 34,
      color: colors.onPrimary,
    },
    name: {
      fontFamily: fonts.display,
      fontSize: 28,
      color: colors.ink,
      padding: 0,
      minHeight: 36,
      outlineStyle: 'none',
    } as object,
    yearTotal: { fontFamily: fonts.uiMedium, fontSize: 14, color: colors.ink },
    lifetime: {
      fontFamily: fonts.ui,
      fontSize: 12,
      color: colors.muted,
      marginTop: 2,
    },

    sectionTitle: {
      fontFamily: fonts.display,
      fontSize: 24,
      color: colors.ink,
    },
    padded: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.sm,
    },

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
    rowColumn: {
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: spacing.sm,
    },
    rowLast: { paddingBottom: spacing.lg },
    rowLabel: { fontFamily: fonts.uiMedium, fontSize: 15, color: colors.ink },
    rowHint: {
      fontFamily: fonts.ui,
      fontSize: 12,
      color: colors.muted,
      marginTop: 2,
    },
    confirmRoot: {
      flex: 1,
      backgroundColor: 'rgba(22,19,15,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
    },
    confirm: {
      width: '100%',
      maxWidth: 380,
      backgroundColor: colors.card,
      borderRadius: radius.card,
      padding: spacing.xl,
      gap: spacing.md,
    },
    confirmTitle: {
      fontFamily: fonts.display,
      fontSize: 28,
      color: colors.ink,
    },
    confirmText: {
      fontFamily: fonts.ui,
      fontSize: 15,
      lineHeight: 22,
      color: colors.muted,
    },
    deleteBtn: {
      height: 52,
      borderRadius: radius.button,
      backgroundColor: '#B0412E',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing.sm,
    },
    deleteText: { fontFamily: fonts.uiSemi, fontSize: 16, color: '#FFFFFF' },
    cancelBtn: { height: 48, alignItems: 'center', justifyContent: 'center' },
    cancelText: { fontFamily: fonts.uiSemi, fontSize: 15, color: colors.link },
    shareBtn: {
      alignSelf: 'flex-start',
      marginTop: spacing.sm,
      borderRadius: 999,
      borderWidth: 1.5,
      borderColor: colors.saffron,
      paddingHorizontal: 12,
      paddingVertical: 5,
    },
    shareText: { fontFamily: fonts.uiSemi, fontSize: 12, color: colors.link },
    footer: { alignItems: 'center', gap: 4, paddingVertical: spacing.lg },
    footerName: {
      fontFamily: fonts.display,
      fontSize: 20,
      color: colors.ink,
      marginTop: 4,
    },
    footerText: {
      fontFamily: fonts.ui,
      fontSize: 12,
      color: colors.muted,
      textAlign: 'center',
      maxWidth: 280,
    },
    rowCity: {
      fontFamily: fonts.uiSemi,
      fontSize: 14,
      color: colors.terracotta,
    },
    rowValue: {
      fontFamily: fonts.display,
      fontVariant: ['lining-nums'],
      fontSize: 22,
      color: colors.terracotta,
    },

    telegram: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    account: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    syncDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.zelligeGreen,
    },
    signOut: {
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: spacing.sm,
    },
    signOutText: {
      fontFamily: fonts.uiSemi,
      fontSize: 14,
      color: colors.terracotta,
    },
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
    soon: {
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    soonText: { fontFamily: fonts.uiSemi, fontSize: 12, color: colors.muted },
  }),
);

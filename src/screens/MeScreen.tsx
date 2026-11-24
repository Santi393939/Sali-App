/** Me: profile, milestone badges and settings. */
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Card, EightPointStar, NumberPadSheet, ScreenHeader, Segmented, Toggle } from '@/components';
import { eightPointStarPath } from '@/components/geometry';
import { feedback } from '@/lib/feedback';
import { useToday } from '@/store/counts';
import { GOAL_MAX, updateSettings, useSettings, type CountingStyle } from '@/store/settings';
import { lifetimeTotals, MILESTONES } from '@/store/stats';
import { colors, fonts, radius, spacing } from '@/theme';

const fmt = (n: number) => n.toLocaleString('en-US');
const short = (n: number) => (n >= 1000000 ? `${n / 1000000}M` : `${n / 1000}k`);

export default function MeScreen() {
  const insets = useSafeAreaInsets();
  const today = useToday();
  const settings = useSettings();
  const [goalOpen, setGoalOpen] = useState(false);
  const totals = useMemo(() => lifetimeTotals(today.date), [today.date, today.total]); // eslint-disable-line react-hooks/exhaustive-deps
  const next = MILESTONES.find((m) => totals.lifetime < m);
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
            </View>
          </View>
        </Card>

        {/* Milestones */}
        <Card>
          <Text style={styles.sectionTitle}>Milestones</Text>
          <View style={styles.badges}>
            {MILESTONES.map((m) => (
              <Badge key={m} label={short(m)} earned={totals.lifetime >= m} />
            ))}
          </View>
          {next ? (
            <>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${(totals.lifetime / next) * 100}%` }]} />
              </View>
              <Text style={styles.nextText}>
                {fmt(next - totals.lifetime)} to your {short(next)} badge
              </Text>
            </>
          ) : (
            <Text style={styles.nextText}>Every badge earned. ما شاء الله</Text>
          )}
        </Card>

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

function Badge({ label, earned }: { label: string; earned: boolean }) {
  const s = 64;
  return (
    <View style={styles.badge} accessibilityLabel={`${label} badge${earned ? ', earned' : ''}`}>
      <Svg width={s} height={s}>
        <Path
          d={eightPointStarPath(s / 2, s / 2, s / 2 - 2)}
          fill={earned ? colors.zelligeGreen : colors.plaster}
          stroke={earned ? colors.saffron : colors.cardBorder}
          strokeWidth={2}
        />
        <Path
          d={eightPointStarPath(s / 2, s / 2, s / 2 - 9)}
          fill="none"
          stroke={earned ? colors.lightGold : colors.cardBorder}
          strokeOpacity={earned ? 0.6 : 1}
          strokeDasharray={earned ? undefined : '3 3'}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Text style={[styles.badgeText, earned && styles.badgeTextEarned]}>{label}</Text>
      </View>
    </View>
  );
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
  initial: { fontFamily: fonts.display, fontSize: 34, color: colors.card },
  name: { fontFamily: fonts.display, fontSize: 28, color: colors.ink, padding: 0, minHeight: 36, outlineStyle: 'none' } as object,
  yearTotal: { fontFamily: fonts.uiMedium, fontSize: 14, color: colors.ink },
  lifetime: { fontFamily: fonts.ui, fontSize: 12, color: colors.muted, marginTop: 2 },

  sectionTitle: { fontFamily: fonts.display, fontSize: 24, color: colors.ink },
  padded: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  badges: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.md, marginTop: spacing.md },
  badge: { width: '31%', alignItems: 'center', height: 64 },
  badgeText: { fontFamily: fonts.uiSemi, fontSize: 13, color: colors.muted },
  badgeTextEarned: { color: colors.lightGold },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.plaster, marginTop: spacing.lg, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: colors.saffron },
  nextText: { fontFamily: fonts.ui, fontSize: 13, color: colors.muted, marginTop: spacing.sm },

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

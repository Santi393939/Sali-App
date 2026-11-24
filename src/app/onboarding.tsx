/**
 * First-run welcome: what Salli is → daily goal → city (for Maghrib) →
 * reminders. Shown once; everything can be changed later on Me.
 */
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CityPicker, Logo, PlasterPattern, PrimaryButton, Segmented, Toggle, ZelligeBand } from '@/components';
import { feedback } from '@/lib/feedback';
import { requestReminderPermission } from '@/lib/notifications';
import { updateSettings, useSettings } from '@/store/settings';
import { colors, fonts, radius, spacing, themedStyles } from '@/theme';
import { LANGUAGES, t, type Lang } from '@/lib/i18n';
import { sallaParts } from '@/components/sallaParts';

const STEPS = 4;
const GOALS = () => [
  { value: 100, label: t('A gentle start') },
  { value: 300, label: t('Steady') },
  { value: 500, label: t('Committed') },
  { value: 1000, label: t('Recommended') },
  { value: 3000, label: t('Devoted') },
];

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const settings = useSettings();
  const [step, setStep] = useState(0);
  const enter = useSharedValue(1);

  useEffect(() => {
    enter.set(0);
    enter.set(withTiming(1, { duration: 360, easing: Easing.out(Easing.cubic) }));
  }, [step, enter]);
  const stepStyle = useAnimatedStyle(() => ({ opacity: enter.value, transform: [{ translateX: (1 - enter.value) * 28 }] }));

  const next = () => {
    feedback.selection();
    setStep((s) => Math.min(STEPS - 1, s + 1));
  };
  const finish = async () => {
    await requestReminderPermission();
    feedback.add('large');
    updateSettings({ onboarded: true });
    router.replace('/');
  };

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl }]}
      keyboardShouldPersistTaps="handled">
      <View style={styles.dots} accessibilityLabel={t('Step {n} of {total}', { n: step + 1, total: STEPS })}>
        {Array.from({ length: STEPS }, (_, i) => (
          <View key={i} style={[styles.dot, i === step && styles.dotOn, i < step && styles.dotDone]} />
        ))}
      </View>

      <Animated.View style={[{ gap: spacing.lg }, stepStyle]}>
        {step === 0 && (
          <>
            <Segmented<Lang>
              options={LANGUAGES.map((l) => ({ value: l.id, label: l.name }))}
              value={settings.language}
              onChange={(language) => updateSettings({ language })}
            />
            <View style={styles.hero}>
              <PlasterPattern />
              <View style={styles.heroBody}>
                <Logo size={120} />
                <Text style={styles.brand}>Salli</Text>
                <Text style={styles.brandAr}>صلِّ</Text>
                <Text style={styles.lead}>
                  {sallaParts(t('Send blessings on the Prophet ﷺ every day. Count them, keep your lantern lit, and build your masjid.'), styles.salla)}
                </Text>
              </View>
              <ZelligeBand height={20} />
            </View>
            <View style={styles.quote}>
              <Text style={styles.quoteAr}>مَنْ صَلَّى عَلَيَّ وَاحِدَةً صَلَّى اللَّهُ عَلَيْهِ عَشْرًا</Text>
              {settings.language !== 'ar' && <Text style={styles.quoteEn}>{t('“Whoever sends blessings upon me once, Allah sends blessings upon him ten times.”')}</Text>}
              <Text style={styles.quoteRef}>{t('Ṣaḥīḥ Muslim 408')}</Text>
            </View>
            <PrimaryButton label={t('Begin')} onPress={next} />
          </>
        )}

        {step === 1 && (
          <>
            <Text style={styles.title}>{t('Your daily goal')}</Text>
            <Text style={styles.sub}>{t('Reach it each day to light your lantern and grow your streak. You can change it any time.')}</Text>
            <View style={styles.goals}>
              {GOALS().map((g) => {
                const selected = settings.dailyGoal === g.value;
                return (
                  <Pressable
                    key={g.value}
                    onPress={() => {
                      feedback.medium();
                      updateSettings({ dailyGoal: g.value });
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={({ pressed }) => [styles.goal, selected && styles.goalOn, pressed && { transform: [{ scale: 0.97 }] }]}>
                    <Text style={[styles.goalNum, selected && { color: colors.onPrimary }]}>{g.value.toLocaleString('en-US')}</Text>
                    <Text style={[styles.goalLabel, selected && { color: colors.onPrimary }]}>{g.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <PrimaryButton label={t('Continue')} onPress={next} />
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.title}>{t('Where are you?')}</Text>
            <Text style={styles.sub}>{t('A Salli day runs Maghrib to Maghrib, like the Islamic day. Your city sets when it turns and when reminders arrive.')}</Text>
            <CityPicker />
            <PrimaryButton label={t('Continue')} onPress={next} />
            <Pressable onPress={next} accessibilityRole="button" style={styles.skip}>
              <Text style={styles.skipText}>{t('Skip for now (the day turns at 6 pm)')}</Text>
            </Pressable>
          </>
        )}

        {step === 3 && (
          <>
            <Text style={styles.title}>{t('Gentle reminders')}</Text>
            <Text style={styles.sub}>{t('Only when your lantern is still waiting. Never guilt, never spam.')}</Text>
            <View style={styles.reminders}>
              <ReminderRow
                title={t('After Asr')}
                hint={t('A nudge if today’s lantern isn’t lit yet')}
                value={settings.asrReminder}
                onChange={(asrReminder) => updateSettings({ asrReminder })}
              />
              <ReminderRow
                title={t('An hour before Maghrib')}
                hint={t('Keep your streak glowing')}
                value={settings.preMaghribReminder}
                onChange={(preMaghribReminder) => updateSettings({ preMaghribReminder })}
              />
              <ReminderRow
                title={t('Friday')}
                hint={t('Jumu’ah, the day to send abundant salawat')}
                value={settings.fridayReminders}
                onChange={(fridayReminders) => updateSettings({ fridayReminders })}
                last
              />
            </View>
            <PrimaryButton label={Platform.OS === 'web' ? t('Start counting') : t('Allow reminders & start')} onPress={finish} />
          </>
        )}
      </Animated.View>
    </ScrollView>
  );
}

function ReminderRow({ title, hint, value, onChange, last }: { title: string; hint: string; value: boolean; onChange: (v: boolean) => void; last?: boolean }) {
  return (
    <View style={[styles.reminder, last && { borderBottomWidth: 0 }]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.reminderTitle}>{title}</Text>
        <Text style={styles.reminderHint}>{hint}</Text>
      </View>
      <Toggle label={title} value={value} onChange={onChange} />
    </View>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: colors.plaster },
    content: { paddingHorizontal: spacing.lg, gap: spacing.lg, maxWidth: 520, width: '100%', alignSelf: 'center' },
    dots: { flexDirection: 'row', gap: 6, alignSelf: 'center' },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.cardBorder },
    dotOn: { width: 24, backgroundColor: colors.saffron },
    dotDone: { backgroundColor: colors.zelligeGreen },
    hero: { backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.cardBorder, overflow: 'hidden' },
    heroBody: { alignItems: 'center', padding: spacing.xl, gap: 4 },
    brand: { fontFamily: fonts.display, fontSize: 44, color: colors.ink, marginTop: spacing.sm },
    brandAr: { fontFamily: fonts.arabicBold, fontSize: 26, lineHeight: 42, color: colors.terracotta },
    lead: { fontFamily: fonts.ui, fontSize: 16, lineHeight: 24, color: colors.muted, textAlign: 'center', maxWidth: 320, marginTop: spacing.xs },
    salla: { fontFamily: fonts.arabic, fontSize: 18 },
    quote: { backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.cardBorder, padding: spacing.lg, alignItems: 'center', gap: 6 },
    quoteAr: { fontFamily: fonts.arabic, fontSize: 22, lineHeight: 40, color: colors.terracotta, textAlign: 'center' },
    quoteEn: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 21, color: colors.ink, textAlign: 'center' },
    quoteRef: { fontFamily: fonts.uiSemi, fontSize: 12, color: colors.saffron },
    title: { fontFamily: fonts.display, fontSize: 34, lineHeight: 40, color: colors.ink, marginTop: spacing.md },
    sub: { fontFamily: fonts.ui, fontSize: 15, lineHeight: 22, color: colors.muted, marginTop: -spacing.sm },
    goals: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    goal: {
      width: '48%',
      flexGrow: 1,
      borderRadius: radius.card,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      backgroundColor: colors.card,
      paddingVertical: spacing.lg,
      alignItems: 'center',
    },
    goalOn: { backgroundColor: colors.zelligeGreen, borderColor: colors.saffron },
    goalNum: { fontFamily: fonts.display, fontVariant: ['lining-nums'], fontSize: 32, color: colors.ink },
    goalLabel: { fontFamily: fonts.uiMedium, fontSize: 12, color: colors.muted },
    skip: { height: 44, alignItems: 'center', justifyContent: 'center' },
    skipText: { fontFamily: fonts.uiSemi, fontSize: 14, color: colors.muted },
    reminders: { backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.cardBorder },
    reminder: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
    reminderTitle: { fontFamily: fonts.uiMedium, fontSize: 15, color: colors.ink },
    reminderHint: { fontFamily: fonts.ui, fontSize: 12, color: colors.muted, marginTop: 2 },
  }),
);

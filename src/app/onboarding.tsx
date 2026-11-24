/**
 * First-run welcome: what Salli is → three questions about your habit →
 * a recommended daily goal → city (for Maghrib) → reminders. Shown once;
 * everything can be changed later on Me.
 */
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CityPicker, Logo, PlasterPattern, PrimaryButton, Segmented, Toggle, ZelligeBand } from '@/components';
import { feedback } from '@/lib/feedback';
import { ABUNDANT_GOAL, GOAL_LADDER, nextGoalStep, previousGoalStep, recommendGoal, type HabitAnswers } from '@/lib/habitGoal';
import { requestReminderPermission } from '@/lib/notifications';
import { updateSettings, useSettings } from '@/store/settings';
import { colors, fonts, radius, spacing, themedStyles } from '@/theme';
import { LANGUAGES, t, type Lang } from '@/lib/i18n';
import { sallaParts } from '@/components/sallaParts';

const STEPS = 5;

type Question<K extends keyof HabitAnswers> = { key: K; title: string; options: { value: HabitAnswers[K]; label: string }[] };
const QUESTIONS = (): [Question<'frequency'>, Question<'amount'>, Question<'time'>] => [
  {
    key: 'frequency',
    title: t('How often do you send salawat now?'),
    options: [
      { value: 'rarely', label: t('Rarely') },
      { value: 'weekly', label: t('A few times a week') },
      { value: 'most', label: t('Most days') },
      { value: 'daily', label: t('Every day') },
    ],
  },
  {
    key: 'amount',
    title: t('On a day you do, about how many?'),
    options: [
      { value: 'few', label: t('A few (under 10)') },
      { value: 'tens', label: t('10 to 50') },
      { value: 'hundred', label: t('Around 100') },
      { value: 'many', label: t('300 or more') },
    ],
  },
  {
    key: 'time',
    title: t('How much time can you give each day?'),
    options: [
      { value: 'one', label: t('About a minute') },
      { value: 'five', label: t('About 5 minutes') },
      { value: 'fifteen', label: t('About 15 minutes') },
      { value: 'more', label: t('More than that') },
    ],
  },
];

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const settings = useSettings();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<HabitAnswers>>({});
  const complete = answers.frequency && answers.amount && answers.time ? (answers as HabitAnswers) : null;
  const recommended = complete ? recommendGoal(complete) : null;
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
            <Text style={styles.title}>{t('Your habit today')}</Text>
            <Text style={styles.sub}>{t('Three quick questions, so your first goal is one you can keep every day.')}</Text>
            {QUESTIONS().map((q) => (
              <View key={q.key} style={styles.question}>
                <Text style={styles.questionTitle}>{q.title}</Text>
                <View style={styles.choices}>
                  {q.options.map((o) => {
                    const selected = answers[q.key] === o.value;
                    return (
                      <Pressable
                        key={o.value}
                        onPress={() => {
                          feedback.selection();
                          setAnswers((prev) => ({ ...prev, [q.key]: o.value }));
                        }}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        style={({ pressed }) => [styles.choice, selected && styles.choiceOn, pressed && { transform: [{ scale: 0.97 }] }]}>
                        <Text style={[styles.choiceText, selected && { color: colors.onPrimary }]}>{o.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
            <PrimaryButton
              label={complete ? t('See my goal') : t('Answer all three to continue')}
              disabled={!complete}
              onPress={() => {
                if (!recommended) return;
                updateSettings({ dailyGoal: recommended });
                next();
              }}
            />
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.title}>{t('Your daily goal')}</Text>
            <Text style={styles.sub}>{t('Just enough to stretch you, not so much that it wears you out. A habit kept every day grows.')}</Text>
            <View style={styles.recommend}>
              <PlasterPattern />
              <Text style={styles.recommendEyebrow}>{settings.dailyGoal === recommended ? t('Recommended for you') : t('Your choice')}</Text>
              <Text style={styles.recommendNum}>{settings.dailyGoal.toLocaleString('en-US')}</Text>
              <Text style={styles.recommendUnit}>{t('salawat a day')}</Text>
            </View>
            <View style={styles.adjustRow}>
              {goalChoices(recommended ?? 10).map(({ goal: g, label }, i) => {
                const selected = settings.dailyGoal === g;
                return (
                  <Pressable
                    key={`${i}-${g}`}
                    onPress={() => {
                      feedback.medium();
                      updateSettings({ dailyGoal: g });
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    style={({ pressed }) => [styles.goal, selected && styles.goalOn, pressed && { transform: [{ scale: 0.97 }] }]}>
                    <Text style={[styles.goalNum, selected && { color: colors.onPrimary }]}>{g.toLocaleString('en-US')}</Text>
                    <Text style={[styles.goalLabel, selected && { color: colors.onPrimary }]}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.path}>
              <Text style={styles.pathTitle}>{t('How it grows')}</Text>
              <Text style={styles.pathText}>
                {t('Light your lantern 7 days in a row and Salli will offer the next step. Many scholars describe {n} a day as the least of “abundant” salawat: a goal to grow toward, one step at a time.', { n: ABUNDANT_GOAL })}
              </Text>
              <Text style={styles.pathSteps}>{stepsToward(settings.dailyGoal).join('  ›  ')}</Text>
            </View>
            <PrimaryButton label={t('Continue')} onPress={next} />
          </>
        )}

        {step === 3 && (
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

        {step === 4 && (
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

/** The steps from `goal` toward 300, shortened in the middle when long. */
function stepsToward(goal: number): string[] {
  const steps = GOAL_LADDER.filter((g) => g >= goal && g <= Math.max(goal, ABUNDANT_GOAL)).map((g) => g.toLocaleString('en-US'));
  return steps.length > 6 ? [...steps.slice(0, 4), '…', steps[steps.length - 1]] : steps;
}

/** Three goals to pick from around the recommendation (all different). */
function goalChoices(rec: number) {
  const lower = previousGoalStep(rec);
  const higher = nextGoalStep(rec);
  if (lower < rec && higher) {
    return [
      { goal: lower, label: t('Gentler') },
      { goal: rec, label: t('Recommended') },
      { goal: higher, label: t('A bit more') },
    ];
  }
  if (!higher) return [{ goal: previousGoalStep(lower), label: t('Gentler') }, { goal: lower, label: t('Gentler') }, { goal: rec, label: t('Recommended') }];
  return [
    { goal: rec, label: t('Recommended') },
    { goal: higher, label: t('A bit more') },
    { goal: nextGoalStep(higher) ?? higher, label: t('More') },
  ];
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
      flex: 1,
      borderRadius: radius.card,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      backgroundColor: colors.card,
      paddingVertical: spacing.lg,
      alignItems: 'center',
    },
    goalOn: { backgroundColor: colors.zelligeGreen, borderColor: colors.saffron },
    question: { gap: spacing.sm },
    questionTitle: { fontFamily: fonts.uiSemi, fontSize: 15, color: colors.ink },
    choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    choice: { borderRadius: 999, borderWidth: 1.5, borderColor: colors.cardBorder, backgroundColor: colors.card, paddingHorizontal: 14, paddingVertical: 9 },
    choiceOn: { backgroundColor: colors.zelligeGreen, borderColor: colors.saffron },
    choiceText: { fontFamily: fonts.uiMedium, fontSize: 14, color: colors.ink },
    recommend: { backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1.5, borderColor: colors.saffron, alignItems: 'center', paddingVertical: spacing.xl, overflow: 'hidden' },
    recommendEyebrow: { fontFamily: fonts.uiSemi, fontSize: 12, color: colors.terracotta, textTransform: 'uppercase', letterSpacing: 0.8 },
    recommendNum: { fontFamily: fonts.display, fontVariant: ['lining-nums'], fontSize: 72, lineHeight: 84, color: colors.ink },
    recommendUnit: { fontFamily: fonts.uiMedium, fontSize: 14, color: colors.muted },
    adjustRow: { flexDirection: 'row', gap: spacing.sm },
    path: { backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.cardBorder, padding: spacing.lg, gap: 6 },
    pathTitle: { fontFamily: fonts.uiSemi, fontSize: 15, color: colors.ink },
    pathText: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 19, color: colors.muted },
    pathSteps: { fontFamily: fonts.uiSemi, fontSize: 13, color: colors.link, marginTop: 4 },
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

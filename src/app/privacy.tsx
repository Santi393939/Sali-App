/** Privacy policy (plain language). Keep in sync with docs/privacy-policy.md. */
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components';
import { colors, fonts, radius, spacing, themedStyles } from '@/theme';
import { t } from '@/lib/i18n';

const SECTIONS = (): { title: string; body: string[] }[] => [
  {
    title: t('The short version'),
    body: [
      t('Salli is for your worship, not for advertising. There are no ads, no tracking and no selling of data, ever.'),
      t('Without an account, everything stays on your phone.'),
    ],
  },
  {
    title: t('What is kept on your phone'),
    body: [
      t('Your counts, streaks, quests, rewards, settings, and the city you choose for prayer times.'),
      t('Your city is used only on the phone to work out Asr and Maghrib. If you tap “Use my location”, your position is read once to find the city and is not sent anywhere.'),
    ],
  },
  {
    title: t('If you sign in'),
    body: [
      t('Your counts, daily goal, display name and settings are stored with Supabase (our database provider) so they sync between your phones and work with groups and the Telegram bot.'),
      t('Sign-in is by email code, Apple or Google. We receive your email address, and nothing from your Apple or Google account beyond that.'),
    ],
  },
  {
    title: t('Groups'),
    body: [
      t('Members of a group see the group total, each other’s names and streaks. They never see your counts unless you turn on “Show my count to group” in Me.'),
    ],
  },
  {
    title: t('Reminders'),
    body: [t('Reminders are scheduled on your phone. No reminder content or timing is sent to a server.')],
  },
  {
    title: t('Your choices'),
    body: [
      t('Export: Me › Privacy & data › Export my data gives you a copy of everything Salli keeps.'),
      t('Delete: Me › Privacy & data › Delete all my data wipes it from this phone. Once accounts are live, it will also delete your account and everything stored with it.'),
    ],
  },
  {
    title: t('Contact'),
    body: [t('Questions: privacy@salli.app (placeholder until launch).')],
  },
];

export default function Privacy() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={styles.page} contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl }]}>
      <Text style={styles.title}>{t('Privacy')}</Text>
      <Text style={styles.updated}>{t('Last updated: November 2026 · draft for review before launch')}</Text>
      {SECTIONS().map((s) => (
        <View key={s.title} style={styles.card}>
          <Text style={styles.cardTitle}>{s.title}</Text>
          {s.body.map((b, i) => (
            <Text key={i} style={styles.body}>
              {b}
            </Text>
          ))}
        </View>
      ))}
      <PrimaryButton label={t('Done')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
    </ScrollView>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: colors.plaster },
    content: { paddingHorizontal: spacing.lg, gap: spacing.md, maxWidth: 560, width: '100%', alignSelf: 'center' },
    title: { fontFamily: fonts.display, fontSize: 34, color: colors.ink },
    updated: { fontFamily: fonts.ui, fontSize: 12, color: colors.muted, marginTop: -spacing.sm },
    card: { backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.cardBorder, padding: spacing.lg, gap: spacing.sm },
    cardTitle: { fontFamily: fonts.uiSemi, fontSize: 16, color: colors.ink },
    body: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 21, color: colors.muted },
  }),
);

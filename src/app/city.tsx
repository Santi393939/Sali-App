/** Change the city used for Maghrib, Asr and reminders (from Me). */
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CityPicker, PrimaryButton } from '@/components';
import { colors, fonts, spacing, themedStyles } from '@/theme';
import { t } from '@/lib/i18n';

export default function CityScreen() {
  const insets = useSafeAreaInsets();
  const done = () => (router.canGoBack() ? router.back() : router.replace('/'));
  return (
    <ScrollView style={styles.page} contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl }]} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>{t('Your city')}</Text>
      <Text style={styles.sub}>{t('Salli days run Maghrib to Maghrib. Your city sets when the day turns and when reminders arrive.')}</Text>
      <CityPicker />
      <PrimaryButton label={t('Done')} onPress={done} />
    </ScrollView>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: colors.plaster },
    content: { paddingHorizontal: spacing.lg, gap: spacing.lg, maxWidth: 520, width: '100%', alignSelf: 'center' },
    title: { fontFamily: fonts.display, fontSize: 34, color: colors.ink },
    sub: { fontFamily: fonts.ui, fontSize: 15, lineHeight: 22, color: colors.muted, marginTop: -spacing.sm },
  }),
);

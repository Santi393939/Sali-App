/** A doorway to "Your year in Salli", shown on Me and Stats. */
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { t } from '@/lib/i18n';
import { colors, fonts, radius, spacing, themedStyles } from '@/theme';

import { EightPointStar } from './EightPointStar';
import { PlasterPattern } from './PlasterPattern';

export function YearBanner({ year }: { year: string }) {
  return (
    <Pressable
      onPress={() => router.push('/recap')}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, pressed && { transform: [{ scale: 0.98 }] }]}>
      <PlasterPattern color={colors.lightGold} opacity={0.1} cell={36} />
      <EightPointStar size={44} fill={colors.deepGreen} stroke={colors.lightGold} strokeWidth={1.5} />
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{t('Your {year} in Salli', { year })}</Text>
        <Text style={styles.sub}>{t('Your year so far, told in a few big numbers')}</Text>
      </View>
      <Text style={styles.chev}>›</Text>
    </Pressable>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.zelligeGreen,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: colors.saffron,
      padding: spacing.lg,
      overflow: 'hidden',
    },
    title: { fontFamily: fonts.display, fontSize: 22, color: colors.onPrimary },
    sub: { fontFamily: fonts.ui, fontSize: 12, color: colors.lightGold, marginTop: 2 },
    chev: { fontSize: 28, color: colors.lightGold },
  }),
);

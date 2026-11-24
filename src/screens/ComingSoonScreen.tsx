/** Placeholder for tabs built in later steps (Reminders, Group). */
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HorseshoeArch, PlasterPattern, ScreenHeader, ZelligeBand } from '@/components';
import { colors, fonts, radius, spacing } from '@/theme';

type Props = {
  title: string;
  arabic: string;
  heading: string;
  body: string;
  dark?: boolean;
};

export default function ComingSoonScreen({ title, arabic, heading, body, dark = false }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.page, { paddingTop: insets.top + spacing.md }, dark && { backgroundColor: colors.night }]}>
      <View style={styles.header}>
        {dark ? (
          <>
            <Text style={styles.darkArabic}>{arabic}</Text>
            <Text style={styles.darkTitle}>{title}</Text>
          </>
        ) : (
          <ScreenHeader title={title} arabic={arabic} />
        )}
      </View>
      <View style={[styles.card, dark && styles.cardDark]}>
        <PlasterPattern color={dark ? colors.lightGold : colors.terracotta} opacity={dark ? 0.08 : 0.12} />
        <View style={styles.cardBody}>
          <HorseshoeArch width={110} height={140} fill={dark ? colors.deepGreen : colors.zelligeGreen} />
          <Text style={[styles.heading, dark && { color: colors.card }]}>{heading}</Text>
          <Text style={[styles.body, dark && { color: 'rgba(251,246,236,0.75)' }]}>{body}</Text>
        </View>
        <ZelligeBand height={18} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.plaster, paddingHorizontal: spacing.lg, gap: spacing.lg },
  header: { width: '100%', maxWidth: 520, alignSelf: 'center' },
  darkArabic: { fontFamily: fonts.arabic, fontSize: 15, color: colors.lightGold, textAlign: 'left' },
  darkTitle: { fontFamily: fonts.display, fontSize: 34, lineHeight: 40, color: colors.card },
  card: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  cardDark: { backgroundColor: '#211C16', borderColor: '#3A3127' },
  cardBody: { alignItems: 'center', padding: spacing.xl, gap: spacing.md },
  heading: { fontFamily: fonts.display, fontSize: 26, color: colors.ink, textAlign: 'center' },
  body: { fontFamily: fonts.ui, fontSize: 15, lineHeight: 22, color: colors.muted, textAlign: 'center', maxWidth: 320 },
});

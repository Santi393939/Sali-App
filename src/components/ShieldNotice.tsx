import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { keyToDate } from '@/lib/salliDay';
import { colors, fonts, radius, spacing, themedStyles } from '@/theme';

type Props = {
  /** The day a shield covered. */
  day: string;
  shieldsLeft: number;
  onDismiss: () => void;
};

/** A kind note the morning after a shield is used. Never guilt. */
export function ShieldNotice({ day, shieldsLeft, onDismiss }: Props) {
  const weekday = keyToDate(day).toLocaleDateString('en-US', { weekday: 'long' });
  return (
    <View style={styles.card} accessibilityRole="summary">
      <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={colors.saffron} strokeWidth={1.8} strokeLinejoin="round">
        <Path d="M12 3 4.5 6v5.5c0 4.6 3.1 8.2 7.5 9.5 4.4-1.3 7.5-4.9 7.5-9.5V6Z" />
        <Path d="m9 12 2 2 4-4" strokeLinecap="round" />
      </Svg>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>A shield kept your lantern lit</Text>
        <Text style={styles.body}>
          {weekday} was covered, so your streak carries on.{' '}
          {shieldsLeft > 0
            ? `You have ${shieldsLeft} ${shieldsLeft === 1 ? 'shield' : 'shields'} left.`
            : 'Seven lit days in a row earns another.'}
        </Text>
      </View>
      <Pressable onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Dismiss" style={styles.ok}>
        <Text style={styles.okText}>OK</Text>
      </Pressable>
    </View>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.highlight,
    borderColor: colors.saffron,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.lg,
  },
  title: { fontFamily: fonts.uiSemi, fontSize: 15, color: colors.ink },
  body: { fontFamily: fonts.ui, fontSize: 13, color: colors.muted, marginTop: 2 },
  ok: { minWidth: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  okText: { fontFamily: fonts.uiSemi, fontSize: 15, color: colors.link },
}),
);

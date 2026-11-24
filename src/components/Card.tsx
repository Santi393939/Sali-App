import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing, themedStyles } from '@/theme';

import { ZelligeBand } from './ZelligeBand';

type Props = {
  children?: ReactNode;
  /** Show a zellige strip along the top edge. */
  band?: boolean;
  bandHeight?: number;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Cream card: radius 22, 1 px border. */
export function Card({ children, band = false, bandHeight = 16, padded = true, style }: Props) {
  return (
    <View style={[styles.card, style]}>
      {band && <ZelligeBand height={bandHeight} />}
      <View style={padded ? styles.body : undefined}>{children}</View>
    </View>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  body: {
    padding: spacing.lg,
  },
}),
);

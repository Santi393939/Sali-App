import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, themedStyles, type } from '@/theme';
import { isRTL } from '@/lib/i18n';

/** Arabic caption over a Cormorant screen title, with an optional right side. */
export function ScreenHeader({ title, arabic, right }: { title: string; arabic?: string; right?: ReactNode }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        {/* In Arabic the title already is Arabic, so the caption would repeat it. */}
        {arabic && !isRTL() ? <Text style={styles.arabic}>{arabic}</Text> : null}
        <Text style={styles.title}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  arabic: { fontFamily: 'Amiri_400Regular', fontSize: 15, color: colors.terracotta, textAlign: isRTL() ? 'right' : 'left' },
  title: { fontFamily: fonts.display, fontSize: type.screenTitle, color: colors.ink, lineHeight: 40 },
}),
);

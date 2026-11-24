/** Honest stand-in for the family Jumu'ah card until groups are live. */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, fonts, spacing, themedStyles } from '@/theme';

import { Card } from './Card';
import { horseshoeArchPath } from './geometry';
import { t } from '@/lib/i18n';

/** Ten arched windows, `lit` of them glowing. */
export function ArchWindows({ lit, size = 22 }: { lit: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      {Array.from({ length: 10 }, (_, i) => (
        <Svg key={i} width={size} height={size * 1.3}>
          <Path
            d={horseshoeArchPath(size, size * 1.3, 1)}
            fill={i < lit ? colors.lightGold : colors.plaster}
            stroke={i < lit ? colors.saffron : colors.cardBorder}
            strokeWidth={1.2}
          />
        </Svg>
      ))}
    </View>
  );
}

export function GroupTeaser({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={t('Count together with family: see Groups')}>
      <Card band>
        <Text style={styles.eyebrow}>{t('Family Jumu’ah goal')}</Text>
        <Text style={styles.title}>{t('Count together with family')}</Text>
        <Text style={styles.body}>{t('Set a shared goal each week. A window lights for every tenth of the way, until Friday at Maghrib.')}</Text>
        <View style={{ marginTop: spacing.md }}>
          <ArchWindows lit={6} />
        </View>
        <View style={styles.foot}>
          <Text style={styles.soon}>{t('Arrives with accounts')}</Text>
          <Text style={styles.more}>{t('See how it works ›')}</Text>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
    eyebrow: { fontFamily: fonts.uiSemi, fontSize: 12, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.8 },
    title: { fontFamily: fonts.display, fontSize: 26, color: colors.ink, marginTop: 4 },
    body: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 20, color: colors.muted, marginTop: 2 },
    foot: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
    soon: { fontFamily: fonts.uiSemi, fontSize: 12, color: colors.terracotta },
    more: { fontFamily: fonts.uiSemi, fontSize: 13, color: colors.link },
  }),
);

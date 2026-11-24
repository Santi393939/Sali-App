/**
 * Design kit: every base piece, colour and font on one page, for review.
 * Not part of the app's navigation; open it at /kit.
 */
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, EightPointStar, HorseshoeArch, Lantern, Logo, PrimaryButton, ZelligeBand } from '@/components';
import { colors, fonts, getActiveTheme, PALETTES, spacing, themedStyles, type } from '@/theme';

export default function DesignKit() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + 40 }]}>
      <Text style={styles.title}>Design kit</Text>

      <Card>
        <Text style={styles.eyebrow}>Logo and stars</Text>
        <View style={styles.row}>
          <Logo size={96} />
          <EightPointStar size={56} fill={colors.cobalt} />
          <EightPointStar size={56} fill={colors.zelligeGreen} stroke={colors.saffron} strokeWidth={2} />
          <EightPointStar size={40} fill={colors.saffron} rotation={22.5} />
        </View>
      </Card>

      <Card>
        <Text style={styles.eyebrow}>Zellige band, 14 / 20 / 28 px</Text>
        <View style={{ gap: spacing.md, marginTop: spacing.sm }}>
          <ZelligeBand height={14} />
          <ZelligeBand height={20} />
          <ZelligeBand height={28} />
        </View>
      </Card>

      <Card>
        <Text style={styles.eyebrow}>Lantern: unlit / lit (placeholder)</Text>
        <View style={styles.row}>
          <Lantern size={64} />
          <Lantern size={64} lit />
          <HorseshoeArch width={70} height={90} frameWidth={1.5} />
        </View>
      </Card>

      <Card>
        <Text style={styles.eyebrow}>Colours</Text>
        <View style={styles.swatches}>
          {(Object.entries(PALETTES[getActiveTheme()]).filter(([, v]) => v.startsWith('#')) as [string, string][]).map(([name, hex]) => (
            <View key={name} style={styles.swatch}>
              <View style={[styles.chip, { backgroundColor: hex }]} />
              <Text style={styles.swatchName}>{name}</Text>
              <Text style={styles.swatchHex}>{hex}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <Text style={styles.eyebrow}>Type</Text>
        <Text style={styles.title}>Cormorant Garamond</Text>
        <Text style={styles.arabic}>أميري — صلِّ على النبي</Text>
        <Text style={styles.body}>Inter 15 — interface text. Small text never goes below 11.</Text>
        <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
          <PrimaryButton label="Primary button" />
          <PrimaryButton label="Secondary button" variant="secondary" />
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.plaster },
  content: { paddingHorizontal: spacing.lg, gap: spacing.lg, maxWidth: 520, width: '100%', alignSelf: 'center' },
  title: { fontFamily: fonts.display, fontSize: type.screenTitle, color: colors.ink, lineHeight: 40 },
  eyebrow: { fontFamily: fonts.uiSemi, fontSize: 12, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginTop: spacing.md, flexWrap: 'wrap', gap: spacing.md },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.md },
  swatch: { width: '30%', minWidth: 90 },
  chip: { height: 40, borderRadius: 10, borderWidth: 1, borderColor: colors.cardBorder },
  swatchName: { fontFamily: fonts.uiMedium, fontSize: 12, color: colors.ink, marginTop: 4 },
  swatchHex: { fontFamily: fonts.ui, fontSize: 11, color: colors.muted },
  arabic: { fontFamily: fonts.arabic, fontSize: 20, lineHeight: 36, color: colors.terracotta, writingDirection: 'rtl', textAlign: 'left' },
  body: { fontFamily: fonts.ui, fontSize: type.body, color: colors.ink },
}),
);

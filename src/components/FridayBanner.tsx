/** Jumu'ah banner on Today (Fridays): greeting, Friday streak toward the Jumu'ah Keeper badge. */
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { FRIDAY_BADGE_RUN } from '@/content/extras';
import { colors, fonts, radius, spacing, themedStyles } from '@/theme';

import { EightPointStar } from './EightPointStar';

export function FridayBanner({ streak, badge }: { streak: number; badge: boolean }) {
  return (
    <View style={styles.card}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <LinearGradient id="fri" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#F7DC97" />
            <Stop offset="1" stopColor="#E9B860" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill="url(#fri)" />
      </Svg>
      <View style={styles.row}>
        <EightPointStar size={44} fill={colors.zelligeGreen} stroke="#8F6119" strokeWidth={1.5} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Jumu&apos;ah Mubarak</Text>
          <Text style={styles.ar}>جمعة مباركة</Text>
          <Text style={styles.body}>
            Send abundant salawat on the Prophet <Text style={styles.salla}>ﷺ</Text> today.
          </Text>
        </View>
      </View>
      <View style={styles.foot}>
        {badge ? (
          <Text style={styles.footText}>Jumu&apos;ah Keeper ✓ · Friday streak {streak}</Text>
        ) : (
          <>
            <View style={styles.dots}>
              {Array.from({ length: FRIDAY_BADGE_RUN }, (_, i) => (
                <View key={i} style={[styles.dot, i < streak && styles.dotOn]} />
              ))}
            </View>
            <Text style={styles.footText}>
              {streak}/{FRIDAY_BADGE_RUN} lit Fridays toward the Jumu&apos;ah Keeper badge
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
    card: { borderRadius: radius.card, overflow: 'hidden', padding: spacing.lg, borderWidth: 1, borderColor: '#C98E2B' },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    title: { fontFamily: fonts.display, fontSize: 24, color: '#3B2A0E' },
    ar: { fontFamily: fonts.arabic, fontSize: 16, lineHeight: 26, color: '#6B4A12' },
    body: { fontFamily: fonts.ui, fontSize: 13, color: '#4A3712' },
    salla: { fontFamily: fonts.arabic, fontSize: 20 },
    foot: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
    dots: { flexDirection: 'row', gap: 4 },
    dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: '#8F6119' },
    dotOn: { backgroundColor: colors.zelligeGreen, borderColor: colors.zelligeGreen },
    footText: { fontFamily: fonts.uiSemi, fontSize: 12, color: '#4A3712', flexShrink: 1 },
  }),
);

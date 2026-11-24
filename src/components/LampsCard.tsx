/** Me: lamps lit (one per 5,000) and the Jumu'ah Keeper badge. */
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { FRIDAY_BADGE_RUN, GLASSES, LAMP_STEP } from '@/content/extras';
import { colors, fonts, spacing, themedStyles } from '@/theme';

import { Card } from './Card';
import { EightPointStar } from './EightPointStar';

/** Small oil lamp, lit or not. */
export function OilLamp({ lit, size = 22 }: { lit: boolean; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {lit && <Path d="M12 3c1.6 2 1.6 3.6 0 5-1.6-1.4-1.6-3 0-5Z" fill="#F5A84A" />}
      <Path d="M4 13c0 3 3.6 5 8 5s8-2 8-5H4Z" fill={lit ? colors.saffron : colors.cardBorder} />
      <Path d="M20 13c1.5-.5 2.5-1.6 2.5-3" stroke={lit ? colors.saffron : colors.cardBorder} strokeWidth={1.6} fill="none" strokeLinecap="round" />
      <Path d="M9 18h6l1 2H8Z" fill={lit ? colors.terracotta : colors.cardBorder} />
      <Path d="M11 9.5h2V13h-2Z" fill={lit ? '#8F6119' : colors.cardBorder} />
    </Svg>
  );
}

type Props = { lamps: number; nextIn: number; fridayStreak: number; fridayBadge: boolean };

export function LampsCard({ lamps, nextIn, fridayStreak, fridayBadge }: Props) {
  const shown = Math.min(lamps, 12);
  const nextGlass = GLASSES.find((g) => g.lamp > lamps);
  return (
    <Card>
      <Text style={styles.title}>Lamps & Jumu&apos;ah</Text>
      <View style={styles.section}>
        <View style={styles.lamps}>
          {Array.from({ length: Math.max(shown, 1) + 1 }, (_, i) => (
            <OilLamp key={i} lit={i < shown} />
          ))}
          {lamps > 12 && <Text style={styles.more}>+{lamps - 12}</Text>}
        </View>
        <Text style={styles.label}>
          {lamps} {lamps === 1 ? 'lamp' : 'lamps'} lit · one every {LAMP_STEP.toLocaleString('en-US')}
        </Text>
        <Text style={styles.hint}>
          Next lamp in {nextIn.toLocaleString('en-US')}
          {nextGlass ? ` · unlocks ${nextGlass.name} lantern glass` : ''}
        </Text>
      </View>
      <View style={[styles.section, styles.border]}>
        <View style={styles.friday}>
          <View style={{ opacity: fridayBadge ? 1 : 0.35 }}>
            <EightPointStar size={46} fill={colors.lightGold} stroke={colors.saffron} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Jumu&apos;ah Keeper</Text>
            <Text style={styles.hint}>
              {fridayBadge
                ? `Earned · Friday streak ${fridayStreak}`
                : `Light your lantern ${FRIDAY_BADGE_RUN} Fridays in a row · ${fridayStreak}/${FRIDAY_BADGE_RUN}`}
            </Text>
          </View>
        </View>
      </View>
    </Card>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
    title: { fontFamily: fonts.display, fontSize: 24, color: colors.ink },
    section: { paddingTop: spacing.md, gap: 4 },
    border: { borderTopWidth: 1, borderTopColor: colors.cardBorder, marginTop: spacing.md },
    lamps: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, alignItems: 'center' },
    more: { fontFamily: fonts.uiSemi, fontSize: 12, color: colors.terracotta, marginLeft: 4 },
    label: { fontFamily: fonts.uiSemi, fontSize: 15, color: colors.ink },
    hint: { fontFamily: fonts.ui, fontSize: 12, color: colors.muted },
    friday: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  }),
);

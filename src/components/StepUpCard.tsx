/** Offer the next goal step after a lit week, or a lighter goal after a hard one. */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { feedback } from '@/lib/feedback';
import { t } from '@/lib/i18n';
import { acceptStepUp, postponeStepUp, STEP_UP_DAYS, type StepUpOffer } from '@/store/habit';
import { colors, fonts, radius, spacing, themedStyles } from '@/theme';

import { EightPointStar } from './EightPointStar';
import { PrimaryButton } from './PrimaryButton';

export function StepUpCard({ offer, today }: { offer: StepUpOffer; today: string }) {
  const up = offer.to > offer.from;
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.badge}>
          <EightPointStar size={44} fill={colors.zelligeGreen} stroke={colors.saffron} strokeWidth={1.5} />
          <Text style={styles.badgeText}>{up ? STEP_UP_DAYS : '♡'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>
            {up
              ? t('{days} lit days at {n}. Ready for the next step?', { days: STEP_UP_DAYS, n: offer.from.toLocaleString('en-US') })
              : t('A lighter goal for a busy stretch?')}
          </Text>
          <Text style={styles.body}>
            {up
              ? t('Your habit is holding. A small step up keeps it growing.')
              : t('{n} a day keeps the habit alive. You can step back up any time.', { n: offer.to.toLocaleString('en-US') })}
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        <PrimaryButton
          compact
          style={{ flex: 1 }}
          label={up ? t('Raise to {n}', { n: offer.to.toLocaleString('en-US') }) : t('Go to {n} for now', { n: offer.to.toLocaleString('en-US') })}
          onPress={() => {
            feedback.add('medium');
            acceptStepUp(offer);
          }}
        />
        <Pressable
          onPress={() => {
            feedback.selection();
            postponeStepUp(offer, today);
          }}
          accessibilityRole="button"
          hitSlop={8}
          style={styles.later}>
          <Text style={styles.laterText}>{up ? t('Not yet') : t('Keep {n}', { n: offer.from.toLocaleString('en-US') })}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
    card: { backgroundColor: colors.highlight, borderColor: colors.saffron, borderWidth: 1.5, borderRadius: radius.card, padding: spacing.lg, gap: spacing.md },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    badge: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    badgeText: { position: 'absolute', fontFamily: fonts.display, fontSize: 18, color: colors.onPrimary },
    title: { fontFamily: fonts.uiSemi, fontSize: 15, lineHeight: 21, color: colors.ink },
    body: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 19, color: colors.muted, marginTop: 2 },
    actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    later: { paddingHorizontal: spacing.md, height: 44, justifyContent: 'center' },
    laterText: { fontFamily: fonts.uiSemi, fontSize: 14, color: colors.muted },
  }),
);

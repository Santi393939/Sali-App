/** Bottom sheet with one milestone's story: earned date, or progress and arrival estimate. */
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { keyToDate } from '@/lib/salliDay';
import { etaLabel, type MilestoneProgress, type MilestoneState } from '@/store/milestones';
import { colors, fonts, radius, spacing } from '@/theme';

import { PrimaryButton } from '../PrimaryButton';
import { Medallion } from './Medallion';

type Props = {
  milestone: MilestoneState | null;
  progress: MilestoneProgress;
  today: string;
  onClose: () => void;
  onCountNow: () => void;
  /** Replay an earned milestone's unlock moment. */
  onReplay?: (m: MilestoneState) => void;
};

const fmt = (n: number) => n.toLocaleString('en-US');

export function MilestoneSheet({ milestone, progress, today, onClose, onCountNow, onReplay }: Props) {
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const [shown, setShown] = useState<MilestoneState | null>(milestone);
  if (milestone && milestone !== shown) setShown(milestone);
  const y = useSharedValue(600);
  const shade = useSharedValue(0);

  useEffect(() => {
    if (milestone) {
      y.set(reduce ? 0 : withSpring(0, { damping: 22, stiffness: 320, mass: 0.8 }));
      shade.set(withTiming(1, { duration: 200 }));
    } else if (shown) {
      shade.set(withTiming(0, { duration: 180 }));
      y.set(
        withTiming(reduce ? 0 : 600, { duration: reduce ? 0 : 200, easing: Easing.in(Easing.quad) }, (done) => {
          if (done) scheduleOnRN(setShown, null);
        }),
      );
    }
  }, [milestone, reduce, y, shade, shown]);

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const shadeStyle = useAnimatedStyle(() => ({ opacity: shade.value }));

  const m = shown;
  const isNext = !!m && progress.next?.amount === m.amount;
  const left = m ? Math.max(0, m.amount - progress.lifetime) : 0;
  const pct = m ? Math.min(1, progress.lifetime / m.amount) : 0;
  const etaAll = m && !m.earned && progress.pace > 0 ? Math.max(1, Math.ceil(left / progress.pace)) : null;

  return (
    <Modal visible={!!shown} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, shadeStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        </Animated.View>
        {m && (
          <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }, sheetStyle]}>
            <View style={styles.grabber} />
            <View style={styles.center}>
              <Medallion size={132} milestone={m} earned={m.earned} next={isNext} progress={isNext ? progress.fraction : 0} />
              <Text style={styles.amount}>{fmt(m.amount)} salawat</Text>
              <Text style={styles.name}>{m.name}</Text>
              <Text style={styles.arabic}>{m.arabic}</Text>
              <Text style={styles.line}>{m.earned ? m.earnedLine : m.goalLine}</Text>
            </View>

            {m.earned ? (
              <View style={styles.stat}>
                <Text style={styles.statText}>
                  {m.earnedOn
                    ? `Reached on ${keyToDate(m.earnedOn).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`
                    : 'Reached'}
                </Text>
              </View>
            ) : (
              <View style={styles.stat}>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${Math.max(2, pct * 100)}%` }]} />
                </View>
                <View style={styles.row}>
                  <Text style={styles.small}>
                    {fmt(progress.lifetime)} / {fmt(m.amount)}
                  </Text>
                  <Text style={[styles.small, { color: colors.terracotta, fontFamily: fonts.uiSemi }]}>{fmt(left)} to go</Text>
                </View>
                <Text style={styles.statText}>
                  {etaAll
                    ? `At about ${fmt(progress.pace)} a day: ${etaAll === 1 ? 'within a day' : `around ${etaLabel(today, etaAll)}`}${etaAll > 60 ? ` (${Math.round(etaAll / 30)} months)` : ''}.`
                    : 'Count today and we will estimate when you will get here.'}
                </Text>
                {!isNext && progress.next && <Text style={styles.small}>Comes after {progress.next.name}.</Text>}
              </View>
            )}

            {m.earned && (
              <View style={styles.titleBox}>
                <Text style={styles.small}>Title</Text>
                <Text style={[styles.titleText, { color: m.palette.face }]}>{m.title}</Text>
              </View>
            )}
            {m.earned && onReplay ? (
              <PrimaryButton label="Replay the moment" onPress={() => onReplay(m)} />
            ) : (
              <PrimaryButton label={m.earned ? 'Close' : 'Count now'} onPress={m.earned ? onClose : onCountNow} />
            )}
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(22,19,15,0.45)' },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.lg,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.cardBorder },
  center: { alignItems: 'center', gap: 4 },
  amount: { fontFamily: fonts.uiSemi, fontSize: 12, color: colors.terracotta, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: spacing.sm },
  name: { fontFamily: fonts.display, fontSize: 32, color: colors.ink },
  arabic: { fontFamily: fonts.arabic, fontSize: 20, lineHeight: 34, color: colors.terracotta },
  line: { fontFamily: fonts.ui, fontSize: 15, lineHeight: 22, color: colors.muted, textAlign: 'center', maxWidth: 320 },
  stat: { backgroundColor: colors.plaster, borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder, padding: spacing.md, gap: 6 },
  statText: { fontFamily: fonts.uiMedium, fontSize: 14, lineHeight: 20, color: colors.ink, textAlign: 'center' },
  track: { height: 10, borderRadius: 5, backgroundColor: colors.card, overflow: 'hidden', borderWidth: 1, borderColor: colors.cardBorder },
  fill: { height: '100%', borderRadius: 5, backgroundColor: colors.saffron },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  titleBox: { alignItems: 'center', marginTop: -spacing.sm },
  titleText: { fontFamily: fonts.display, fontSize: 22 },
  small: { fontFamily: fonts.ui, fontSize: 12, color: colors.muted, textAlign: 'center' },
});

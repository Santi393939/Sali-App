/**
 * Full-screen reveal when a lifetime milestone is reached: the medallion
 * spins in over slowly turning star light, sparks burst, and the new part of
 * the masjid is named. Success haptic + chime on the reveal.
 */
import { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import type { Milestone } from '@/content/milestones';
import { REWARD_FOR_MILESTONE } from '@/content/rewards';
import { feedback } from '@/lib/feedback';
import { colors, fonts, spacing } from '@/theme';

import { eightPointStarPath } from '../geometry';
import { Sparks, type Burst } from '../motion';
import { PlasterPattern } from '../PlasterPattern';
import { ChunkyButton } from '../StreakTakeover';
import { Medallion } from './Medallion';

type Props = { milestone: Milestone | null; onClose: () => void };

export function MilestoneUnlock({ milestone, onClose }: Props) {
  return (
    <Modal visible={!!milestone} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {milestone && <Scene milestone={milestone} onClose={onClose} />}
    </Modal>
  );
}

let burstId = 10000;

function Scene({ milestone, onClose }: { milestone: Milestone; onClose: () => void }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const bg = useSharedValue(0);
  const medal = useSharedValue(reduce ? 1 : 0);
  const rays = useSharedValue(0);
  const text = useSharedValue(reduce ? 1 : 0);
  const [bursts, setBursts] = useState<Burst[]>([]);

  useEffect(() => {
    feedback.sheetOpen();
    bg.set(withTiming(1, { duration: 300 }));
    const reveal = setTimeout(() => {
      feedback.add('large'); // Success + chime
      if (!reduce) setBursts([{ id: burstId++, kind: 'large' }, { id: burstId++, kind: 'medium' }]);
    }, reduce ? 0 : 420);
    if (!reduce) {
      medal.set(withDelay(200, withSpring(1, { damping: 11, stiffness: 120, mass: 0.9 })));
      rays.set(withRepeat(withTiming(1, { duration: 24000, easing: Easing.linear }), -1));
      text.set(withDelay(650, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) })));
    }
    return () => clearTimeout(reveal);
  }, [bg, medal, rays, text, reduce]);

  const bgStyle = useAnimatedStyle(() => ({ opacity: bg.value }));
  const medalStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, medal.value * 1.5),
    transform: [{ scale: 0.3 + 0.7 * medal.value }, { rotate: `${(1 - medal.value) * 200}deg` }],
  }));
  const raysStyle = useAnimatedStyle(() => ({
    opacity: 0.12 * Math.min(1, medal.value),
    transform: [{ rotate: `${rays.value * 360}deg` }, { scale: 0.6 + 0.4 * Math.min(1, medal.value) }],
  }));
  const textStyle = useAnimatedStyle(() => ({ opacity: text.value, transform: [{ translateY: (1 - text.value) * 14 }] }));

  const R = Math.min(width, 420) * 0.62;

  return (
    <Animated.View style={[styles.root, bgStyle, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}>
      <PlasterPattern color={colors.lightGold} opacity={0.08} cell={52} />
      <View style={styles.stage}>
        <Animated.View style={[styles.rays, { width: R * 2, height: R * 2 }, raysStyle]} pointerEvents="none">
          <Svg width={R * 2} height={R * 2}>
            <Path d={eightPointStarPath(R, R, R)} fill={colors.lightGold} />
            <Path d={eightPointStarPath(R, R, R * 0.72, undefined, 22.5)} fill={colors.deepGreen} fillOpacity={0.5} />
          </Svg>
        </Animated.View>
        <View style={styles.sparks} pointerEvents="none">
          <Sparks bursts={bursts} size={320} onDone={(id) => setBursts((b) => b.filter((x) => x.id !== id))} />
        </View>
        <Animated.View style={medalStyle}>
          <Medallion size={168} icon={milestone.icon} earned />
        </Animated.View>
      </View>

      <Animated.View style={[styles.copy, textStyle]}>
        <Text style={styles.eyebrow}>Milestone reached</Text>
        <Text style={styles.name}>{milestone.name}</Text>
        <Text style={styles.arabic}>{milestone.arabic}</Text>
        <Text style={styles.amount}>
          {milestone.amount.toLocaleString('en-US')} salawat <Text style={styles.salla}>ﷺ</Text>
        </Text>
        <Text style={styles.line}>{milestone.earnedLine}</Text>
        {REWARD_FOR_MILESTONE[milestone.amount] && (
          <View style={styles.reward}>
            <Text style={styles.rewardLabel}>Reward unlocked</Text>
            <Text style={styles.rewardText}>{REWARD_FOR_MILESTONE[milestone.amount]}</Text>
            <Text style={styles.rewardHint}>Use it in Me › Rewards</Text>
          </View>
        )}
      </Animated.View>

      <Animated.View style={[styles.buttons, textStyle]}>
        <ChunkyButton label="Continue" onPress={onClose} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.deepGreen, alignItems: 'center', paddingHorizontal: spacing.lg, overflow: 'hidden' },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 260 },
  rays: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  sparks: { position: 'absolute', width: 320, height: 320 },
  copy: { alignItems: 'center', gap: 4, marginBottom: spacing.xl },
  eyebrow: { fontFamily: fonts.uiSemi, fontSize: 12, color: colors.lightGold, textTransform: 'uppercase', letterSpacing: 1.2 },
  name: { fontFamily: fonts.display, fontSize: 44, color: colors.card, textAlign: 'center' },
  arabic: { fontFamily: fonts.arabic, fontSize: 24, lineHeight: 40, color: colors.lightGold },
  amount: { fontFamily: fonts.uiSemi, fontSize: 15, color: colors.card, marginTop: spacing.xs },
  salla: { fontFamily: fonts.arabic, fontSize: 18 },
  line: { fontFamily: fonts.ui, fontSize: 15, lineHeight: 22, color: 'rgba(251,246,236,0.8)', textAlign: 'center', maxWidth: 300, marginTop: spacing.xs },
  buttons: { width: '100%', maxWidth: 360 },
  reward: {
    marginTop: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(233,184,96,0.55)',
    backgroundColor: 'rgba(233,184,96,0.1)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  rewardLabel: { fontFamily: fonts.uiSemi, fontSize: 11, color: colors.lightGold, textTransform: 'uppercase', letterSpacing: 1 },
  rewardText: { fontFamily: fonts.uiSemi, fontSize: 15, color: colors.card, marginTop: 2 },
  rewardHint: { fontFamily: fonts.ui, fontSize: 12, color: 'rgba(251,246,236,0.7)', marginTop: 2 },
});

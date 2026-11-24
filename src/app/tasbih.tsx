/**
 * Full-screen counter: a calm night scene that answers every count.
 *
 * Two ways to count:
 *  - Tap: every touch anywhere is one salawat.
 *  - Hold: keep a finger down; a ring fills at your chosen pace and each time
 *    it closes, one salawat is counted with a single vibration, so you can
 *    recite without looking.
 *
 * Every count: the orb pulses, a ripple spreads from the centre, sparks fly,
 * the glow brightens a little, and one of the 33 beads around the orb lights.
 * Each round of 33 gets a gold flash and a bigger burst. The screen stays
 * awake while it is open. Reduce Motion keeps the counting and drops the
 * movement.
 */
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { EightPointStar, Segmented } from '@/components';
import { Sparks } from '@/components/motion';
import type { Burst } from '@/components/motion/particles';
import { ROUND } from '@/components/TasbihBeads';
import { feedback } from '@/lib/feedback';
import { t } from '@/lib/i18n';
import { addSalawat, getToday, useToday } from '@/store/counts';
import { colors, fonts, spacing, themedStyles } from '@/theme';

type Mode = 'tap' | 'hold';
type Pace = 'slow' | 'steady' | 'quick';
const PACE_MS: Record<Pace, number> = { slow: 3000, steady: 2000, quick: 1200 };

// Remembered while the app is open.
let lastMode: Mode = 'tap';
let lastPace: Pace = 'steady';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
let rippleId = 1;
let burstId = 1;

export default function Tasbih() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduce = useReducedMotion();
  const today = useToday();
  const [mode, setMode] = useState<Mode>(lastMode);
  const [pace, setPace] = useState<Pace>(lastPace);
  const [session, setSession] = useState(0);
  const [ripples, setRipples] = useState<number[]>([]);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [roundBanner, setRoundBanner] = useState<string | null>(null);

  const orb = Math.min(width - 56, height * 0.42, 340);
  const beadR = orb / 2 + 18;
  const stage = orb + 80;

  const pulse = useSharedValue(1);
  const glow = useSharedValue(0);
  const flash = useSharedValue(0);
  const spin = useSharedValue(0);
  const fill = useSharedValue(0);
  const holding = useSharedValue(false);

  // Keep the screen on while counting (quietly skipped where unsupported).
  useEffect(() => {
    activateKeepAwakeAsync('tasbih').catch(() => {});
    return () => {
      deactivateKeepAwake('tasbih').catch(() => {});
    };
  }, []);

  // Slow turning stars behind everything.
  useEffect(() => {
    if (reduce) return;
    spin.set(withRepeat(withTiming(1, { duration: 90000, easing: Easing.linear }), -1));
    return () => cancelAnimation(spin);
  }, [reduce, spin]);

  const taps = today.taps;
  const inRound = taps % ROUND;
  const roundJustDone = taps > 0 && inRound === 0;
  const litBeads = roundJustDone ? ROUND : inRound;

  /** One salawat: save it, then let everything answer. */
  const countOne = (strong: boolean) => {
    const { litNow } = addSalawat(1, 'tap');
    setSession((s) => s + 1);
    const total = getToday().taps;
    const roundDone = total % ROUND === 0 || litNow;
    if (strong) feedback.medium();
    else feedback.add('tap');
    if (litNow) {
      feedback.add('large');
      setRoundBanner(t('Your lantern is lit!'));
      setTimeout(() => setRoundBanner(null), 2200);
      flash.set(withSequence(withTiming(1, { duration: 120 }), withTiming(0, { duration: 900 })));
    } else if (roundDone) {
      feedback.round(total % (ROUND * 3) === 0);
      setRoundBanner(total % (ROUND * 3) === 0 ? t('Tasbih complete') : t('Round {r} complete', { r: total / ROUND }));
      setTimeout(() => setRoundBanner(null), 1600);
      flash.set(withSequence(withTiming(1, { duration: 120 }), withTiming(0, { duration: 700 })));
    }
    if (!reduce) {
      pulse.set(withSequence(withTiming(1.06, { duration: 70 }), withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) })));
      setRipples((r) => [...r.slice(-5), rippleId++]);
    }
    glow.set(Math.min(1, glow.get() + 0.18));
    glow.set(withTiming(0, { duration: 1800 }));
    setBursts((b) => [...b.slice(-6), { id: burstId++, kind: roundDone ? 'large' : strong ? 'small' : 'tap' }]);
  };

  // ---- hold mode: a ring fills at the chosen pace; each full ring is one count ----
  const cycle = () => {
    fill.set(0);
    fill.set(
      withTiming(1, { duration: PACE_MS[pace], easing: Easing.linear }, (done) => {
        if (done) scheduleOnRN(onCycle);
      }),
    );
  };
  const onCycle = () => {
    if (!holding.get()) return;
    countOne(true);
    cycle();
  };
  const startHold = () => {
    holding.set(true);
    feedback.selection();
    cycle();
  };
  const stopHold = () => {
    holding.set(false);
    cancelAnimation(fill);
    fill.set(withTiming(0, { duration: 200 }));
  };
  useEffect(
    () => () => {
      holding.set(false);
    },
    [holding],
  );

  // Gestures: a tap counts once; a hold keeps counting until the finger lifts,
  // however much it drifts (a plain press would cancel on movement).
  const tapGesture = Gesture.Tap()
    .maxDuration(5000)
    .runOnJS(true)
    .onEnd((_e, success) => {
      if (success) countOne(false);
    });
  const holdGesture = Gesture.LongPress()
    .minDuration(0)
    .maxDistance(100000)
    .runOnJS(true)
    .onStart(() => startHold())
    .onFinalize(() => stopHold());

  const orbStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: 0.35 + glow.value * 0.65 }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value * 0.55 }));
  const spinA = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));
  const spinB = useAnimatedStyle(() => ({ transform: [{ rotate: `${-spin.value * 540}deg` }] }));
  const ringR = orb / 2 - 10;
  const ringLen = 2 * Math.PI * ringR;
  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: ringLen * (1 - fill.value) }));

  const goal = today.goal;
  const toGoal = Math.max(0, goal - today.total);

  return (
    <View style={styles.page}>
      {/* Glow that brightens with each count */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, glowStyle]}>
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id="g" cx="50%" cy="45%" r="60%">
              <Stop offset="0" stopColor={colors.saffron} stopOpacity={0.55} />
              <Stop offset="0.5" stopColor={colors.zelligeGreen} stopOpacity={0.25} />
              <Stop offset="1" stopColor={colors.night} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#g)" />
        </Svg>
      </Animated.View>

      {/* Turning stars */}
      <View pointerEvents="none" style={styles.starsWrap}>
        <Animated.View style={[styles.bigStar, { width: height, height }, spinA]}>
          <EightPointStar size={height} fill="transparent" stroke={colors.saffron} strokeWidth={1} />
        </Animated.View>
        <Animated.View style={[styles.bigStar, { width: height * 0.7, height: height * 0.7 }, spinB]}>
          <EightPointStar size={height * 0.7} fill="transparent" stroke={colors.lightGold} strokeWidth={1} />
        </Animated.View>
      </View>

      {/* Top bar */}
      <View style={[styles.top, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('Close')} hitSlop={10} style={styles.close}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Segmented<Mode>
            options={[
              { value: 'tap', label: t('Tap') },
              { value: 'hold', label: t('Hold') },
            ]}
            value={mode}
            onChange={(m) => {
              lastMode = m;
              setMode(m);
            }}
          />
        </View>
        <View style={styles.close} />
      </View>
      {mode === 'hold' && (
        <View style={styles.paceRow}>
          <Segmented<Pace>
            options={[
              { value: 'slow', label: t('Slow') },
              { value: 'steady', label: t('Steady') },
              { value: 'quick', label: t('Quick') },
            ]}
            value={pace}
            onChange={(p) => {
              lastPace = p;
              setPace(p);
            }}
          />
        </View>
      )}

      {/* The counting surface: the whole middle of the screen */}
      <GestureDetector gesture={mode === 'tap' ? tapGesture : holdGesture} userSelect="none">
        <View
          style={styles.surface}
          accessible
          accessibilityRole="button"
          accessibilityLabel={mode === 'tap' ? t('Tap to count one salawat') : t('Hold to count, one salawat per pulse')}
          onAccessibilityTap={() => countOne(false)}>
        {/* Visuals never take the touch, so a hold over the circle isn't interrupted when they redraw. */}
        <View pointerEvents="none" style={{ width: stage, height: stage, alignItems: 'center', justifyContent: 'center' }}>
          {/* Ripples */}
          {ripples.map((id) => (
            <Ripple key={id} size={orb} onDone={() => setRipples((r) => r.filter((x) => x !== id))} />
          ))}

          {/* 33 beads around the orb */}
          {Array.from({ length: ROUND }, (_, i) => {
            const a = (i / ROUND) * Math.PI * 2 - Math.PI / 2;
            const on = i < litBeads;
            return (
              <View
                key={i}
                style={[
                  styles.bead,
                  on && styles.beadOn,
                  { left: stage / 2 + Math.cos(a) * beadR - 5, top: stage / 2 + Math.sin(a) * beadR - 5 },
                ]}
              />
            );
          })}

          <Animated.View style={[styles.orb, { width: orb, height: orb, borderRadius: orb / 2 }, orbStyle]}>
            <Svg width={orb} height={orb} style={StyleSheet.absoluteFill}>
              <Circle cx={orb / 2} cy={orb / 2} r={ringR} stroke={colors.saffron} strokeOpacity={0.25} strokeWidth={6} fill="none" />
              {mode === 'hold' && (
                <AnimatedCircle
                  cx={orb / 2}
                  cy={orb / 2}
                  r={ringR}
                  stroke={colors.lightGold}
                  strokeWidth={6}
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={`${ringLen} ${ringLen}`}
                  animatedProps={ringProps}
                  transform={`rotate(-90 ${orb / 2} ${orb / 2})`}
                />
              )}
            </Svg>
            <View style={styles.orbStar} pointerEvents="none">
              <EightPointStar size={orb * 0.62} fill={colors.deepGreen} stroke={colors.saffron} strokeWidth={1.5} />
            </View>
            <Text style={styles.count} numberOfLines={1} adjustsFontSizeToFit>
              {session.toLocaleString('en-US')}
            </Text>
            <Text style={styles.countLabel}>{t('this session')}</Text>
          </Animated.View>

          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Sparks bursts={bursts} size={stage} onDone={(id) => setBursts((b) => b.filter((x) => x.id !== id))} />
            </View>
          </View>
        </View>

        {roundBanner && (
          <Text pointerEvents="none" style={styles.banner}>
            {roundBanner}
          </Text>
        )}
        </View>
      </GestureDetector>

      {/* Bottom: the words, and today's progress */}
      <View pointerEvents="none" style={[styles.bottom, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Text style={styles.arabic}>اللهم صل وسلم على نبينا محمد</Text>
        <Text style={styles.today}>
          {today.lit
            ? t('Today {n} · lantern lit ✓', { n: today.total.toLocaleString('en-US') })
            : t('Today {n} of {goal} · {left} to light your lantern', {
                n: today.total.toLocaleString('en-US'),
                goal: goal.toLocaleString('en-US'),
                left: toGoal.toLocaleString('en-US'),
              })}
        </Text>
        <Text style={styles.hint}>
          {mode === 'tap' ? t('Tap anywhere. Each tap is one salawat.') : t('Hold anywhere. Each pulse is one salawat.')}
        </Text>
      </View>

      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.flash, flashStyle]} />
    </View>
  );
}

function Ripple({ size, onDone }: { size: number; onDone: () => void }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(
      withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }, (done) => {
        if (done) scheduleOnRN(onDone);
      }),
    );
  }, [p, onDone]);
  const style = useAnimatedStyle(() => ({ opacity: 0.5 * (1 - p.value), transform: [{ scale: 0.9 + p.value * 0.75 }] }));
  return <Animated.View pointerEvents="none" style={[styles.ripple, { width: size, height: size, borderRadius: size / 2 }, style]} />;
}

const styles = themedStyles(() =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: colors.night, overflow: 'hidden' },
    starsWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', opacity: 0.12 },
    bigStar: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
    top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg },
    close: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(251,246,236,0.08)' },
    closeText: { fontSize: 18, color: '#FBF6EC' },
    paceRow: { paddingHorizontal: spacing.xl + 40, marginTop: spacing.sm },
    surface: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    bead: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(251,246,236,0.14)' },
    beadOn: { backgroundColor: colors.lightGold, shadowColor: colors.lightGold, shadowOpacity: 0.9, shadowRadius: 6 },
    orb: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.zelligeGreen, borderWidth: 2, borderColor: colors.saffron, overflow: 'hidden' },
    orbStar: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', opacity: 0.55 },
    count: { fontFamily: fonts.display, fontVariant: ['lining-nums'], fontSize: 96, lineHeight: 108, color: '#FBF6EC', paddingHorizontal: spacing.lg },
    countLabel: { fontFamily: fonts.uiSemi, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: colors.lightGold },
    ripple: { position: 'absolute', borderWidth: 2, borderColor: colors.lightGold },
    banner: { position: 'absolute', bottom: spacing.lg, fontFamily: fonts.display, fontSize: 28, color: colors.lightGold },
    bottom: { alignItems: 'center', paddingHorizontal: spacing.lg, gap: 6 },
    arabic: { fontFamily: fonts.arabic, fontSize: 24, lineHeight: 44, color: colors.lightGold, textAlign: 'center' },
    today: { fontFamily: fonts.uiMedium, fontSize: 14, color: '#FBF6EC', textAlign: 'center' },
    hint: { fontFamily: fonts.ui, fontSize: 12, color: 'rgba(251,246,236,0.6)', textAlign: 'center' },
    flash: { backgroundColor: colors.lightGold },
  }),
);

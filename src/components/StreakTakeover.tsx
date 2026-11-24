/**
 * Streak takeover: plays once when today's goal is met.
 *
 * Timeline (from the moment it opens; haptics in lib/feedback):
 *   0.00 s  screen fades to deep green with a faint tile pattern; the unlit
 *           lantern drops in on its chain with a small overshoot
 *   0.35 s  lantern ignites: flame, glass glow, warm bloom; star-shaped light
 *           spreads over the screen and drifts with the swing; embers rise
 *   0.90 s  streak number flips from yesterday's to today's in gold
 *   1.40 s  today's check stamps into the week row
 *   1.75 s  the streak-goal bar fills its newest segment
 * With Reduce Motion on, everything appears in place with a short fade
 * (haptics still play).
 */
import { useEffect, useRef, type ComponentRef, type RefObject } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';

import { feedback } from '@/lib/feedback';
import { keyToDate } from '@/lib/salliDay';
import type { DayStatus, GoalProgress, LanternLevel } from '@/store/streaks';
import { colors, fonts, radius, spacing, themedStyles } from '@/theme';

import { eightPointStarPath } from './geometry';
import { Lantern } from './Lantern';
import { PlasterPattern } from './PlasterPattern';
import { t } from '@/lib/i18n';

export type TakeoverData = {
  from: number; // streak before today
  to: number; // streak now
  level: LanternLevel;
  shields: number;
  week: { key: string; status: DayStatus }[]; // 7 days, oldest first, last = today
  goal: GoalProgress;
};

type Props = {
  data: TakeoverData | null;
  onClose: () => void;
};

const LANTERN_H = 150;
const LANTERN_W = LANTERN_H * (40 / 64);
const CHAIN = 70;
const WEEKDAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function StreakTakeover({ data, onClose }: Props) {
  return (
    <Modal visible={!!data} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {data && <TakeoverScene data={data} onClose={onClose} />}
    </Modal>
  );
}

function TakeoverScene({ data, onClose }: { data: TakeoverData; onClose: () => void }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const shareRef = useRef<ComponentRef<typeof View>>(null);

  const bg = useSharedValue(0);
  const drop = useSharedValue(reduce ? 0 : -(CHAIN + LANTERN_H + 120));
  const ignite = useSharedValue(reduce ? 1 : 0);
  const swing = useSharedValue(0); // degrees
  const spread = useSharedValue(reduce ? 1 : 0);
  const flip = useSharedValue(reduce ? 2 : 0); // 0 old shown · 1 edge · 2 new shown
  const stamp = useSharedValue(reduce ? 1 : 0);
  const bar = useSharedValue(reduce ? 1 : 0);
  const ui = useSharedValue(reduce ? 1 : 0);

  useEffect(() => {
    const cancelHaptics = feedback.takeover();
    bg.set(withTiming(1, { duration: reduce ? 200 : 320 }));
    if (reduce) return cancelHaptics;

    drop.set(withSpring(0, { damping: 11, stiffness: 140, mass: 0.9 }));
    ignite.set(withDelay(350, withTiming(1, { duration: 260, easing: Easing.out(Easing.quad) })));
    spread.set(withDelay(350, withTiming(1, { duration: 1300, easing: Easing.out(Easing.cubic) })));
    swing.set(
      withDelay(
        500,
        withRepeat(
          withSequence(
            withTiming(4, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
            withTiming(-4, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
          ),
          -1,
          true,
        ),
      ),
    );
    flip.set(
      withDelay(
        820,
        withSequence(withTiming(1, { duration: 90, easing: Easing.in(Easing.quad) }), withSpring(2, { damping: 12, stiffness: 220 })),
      ),
    );
    stamp.set(withDelay(1400, withSpring(1, { damping: 9, stiffness: 260, mass: 0.7 })));
    bar.set(withDelay(1750, withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) })));
    ui.set(withDelay(1850, withTiming(1, { duration: 300 })));
    return cancelHaptics;
  }, [reduce, bg, drop, ignite, spread, swing, flip, stamp, bar, ui]);

  const bgStyle = useAnimatedStyle(() => ({ opacity: bg.value }));
  const lanternStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: drop.value },
      // swing around the top of the chain
      { translateY: -(CHAIN + LANTERN_H) / 2 },
      { rotate: `${swing.value}deg` },
      { translateY: (CHAIN + LANTERN_H) / 2 },
    ],
  }));
  const litStyle = useAnimatedStyle(() => ({ opacity: ignite.value }));
  const bloomStyle = useAnimatedStyle(() => ({
    opacity: ignite.value * 0.9,
    transform: [{ scale: 0.3 + 0.7 * ignite.value + 0.03 * Math.sin((swing.value / 4) * Math.PI) }],
  }));
  const oldNumStyle = useAnimatedStyle(() => ({
    opacity: flip.value < 1 ? 1 : 0,
    transform: [{ perspective: 600 }, { rotateX: `${Math.min(1, flip.value) * 90}deg` }],
  }));
  const newNumStyle = useAnimatedStyle(() => ({
    opacity: flip.value >= 1 ? 1 : 0,
    transform: [{ perspective: 600 }, { rotateX: `${(1 - Math.max(0, flip.value - 1)) * -90}deg` }],
  }));
  const captionStyle = useAnimatedStyle(() => ({
    opacity: interpolate(flip.value, [1, 2], [0, 1], 'clamp'),
    transform: [{ translateY: interpolate(flip.value, [1, 2], [8, 0], 'clamp') }],
  }));
  const uiStyle = useAnimatedStyle(() => ({ opacity: ui.value, transform: [{ translateY: (1 - ui.value) * 12 }] }));

  const centreX = width / 2;
  const lanternTop = insets.top + 20 + CHAIN;
  const glassY = lanternTop + LANTERN_H * (33 / 64);

  return (
    <Animated.View style={[styles.root, bgStyle]}>
      <PlasterPattern color={colors.lightGold} opacity={0.09} cell={52} />

      {/* Star-shaped light spreading from the lantern */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {STAR_LIGHTS.map((s, i) => (
          <StarLight key={i} x={centreX} y={glassY} light={s} spread={spread} swing={swing} />
        ))}
      </View>

      {/* Bloom */}
      <Animated.View
        pointerEvents="none"
        style={[styles.bloom, { left: centreX - 170, top: glassY - 170 }, bloomStyle]}>
        <Svg width={340} height={340}>
          <Defs>
            <RadialGradient id="bloom" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={colors.lightGold} stopOpacity={0.6} />
              <Stop offset="0.45" stopColor={colors.saffron} stopOpacity={0.22} />
              <Stop offset="1" stopColor={colors.saffron} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={170} cy={170} r={170} fill="url(#bloom)" />
        </Svg>
      </Animated.View>

      {/* Embers */}
      {!reduce && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {EMBERS.map((e, i) => (
            <Ember key={i} x={centreX} y={glassY} ember={e} ignite={ignite} />
          ))}
        </View>
      )}

      {/* Lantern on its chain */}
      <Animated.View
        style={[styles.lanternRig, { left: centreX - LANTERN_W / 2, top: lanternTop - CHAIN }, lanternStyle]}
        pointerEvents="none">
        <View style={[styles.chain, { height: CHAIN + 400, top: -400, left: LANTERN_W / 2 - 1 }]} />
        <View style={{ marginTop: CHAIN }}>
          <Lantern size={LANTERN_H} lit={false} />
          <Animated.View style={[StyleSheet.absoluteFill, litStyle]}>
            <Lantern size={LANTERN_H} lit level={data.level} glow={false} />
          </Animated.View>
        </View>
      </Animated.View>

      <View style={[styles.content, { paddingTop: lanternTop + LANTERN_H + 8, paddingBottom: insets.bottom + spacing.xl }]}>
        <View ref={shareRef} collapsable={false} style={styles.shareArea}>
          <View style={styles.numberBox}>
            <Animated.Text style={[styles.number, oldNumStyle]}>{data.from}</Animated.Text>
            <Animated.Text style={[styles.number, styles.numberOverlay, newNumStyle]}>{data.to}</Animated.Text>
          </View>
          <Animated.View style={[{ alignItems: 'center' }, captionStyle]}>
            <Text style={styles.caption}>{t('day streak!')}</Text>
            <Text style={styles.arabic}>ما شاء الله، استمر</Text>
          </Animated.View>
        </View>

        <WeekRow week={data.week} stamp={stamp} />

        <GoalBar goal={data.goal} fill={bar} shields={data.shields} />

        <Animated.View style={[styles.buttons, uiStyle]}>
          <ChunkyButton label={t('Continue')} onPress={onClose} />
          {Platform.OS !== 'web' && (
            <Pressable
              accessibilityRole="button"
              onPress={() => shareStreak(shareRef, data.to)}
              style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.7 }]}>
              <Text style={styles.shareText}>{t('Share my streak')}</Text>
            </Pressable>
          )}
        </Animated.View>
      </View>
    </Animated.View>
  );
}

async function shareStreak(view: RefObject<ComponentRef<typeof View> | null>, streak: number) {
  if (!view.current) return;
  try {
    const [{ captureRef }, Sharing] = await Promise.all([import('react-native-view-shot'), import('expo-sharing')]);
    const uri = await captureRef(view as Parameters<typeof captureRef>[0], { format: 'png', quality: 1 });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: t('My {n}-day Salli streak', { n: streak }) });
    }
  } catch {
    // Sharing is optional; ignore failures.
  }
}

// ---------- week row ----------

function WeekRow({ week, stamp }: { week: TakeoverData['week']; stamp: SharedValue<number> }) {
  const stampStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, stamp.value * 2),
    transform: [{ scale: 1.9 - 0.9 * stamp.value }, { rotate: `${(1 - stamp.value) * -18}deg` }],
  }));
  return (
    <View style={styles.week}>
      {week.map((d, i) => {
        const today = i === week.length - 1;
        const label = WEEKDAY[keyToDate(d.key).getDay()];
        return (
          <View key={d.key} style={styles.weekDay}>
            <Text style={[styles.weekLabel, today && { color: colors.lightGold }]}>{label}</Text>
            <View style={[styles.weekDot, d.status === 'lit' && !today && styles.weekDotLit, today && styles.weekDotToday]}>
              {today ? (
                <Animated.View style={stampStyle}>
                  <Check color={colors.deepGreen} />
                </Animated.View>
              ) : d.status === 'lit' ? (
                <Check color={colors.deepGreen} />
              ) : d.status === 'shield' || d.status === 'repaired' ? (
                <ShieldIcon size={14} color={colors.lightGold} />
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function Check({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 12.5 10 17.5 19 7" />
    </Svg>
  );
}

export function ShieldIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round">
      <Path d="M12 3 4.5 6v5.5c0 4.6 3.1 8.2 7.5 9.5 4.4-1.3 7.5-4.9 7.5-9.5V6Z" />
    </Svg>
  );
}

// ---------- streak-goal bar ----------

function GoalBar({ goal, fill, shields }: { goal: GoalProgress; fill: SharedValue<number>; shields: number }) {
  const newest = goal.filled - 1; // the segment today completes
  const newestStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: fill.value }] }));
  return (
    <View style={styles.goal}>
      <View style={styles.goalHead}>
        <Text style={styles.goalLabel}>{goal.reached ? t('{n}-day goal reached!', { n: goal.next }) : t('Next goal: {n} days', { n: goal.next })}</Text>
        {!goal.reached && <Text style={styles.goalToGo}>{t('{n} to go', { n: goal.toGo })}</Text>}
      </View>
      <View style={styles.segments}>
        {Array.from({ length: goal.segments }, (_, i) => (
          <View key={i} style={styles.segment}>
            {i < newest && <View style={styles.segmentFill} />}
            {i === newest && <Animated.View style={[styles.segmentFill, styles.segmentGrow, newestStyle]} />}
          </View>
        ))}
      </View>
      <View style={styles.shieldLine}>
        <ShieldIcon size={14} color={shields > 0 ? colors.lightGold : 'rgba(251,246,236,0.5)'} />
        <Text style={styles.shieldText}>
          {shields > 0
            ? t(shields === 1 ? '{n} shield ready to cover a missed day' : '{n} shields ready to cover a missed day', { n: shields })
            : t('7 lit days in a row earns a shield')}
        </Text>
      </View>
    </View>
  );
}

// ---------- chunky saffron button with a pressed shadow ----------

export function ChunkyButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.chunkyWrap}>
      {({ pressed }) => (
        <>
          <View style={styles.chunkyShadow} />
          <View style={[styles.chunky, pressed && { transform: [{ translateY: 4 }] }]}>
            <Text style={styles.chunkyText}>{label}</Text>
          </View>
        </>
      )}
    </Pressable>
  );
}

// ---------- light patterns and embers ----------

type Light = { dx: number; dy: number; r: number; rot: number; depth: number };

const STAR_LIGHTS: Light[] = [
  { dx: -130, dy: -40, r: 46, rot: 0, depth: 1.2 },
  { dx: 135, dy: -10, r: 38, rot: 22.5, depth: 1 },
  { dx: -95, dy: 150, r: 30, rot: 22.5, depth: 0.8 },
  { dx: 110, dy: 175, r: 52, rot: 0, depth: 1.4 },
  { dx: -150, dy: 300, r: 40, rot: 0, depth: 1.1 },
  { dx: 150, dy: 360, r: 34, rot: 22.5, depth: 0.9 },
  { dx: 0, dy: -120, r: 26, rot: 22.5, depth: 0.6 },
  { dx: -40, dy: 420, r: 58, rot: 22.5, depth: 1.5 },
];

function StarLight({ x, y, light, spread, swing }: { x: number; y: number; light: Light; spread: SharedValue<number>; swing: SharedValue<number> }) {
  const size = light.r * 2;
  const style = useAnimatedStyle(() => ({
    opacity: 0.2 * spread.value,
    transform: [
      { translateX: light.dx * spread.value + swing.value * 5 * light.depth },
      { translateY: light.dy * spread.value },
      { scale: 0.4 + 0.6 * spread.value },
      { rotate: `${light.rot + swing.value * 2}deg` },
    ],
  }));
  return (
    <Animated.View style={[{ position: 'absolute', left: x - light.r, top: y - light.r, width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <Path d={eightPointStarPath(light.r, light.r, light.r - 1)} fill={colors.lightGold} fillOpacity={0.16} stroke={colors.lightGold} strokeOpacity={0.6} strokeWidth={1} />
      </Svg>
    </Animated.View>
  );
}

type EmberSpec = { dx: number; size: number; delay: number; duration: number; drift: number };

const EMBERS: EmberSpec[] = Array.from({ length: 14 }, (_, i) => ({
  dx: ((i * 37) % 50) - 25,
  size: 2 + ((i * 7) % 3),
  delay: 350 + ((i * 173) % 1400),
  duration: 1800 + ((i * 251) % 1200),
  drift: ((i * 53) % 40) - 20,
}));

function Ember({ x, y, ember, ignite }: { x: number; y: number; ember: EmberSpec; ignite: SharedValue<number> }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(withDelay(ember.delay, withRepeat(withTiming(1, { duration: ember.duration, easing: Easing.out(Easing.quad) }), -1, false)));
  }, [p, ember.delay, ember.duration]);
  const style = useAnimatedStyle(() => ({
    opacity: ignite.value * (p.value < 0.15 ? p.value / 0.15 : 1 - (p.value - 0.15) / 0.85),
    transform: [
      { translateX: ember.dx + Math.sin(p.value * Math.PI * 2) * 6 + ember.drift * p.value },
      { translateY: -230 * p.value },
    ],
  }));
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: x - ember.size / 2,
          top: y,
          width: ember.size,
          height: ember.size,
          borderRadius: ember.size,
          backgroundColor: colors.lightGold,
        },
        style,
      ]}
    />
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.deepGreen, overflow: 'hidden' },
  bloom: { position: 'absolute', width: 340, height: 340 },
  lanternRig: { position: 'absolute', width: LANTERN_W, alignItems: 'center' },
  chain: { position: 'absolute', width: 2, backgroundColor: colors.saffron, opacity: 0.8 },
  content: { flex: 1, alignItems: 'center', paddingHorizontal: spacing.lg, gap: spacing.lg },
  shareArea: { alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.xs, backgroundColor: 'transparent' },
  numberBox: { height: 104, minWidth: 160, alignItems: 'center', justifyContent: 'center' },
  number: {
    fontFamily: fonts.display,
    fontVariant: ['lining-nums'],
    fontSize: 100,
    lineHeight: 108,
    color: colors.lightGold,
    textAlign: 'center',
    textShadowColor: colors.saffron,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 0,
  },
  numberOverlay: { position: 'absolute', left: 0, right: 0 },
  caption: { fontFamily: fonts.display, fontSize: 30, color: colors.onPrimary, marginTop: -6 },
  arabic: { fontFamily: fonts.arabic, fontSize: 20, lineHeight: 34, color: colors.lightGold, writingDirection: 'rtl' },

  week: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', maxWidth: 360 },
  weekDay: { alignItems: 'center', gap: 6 },
  weekLabel: { fontFamily: fonts.uiSemi, fontSize: 12, color: 'rgba(251,246,236,0.7)' },
  weekDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(233,184,96,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDotLit: { backgroundColor: colors.lightGold, borderColor: colors.lightGold },
  weekDotToday: { backgroundColor: colors.lightGold, borderColor: colors.onPrimary, borderWidth: 2 },

  goal: { width: '100%', maxWidth: 360, gap: 8 },
  goalHead: { flexDirection: 'row', justifyContent: 'space-between' },
  goalLabel: { fontFamily: fonts.uiSemi, fontSize: 13, color: colors.onPrimary },
  goalToGo: { fontFamily: fonts.ui, fontSize: 13, color: 'rgba(251,246,236,0.75)' },
  segments: { flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 10, borderRadius: 5, backgroundColor: 'rgba(251,246,236,0.16)', overflow: 'hidden' },
  segmentFill: { ...StyleSheet.absoluteFill, backgroundColor: colors.lightGold, borderRadius: 5 },
  segmentGrow: { transformOrigin: 'left' },
  shieldLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  shieldText: { fontFamily: fonts.ui, fontSize: 12, color: 'rgba(251,246,236,0.8)' },

  buttons: { width: '100%', maxWidth: 360, gap: spacing.sm, marginTop: 'auto' },
  chunkyWrap: { height: 60 },
  chunkyShadow: { position: 'absolute', left: 0, right: 0, top: 4, bottom: 0, borderRadius: radius.button, backgroundColor: '#8F6119' },
  chunky: {
    height: 56,
    borderRadius: radius.button,
    backgroundColor: colors.saffron,
    borderWidth: 1.5,
    borderColor: colors.lightGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chunkyText: { fontFamily: fonts.uiSemi, fontSize: 17, color: colors.onPrimary },
  shareBtn: {
    height: 52,
    borderRadius: radius.button,
    borderWidth: 1.5,
    borderColor: 'rgba(233,184,96,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareText: { fontFamily: fonts.uiSemi, fontSize: 15, color: colors.lightGold },
}),
);

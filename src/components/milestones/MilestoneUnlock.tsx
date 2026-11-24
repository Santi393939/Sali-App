/**
 * Full-screen reveal when a lifetime milestone is reached. Every milestone
 * has its own moment, growing with the milestone:
 *   Doorway   cedar doors swing open onto light (knock-knock)
 *   Courtyard zellige tiles ripple into place around the badge
 *   Fountain  water jets rise and fall, with ripples
 *   Minaret   a beam of light climbs; stars twinkle
 *   Dome      rings of gold light spread out in deep pulses
 *   Riad      petals drift down after two bursts (the longest)
 * It then shows the reward set (theme, tap sound, title) with a button to
 * wear it straight away.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
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
import Svg, { Circle, Defs, Ellipse, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { MILESTONES, type Milestone } from '@/content/milestones';
import { SOUNDS, THEMES } from '@/content/rewards';
import { feedback } from '@/lib/feedback';
import { applyMilestoneRewards } from '@/store/rewards';
import { colors, fonts, radius, spacing } from '@/theme';

import { eightPointStarPath, horseshoeArchPath, tilePath } from '../geometry';
import { Sparks, type Burst } from '../motion';
import { PlasterPattern } from '../PlasterPattern';
import { Medallion } from './Medallion';

type Props = { milestone: Milestone | null; onClose: () => void };

export function MilestoneUnlock({ milestone, onClose }: Props) {
  return (
    <Modal visible={!!milestone} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {milestone && <Scene milestone={milestone} onClose={onClose} />}
    </Modal>
  );
}

let burstId = 20000;
const MEDAL = 168;
const STAGE = 340;

function Scene({ milestone: m, onClose }: { milestone: Milestone; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const tier = MILESTONES.indexOf(m); // 0–5: bigger milestones, bigger moments
  const p = m.palette;
  const bg = useSharedValue(0);
  const medal = useSharedValue(reduce ? 1 : 0);
  const fx = useSharedValue(reduce ? 1 : 0); // drives the milestone's own effect
  const text = useSharedValue(reduce ? 1 : 0);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [worn, setWorn] = useState(false);

  // The doors hide the medal until they open, so it appears straight away behind them.
  const medalDelay = m.effect === 'doors' ? 0 : 250;
  const revealAt = m.effect === 'doors' ? 800 : 450;

  useEffect(() => {
    bg.set(withTiming(1, { duration: 300 }));
    const cancel = feedback.milestone(m.effect, m.sound);
    if (reduce) return cancel;
    medal.set(withDelay(medalDelay, withSpring(1, { damping: 11, stiffness: 120, mass: 0.9 })));
    fx.set(withTiming(1, { duration: 1400 + tier * 200, easing: Easing.out(Easing.cubic) }));
    text.set(withDelay(revealAt + 400, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) })));
    const timers = [
      setTimeout(() => setBursts([{ id: burstId++, kind: 'large' }]), revealAt),
      ...(tier >= 3 ? [setTimeout(() => setBursts((b) => [...b, { id: burstId++, kind: 'large' }]), revealAt + 500)] : []),
      ...(tier >= 5 ? [setTimeout(() => setBursts((b) => [...b, { id: burstId++, kind: 'medium' }, { id: burstId++, kind: 'large' }]), revealAt + 900)] : []),
    ];
    return () => {
      cancel();
      timers.forEach(clearTimeout);
    };
  }, [bg, medal, fx, text, reduce, m, tier, medalDelay, revealAt]);

  const bgStyle = useAnimatedStyle(() => ({ opacity: bg.value }));
  const medalStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, medal.value * 1.5),
    transform:
      m.effect === 'beam'
        ? [{ translateY: (1 - medal.value) * 160 }, { scale: 0.6 + 0.4 * medal.value }]
        : [{ scale: 0.3 + 0.7 * medal.value }, { rotate: `${(1 - medal.value) * (m.effect === 'doors' ? 0 : 200)}deg` }],
  }));
  const textStyle = useAnimatedStyle(() => ({ opacity: text.value, transform: [{ translateY: (1 - text.value) * 14 }] }));

  const theme = THEMES[m.theme];
  const wear = () => {
    feedback.add('large');
    applyMilestoneRewards(m);
    setWorn(true);
    setTimeout(onClose, 550);
  };

  return (
    <Animated.View style={[styles.root, { backgroundColor: p.stage, paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg }, bgStyle]}>
      <PlasterPattern color={p.glow} opacity={0.07} cell={52} />

      <View style={styles.stage}>
        {/* Soft light behind everything */}
        <Svg width={STAGE * 1.4} height={STAGE * 1.4} style={styles.abs}>
          <Defs>
            <RadialGradient id="halo" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={p.glow} stopOpacity={0.45} />
              <Stop offset="1" stopColor={p.glow} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={STAGE * 0.7} cy={STAGE * 0.7} r={STAGE * 0.7} fill="url(#halo)" />
        </Svg>

        {!reduce && <Effect milestone={m} fx={fx} behind />}

        <View style={styles.sparks} pointerEvents="none">
          <Sparks bursts={bursts} size={STAGE} onDone={(id) => setBursts((b) => b.filter((x) => x.id !== id))} />
        </View>

        <Animated.View style={medalStyle}>
          <Medallion size={MEDAL} milestone={m} earned />
        </Animated.View>

        {!reduce && <Effect milestone={m} fx={fx} />}
      </View>

      <Animated.View style={[styles.copy, textStyle]}>
        <Text style={[styles.eyebrow, { color: p.glow }]}>
          Milestone reached · {m.amount.toLocaleString('en-US')} salawat <Text style={styles.salla}>ﷺ</Text>
        </Text>
        <Text style={styles.name}>{m.name}</Text>
        <Text style={[styles.arabic, { color: p.glow }]}>{m.arabic}</Text>
        <Text style={styles.line}>{m.earnedLine}</Text>
      </Animated.View>

      {/* Reward set */}
      <Animated.View style={[styles.rewards, { borderColor: hexA(p.glow, 0.45) }, textStyle]}>
        <Text style={[styles.rewardsLabel, { color: p.glow }]}>Rewards unlocked</Text>
        <RewardRow
          art={
            <Svg width={22} height={26}>
              <Path d={horseshoeArchPath(22, 26, 1)} fill={theme.arch} stroke={p.rim} strokeWidth={1} />
            </Svg>
          }
          title={`${theme.name} theme`}
          sub="Arch, star and tiles across the app"
        />
        <Pressable onPress={() => feedback.previewSound(m.sound)} accessibilityRole="button" accessibilityLabel={`Play ${SOUNDS[m.sound].name}`}>
          <RewardRow art={<PlayGlyph color={p.glow} />} title={SOUNDS[m.sound].name} sub="New tap sound · tap to hear it" />
        </Pressable>
        <RewardRow art={<Medallion size={26} milestone={m} earned />} title={`“${m.title}”`} sub="Your title, shown with this badge" />
      </Animated.View>

      <Animated.View style={[styles.buttons, textStyle]}>
        <Pressable
          onPress={wear}
          disabled={worn}
          accessibilityRole="button"
          style={({ pressed }) => [styles.wear, { backgroundColor: p.rim }, pressed && { transform: [{ translateY: 3 }] }]}>
          <Text style={[styles.wearText, { color: p.stage }]}>{worn ? 'Wearing it ✓' : 'Wear it now'}</Text>
        </Pressable>
        <Pressable onPress={onClose} accessibilityRole="button" style={styles.later}>
          <Text style={styles.laterText}>Continue</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

function RewardRow({ art, title, sub }: { art: ReactNode; title: string; sub: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowArt}>{art}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
    </View>
  );
}

function PlayGlyph({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={10.5} fill="none" stroke={color} strokeWidth={1.6} />
      <Path d="M10 8v8l6-4Z" fill={color} />
    </Svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Effects (one per milestone). `behind` layers sit under the medal.
// ─────────────────────────────────────────────────────────────────────────

function Effect({ milestone, fx, behind = false }: { milestone: Milestone; fx: SharedValue<number>; behind?: boolean }) {
  switch (milestone.effect) {
    case 'doors':
      return behind ? null : <Doors milestone={milestone} />;
    case 'tiles':
      return behind ? <Tiles milestone={milestone} /> : null;
    case 'fountain':
      return behind ? <Fountain milestone={milestone} /> : null;
    case 'beam':
      return behind ? <Beam milestone={milestone} fx={fx} /> : null;
    case 'rings':
      return behind ? <Rings milestone={milestone} /> : null;
    case 'petals':
      return behind ? null : <Petals milestone={milestone} />;
  }
}

/** Two cedar doors in an arch that swing open. */
function Doors({ milestone }: { milestone: Milestone }) {
  const open = useSharedValue(0);
  useEffect(() => {
    open.set(withDelay(650, withTiming(1, { duration: 900, easing: Easing.inOut(Easing.cubic) })));
  }, [open]);
  const W = 210;
  const H = 250;
  const left = useAnimatedStyle(() => ({
    transform: [{ perspective: 700 }, { translateX: -W / 4 }, { rotateY: `${-open.value * 105}deg` }, { translateX: W / 4 }],
    opacity: 1 - interpolate(open.value, [0.75, 1], [0, 1], 'clamp'),
  }));
  const right = useAnimatedStyle(() => ({
    transform: [{ perspective: 700 }, { translateX: W / 4 }, { rotateY: `${open.value * 105}deg` }, { translateX: -W / 4 }],
    opacity: 1 - interpolate(open.value, [0.75, 1], [0, 1], 'clamp'),
  }));
  const p = milestone.palette;
  const leaf = (side: 'l' | 'r') => (
    <Svg width={W / 2} height={H}>
      <Rect x={0} y={0} width={W / 2} height={H} fill={p.face} />
      {[0, 1, 2, 3].map((i) => (
        <Rect key={i} x={side === 'l' ? 14 : 8} y={30 + i * 52} width={W / 2 - 22} height={40} rx={4} fill="none" stroke={p.accent} strokeOpacity={0.5} strokeWidth={1.4} />
      ))}
      {[0, 1, 2, 3, 4].map((i) => (
        <Circle key={`n${i}`} cx={side === 'l' ? W / 2 - 10 : 10} cy={40 + i * 44} r={2.6} fill={p.rim} />
      ))}
    </Svg>
  );
  return (
    <View style={[styles.abs, { width: W, height: H, overflow: 'hidden', borderTopLeftRadius: W / 2, borderTopRightRadius: W / 2 }]} pointerEvents="none">
      <View style={{ flexDirection: 'row' }}>
        <Animated.View style={left}>{leaf('l')}</Animated.View>
        <Animated.View style={right}>{leaf('r')}</Animated.View>
      </View>
    </View>
  );
}

/** Zellige tiles ripple into a ring, then turn slowly. */
function Tiles({ milestone }: { milestone: Milestone }) {
  const turn = useSharedValue(0);
  useEffect(() => {
    turn.set(withRepeat(withTiming(1, { duration: 30000, easing: Easing.linear }), -1));
  }, [turn]);
  const ring = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value * 360}deg` }] }));
  const N = 12;
  return (
    <Animated.View style={[styles.abs, { width: STAGE, height: STAGE }, ring]} pointerEvents="none">
      {Array.from({ length: N }, (_, i) => (
        <TileBit key={i} i={i} n={N} milestone={milestone} />
      ))}
    </Animated.View>
  );
}

function TileBit({ i, n, milestone }: { i: number; n: number; milestone: Milestone }) {
  const s = useSharedValue(0);
  useEffect(() => {
    s.set(withDelay(300 + i * 60, withSpring(1, { damping: 9, stiffness: 220 })));
  }, [s, i]);
  const a = (i / n) * Math.PI * 2;
  const R = 132;
  const size = i % 2 ? 30 : 38;
  const style = useAnimatedStyle(() => ({ opacity: Math.min(1, s.value * 1.4), transform: [{ scale: s.value }, { rotate: `${(1 - s.value) * 180}deg` }] }));
  const p = milestone.palette;
  return (
    <Animated.View style={[{ position: 'absolute', left: STAGE / 2 + Math.cos(a) * R - size / 2, top: STAGE / 2 + Math.sin(a) * R - size / 2 }, style]}>
      <Svg width={size} height={size}>
        <Path d={i % 2 ? eightPointStarPath(size / 2, size / 2, size / 2 - 1) : tilePath(size / 2, size / 2, size / 2 - 1)} fill={i % 2 ? p.rim : p.face} stroke={p.accent} strokeWidth={1} />
      </Svg>
    </Animated.View>
  );
}

/** Water jets rising and falling, with ripples at the base. */
function Fountain({ milestone }: { milestone: Milestone }) {
  return (
    <View style={[styles.abs, { width: STAGE, height: STAGE }]} pointerEvents="none">
      {Array.from({ length: 3 }, (_, i) => (
        <Ripple key={`r${i}`} i={i} color={milestone.palette.glow} />
      ))}
      {Array.from({ length: 20 }, (_, i) => (
        <Drop key={i} i={i} color={i % 3 ? milestone.palette.glow : '#FFFFFF'} />
      ))}
    </View>
  );
}

function Drop({ i, color }: { i: number; color: string }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withDelay(500 + (i % 10) * 110, withRepeat(withTiming(1, { duration: 1300 + (i % 4) * 120, easing: Easing.linear }), -1)));
  }, [t, i]);
  const vx = ((i * 37) % 21) - 10; // sideways spread
  const vy = 230 + ((i * 53) % 60); // launch height
  const style = useAnimatedStyle(() => {
    const k = t.value;
    const y = -vy * 2 * k + vy * 2 * k * k; // up then down (parabola)
    return { opacity: k === 0 ? 0 : k < 0.1 ? k * 10 : 1 - Math.max(0, (k - 0.85) / 0.15), transform: [{ translateX: vx * 9 * k }, { translateY: y }] };
  });
  return <Animated.View style={[{ position: 'absolute', left: STAGE / 2 - 3, top: STAGE / 2 + 96, width: 6, height: 9, borderRadius: 4, backgroundColor: color }, style]} />;
}

function Ripple({ i, color }: { i: number; color: string }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withDelay(600 + i * 500, withRepeat(withTiming(1, { duration: 1500, easing: Easing.out(Easing.quad) }), -1)));
  }, [t, i]);
  const style = useAnimatedStyle(() => ({ opacity: (1 - t.value) * 0.6, transform: [{ scaleX: 0.3 + 1.3 * t.value }, { scaleY: 0.3 + 1.3 * t.value }] }));
  return (
    <Animated.View
      style={[{ position: 'absolute', left: STAGE / 2 - 90, top: STAGE / 2 + 86, width: 180, height: 26, borderRadius: 90, borderWidth: 2, borderColor: color }, style]}
    />
  );
}

/** A beam of light climbs behind the minaret; stars twinkle above. */
function Beam({ milestone, fx }: { milestone: Milestone; fx: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({ opacity: 0.85 * Math.min(1, fx.value * 2), transform: [{ scaleY: fx.value }] }));
  const p = milestone.palette;
  return (
    <View style={[styles.abs, { width: STAGE, height: STAGE }]} pointerEvents="none">
      <Animated.View style={[{ position: 'absolute', left: STAGE / 2 - 60, top: -120, width: 120, height: STAGE + 60, transformOrigin: 'bottom' }, style]}>
        <Svg width={120} height={STAGE + 60}>
          <Defs>
            <RadialGradient id="beam" cx="50%" cy="100%" rx="50%" ry="100%">
              <Stop offset="0" stopColor={p.glow} stopOpacity={0.7} />
              <Stop offset="1" stopColor={p.glow} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={120} height={STAGE + 60} fill="url(#beam)" />
        </Svg>
      </Animated.View>
      {Array.from({ length: 10 }, (_, i) => (
        <Twinkle key={i} i={i} color={p.glow} />
      ))}
    </View>
  );
}

function Twinkle({ i, color }: { i: number; color: string }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withDelay(700 + i * 140, withRepeat(withSequence(withTiming(1, { duration: 600 }), withTiming(0.15, { duration: 700 })), -1)));
  }, [t, i]);
  const x = ((i * 71) % (STAGE - 40)) + 20;
  const y = ((i * 43) % 120) + 4;
  const style = useAnimatedStyle(() => ({ opacity: t.value, transform: [{ scale: 0.6 + 0.6 * t.value }] }));
  return (
    <Animated.View style={[{ position: 'absolute', left: x, top: y }, style]}>
      <Svg width={14} height={14}>
        <Path d="M7 0 L8.4 5.6 L14 7 L8.4 8.4 L7 14 L5.6 8.4 L0 7 L5.6 5.6 Z" fill={color} />
      </Svg>
    </Animated.View>
  );
}

/** Rings of gold light spreading out in pulses. */
function Rings({ milestone }: { milestone: Milestone }) {
  return (
    <View style={[styles.abs, { width: STAGE, height: STAGE }]} pointerEvents="none">
      {Array.from({ length: 4 }, (_, i) => (
        <Ring key={i} i={i} color={milestone.palette.rim} />
      ))}
    </View>
  );
}

function Ring({ i, color }: { i: number; color: string }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withDelay(i * 450, withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.cubic) }), -1)));
  }, [t, i]);
  const style = useAnimatedStyle(() => ({ opacity: (1 - t.value) * 0.8, transform: [{ scale: 0.55 + 1.45 * t.value }] }));
  const D = 180;
  return <Animated.View style={[{ position: 'absolute', left: STAGE / 2 - D / 2, top: STAGE / 2 - D / 2, width: D, height: D, borderRadius: D / 2, borderWidth: 3, borderColor: color }, style]} />;
}

/** Petals and leaves drifting down across the whole screen. */
function Petals({ milestone }: { milestone: Milestone }) {
  const { width, height } = useWindowDimensions();
  return (
    <View style={[StyleSheet.absoluteFill, { left: -(width - STAGE) / 2, top: -STAGE, width, height }]} pointerEvents="none">
      {Array.from({ length: 26 }, (_, i) => (
        <Petal key={i} i={i} width={width} height={height} milestone={milestone} />
      ))}
    </View>
  );
}

function Petal({ i, width, height, milestone }: { i: number; width: number; height: number; milestone: Milestone }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withDelay(900 + (i % 13) * 180, withRepeat(withTiming(1, { duration: 3800 + (i % 5) * 500, easing: Easing.linear }), -1)));
  }, [t, i]);
  const x0 = ((i * 89) % width);
  const sway = 18 + (i % 4) * 8;
  const style = useAnimatedStyle(() => ({
    opacity: t.value === 0 ? 0 : 0.95,
    transform: [
      { translateX: x0 + Math.sin(t.value * Math.PI * 4 + i) * sway },
      { translateY: -40 + t.value * (height + 80) },
      { rotate: `${t.value * 540 + i * 30}deg` },
    ],
  }));
  const p = milestone.palette;
  const leaf = i % 3 === 0;
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0 }, style]}>
      <Svg width={16} height={12}>
        <Ellipse cx={8} cy={6} rx={leaf ? 7 : 6} ry={leaf ? 3 : 5} fill={leaf ? '#5FA37E' : i % 2 ? p.accent : '#F9DCE2'} />
      </Svg>
    </Animated.View>
  );
}

/** "#RRGGBB" + alpha → rgba(). */
function hexA(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', paddingHorizontal: spacing.lg, overflow: 'hidden' },
  stage: { width: STAGE, height: STAGE, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm },
  abs: { position: 'absolute' },
  sparks: { position: 'absolute', width: STAGE, height: STAGE },
  copy: { alignItems: 'center', gap: 2 },
  eyebrow: { fontFamily: fonts.uiSemi, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1 },
  salla: { fontFamily: fonts.arabic, fontSize: 15, textTransform: 'none' },
  name: { fontFamily: fonts.display, fontSize: 40, lineHeight: 46, color: colors.card, textAlign: 'center' },
  arabic: { fontFamily: fonts.arabic, fontSize: 22, lineHeight: 36 },
  line: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 20, color: 'rgba(251,246,236,0.82)', textAlign: 'center', maxWidth: 320 },
  rewards: {
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderRadius: radius.card,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  rewardsLabel: { fontFamily: fonts.uiSemi, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowArt: { width: 30, alignItems: 'center' },
  rowTitle: { fontFamily: fonts.uiSemi, fontSize: 14, color: colors.card },
  rowSub: { fontFamily: fonts.ui, fontSize: 12, color: 'rgba(251,246,236,0.7)' },
  buttons: { width: '100%', maxWidth: 380, marginTop: 'auto', gap: spacing.xs },
  wear: { height: 56, borderRadius: radius.button, alignItems: 'center', justifyContent: 'center' },
  wearText: { fontFamily: fonts.uiSemi, fontSize: 17 },
  later: { height: 44, alignItems: 'center', justifyContent: 'center' },
  laterText: { fontFamily: fonts.uiSemi, fontSize: 15, color: 'rgba(251,246,236,0.8)' },
});

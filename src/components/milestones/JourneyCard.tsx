/**
 * "Your masjid": the six lifetime milestones on a winding path (two rows,
 * turning at the right), a lantern marking where you are, the next badge
 * glowing, and a panel for the next milestone with a pace-based estimate and
 * a nudge for how much sooner a little extra each day gets you there.
 */
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { etaLabel, type MilestoneProgress, type MilestoneState } from '@/store/milestones';
import { colors, fonts, spacing, themedStyles } from '@/theme';

import { Card } from '../Card';
import { Lantern } from '../Lantern';
import { Medallion } from './Medallion';
import { t } from '@/lib/i18n';

const MEDAL = 68;
const ROW1 = 46;
const ROW2 = 176;
const PATH_H = 236;
const EXTRA_PER_DAY = 300;

type Pt = { x: number; y: number };
type Seg = { a: Pt; b: Pt; c1?: Pt; c2?: Pt };

const fmt = (n: number) => n.toLocaleString('en-US');

function cubic(s: Seg, t: number): Pt {
  const { a, b, c1, c2 } = s;
  if (!c1 || !c2) return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  const u = 1 - t;
  return {
    x: u * u * u * a.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * b.x,
    y: u * u * u * a.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * b.y,
  };
}

/** Path data for the first `t` (0–1) of a segment. */
function partial(s: Seg, t: number): string {
  if (t <= 0) return '';
  const { a } = s;
  if (!s.c1 || !s.c2) {
    const p = cubic(s, t);
    return `M${a.x},${a.y} L${p.x},${p.y}`;
  }
  // de Casteljau split at t
  const lerp = (p: Pt, q: Pt) => ({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });
  const p01 = lerp(a, s.c1);
  const p12 = lerp(s.c1, s.c2);
  const p23 = lerp(s.c2, s.b);
  const p012 = lerp(p01, p12);
  const p123 = lerp(p12, p23);
  const end = lerp(p012, p123);
  return `M${a.x},${a.y} C${p01.x},${p01.y} ${p012.x},${p012.y} ${end.x},${end.y}`;
}

const segPath = (s: Seg) => (s.c1 && s.c2 ? `M${s.a.x},${s.a.y} C${s.c1.x},${s.c1.y} ${s.c2.x},${s.c2.y} ${s.b.x},${s.b.y}` : `M${s.a.x},${s.a.y} L${s.b.x},${s.b.y}`);

type Props = {
  progress: MilestoneProgress;
  today: string;
  onOpen: (m: MilestoneState) => void;
};

export function JourneyCard({ progress, today, onOpen }: Props) {
  const [w, setW] = useState(0);
  const { list, next, fraction, lifetime, pace, etaDays } = progress;

  // Medallion centres: row 1 left → right, row 2 right → left.
  const xs = [0.15, 0.5, 0.85];
  const pts: Pt[] = w ? [...xs.map((x) => ({ x: x * w, y: ROW1 })), ...[...xs].reverse().map((x) => ({ x: x * w, y: ROW2 }))] : [];
  const start: Pt = { x: 4, y: ROW1 };
  const segs: Seg[] = w
    ? [
        { a: start, b: pts[0] },
        { a: pts[0], b: pts[1] },
        { a: pts[1], b: pts[2] },
        { a: pts[2], b: pts[3], c1: { x: pts[2].x + 46, y: ROW1 }, c2: { x: pts[3].x + 46, y: ROW2 } },
        { a: pts[3], b: pts[4] },
        { a: pts[4], b: pts[5] },
      ]
    : [];
  const nextIdx = next ? list.indexOf(next) : list.length; // segment index being walked
  const here = w ? (next ? cubic(segs[nextIdx], fraction) : pts[5]) : { x: 0, y: 0 };

  const done = segs.slice(0, nextIdx).map(segPath).join(' ');
  const current = next && w ? partial(segs[nextIdx], fraction) : '';

  const boostEta = next && pace + EXTRA_PER_DAY > 0 ? Math.max(1, Math.ceil((next.amount - lifetime) / (pace + EXTRA_PER_DAY))) : null;
  const daysSooner = etaDays && boostEta ? etaDays - boostEta : 0;

  return (
    <Card>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t('Your masjid')}</Text>
          <Text style={styles.sub}>{t('Each milestone adds a part. {n} salawat so far.', { n: fmt(lifetime) })}</Text>
        </View>
      </View>

      <View style={{ height: PATH_H, marginTop: spacing.sm }} onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}>
        {w > 0 && (
          <>
            <Svg width={w} height={PATH_H} style={StyleSheet.absoluteFill}>
              {segs.map((s, i) => (
                <Path key={i} d={segPath(s)} stroke={colors.cardBorder} strokeWidth={3} strokeDasharray="2 7" strokeLinecap="round" fill="none" />
              ))}
              {done ? <Path d={done} stroke={colors.saffron} strokeWidth={3.5} strokeLinecap="round" fill="none" /> : null}
              {current ? <Path d={current} stroke={colors.saffron} strokeWidth={3.5} strokeLinecap="round" fill="none" /> : null}
            </Svg>

            {list.map((m, i) => (
              <Pressable
                key={m.amount}
                onPress={() => onOpen(m)}
                accessibilityRole="button"
                accessibilityLabel={`${m.name}, ${m.short}${m.earned ? t(', earned') : ''}`}
                style={[styles.stop, { left: pts[i].x - 50, top: pts[i].y - MEDAL / 2 }]}>
                {({ pressed }) => (
                  <View style={[styles.stopInner, pressed && { transform: [{ scale: 0.94 }] }]}>
                    <Medallion size={MEDAL} milestone={m} earned={m.earned} next={m === next} progress={m === next ? fraction : 0} />
                    <Text style={[styles.stopAmount, m.earned && { color: colors.terracotta }]}>{m.short}</Text>
                    <Text style={[styles.stopName, (m.earned || m === next) && { color: colors.ink }]} numberOfLines={1}>
                      {m.name.replace('The ', '')}
                    </Text>
                  </View>
                )}
              </Pressable>
            ))}

            {next && <HereMarker x={here.x} y={here.y} />}
          </>
        )}
      </View>

      {next ? (
        <Pressable onPress={() => onOpen(next)} style={styles.nextBox} accessibilityRole="button">
          <View style={styles.nextHead}>
            <Text style={styles.nextLabel}>{t('Next · {name}', { name: next.name })}</Text>
            <Text style={styles.nextArabic}>{next.arabic}</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.max(2, fraction * 100)}%` }]} />
          </View>
          <View style={styles.nextRow}>
            <Text style={styles.nextNums}>
              {fmt(lifetime)} / {fmt(next.amount)}
            </Text>
            <Text style={styles.toGo}>{t('{n} to go', { n: fmt(next.amount - lifetime) })}</Text>
          </View>
          <Text style={styles.pace}>
            {etaDays
              ? etaDays === 1
                ? t('At your pace (about {n} a day) you’ll get there within a day.', { n: fmt(pace) })
                : t('At your pace (about {n} a day) you’ll get there in about {days} days, around {date}.', { n: fmt(pace), days: etaDays, date: etaLabel(today, etaDays) })
              : t('Count today to set your pace, and we will show when you will get there.')}
          </Text>
          {daysSooner > 0 && (
            <Text style={styles.boost}>
              {t(daysSooner === 1 ? '+{x} a day gets you there 1 day sooner.' : '+{x} a day gets you there {n} days sooner.', { x: EXTRA_PER_DAY, n: daysSooner })}
            </Text>
          )}
        </Pressable>
      ) : (
        <Text style={styles.complete}>{t('Every part is built. The riad is in bloom.')} ما شاء الله</Text>
      )}
    </Card>
  );
}

/** A small lit lantern that bobs gently where you are on the path. */
function HereMarker({ x, y }: { x: number; y: number }) {
  const reduce = useReducedMotion();
  const bob = useSharedValue(0);
  useEffect(() => {
    if (!reduce) bob.set(withRepeat(withSequence(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 900, easing: Easing.inOut(Easing.sin) })), -1));
  }, [reduce, bob]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: -3 * bob.value }] }));
  return (
    <Animated.View pointerEvents="none" style={[styles.here, { left: x - 11, top: y - 40 }, style]}>
      <Lantern size={30} lit glow={false} />
      <View style={styles.hereDot} />
    </Animated.View>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontFamily: fonts.display, fontSize: 24, color: colors.ink },
  sub: { fontFamily: fonts.ui, fontSize: 13, color: colors.muted, marginTop: 2 },
  stop: { position: 'absolute', width: 100, alignItems: 'center' },
  stopInner: { alignItems: 'center' },
  stopAmount: { fontFamily: fonts.uiSemi, fontSize: 12, color: colors.muted, marginTop: 2 },
  stopName: { fontFamily: fonts.ui, fontSize: 11, color: colors.muted },
  here: { position: 'absolute', alignItems: 'center' },
  hereDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.saffron, marginTop: 2 },
  nextBox: {
    marginTop: spacing.md,
    backgroundColor: colors.plaster,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
  },
  nextHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  nextLabel: { fontFamily: fonts.uiSemi, fontSize: 14, color: colors.ink },
  nextArabic: { fontFamily: fonts.arabic, fontSize: 16, color: colors.terracotta },
  track: { height: 10, borderRadius: 5, backgroundColor: colors.card, marginTop: spacing.sm, overflow: 'hidden', borderWidth: 1, borderColor: colors.cardBorder },
  fill: { height: '100%', borderRadius: 5, backgroundColor: colors.saffron },
  nextRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  nextNums: { fontFamily: fonts.uiMedium, fontSize: 12, color: colors.muted },
  toGo: { fontFamily: fonts.uiSemi, fontSize: 12, color: colors.terracotta },
  pace: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 19, color: colors.ink, marginTop: spacing.sm },
  boost: { fontFamily: fonts.uiMedium, fontSize: 13, color: colors.link, marginTop: 4 },
  complete: { fontFamily: fonts.uiMedium, fontSize: 14, color: colors.link, marginTop: spacing.md, textAlign: 'center' },
}),
);

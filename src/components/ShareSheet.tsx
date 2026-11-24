/**
 * Share cards: story-sized images of your streak, your masjid or a badge,
 * for WhatsApp and Instagram stories. Shares streaks and badges, never
 * counts of individual days. Captured with react-native-view-shot on phones.
 */
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { MILESTONES, type Milestone } from '@/content/milestones';
import { feedback } from '@/lib/feedback';
import type { TodaySnapshot } from '@/store/counts';
import { yearRecap } from '@/store/recap';
import { useRewards } from '@/store/rewards';
import { colors, fonts, radius, spacing, themedStyles } from '@/theme';

import { Lantern } from './Lantern';
import { Logo } from './Logo';
import { Medallion } from './milestones/Medallion';
import { PlasterPattern } from './PlasterPattern';
import { PrimaryButton } from './PrimaryButton';
import { Segmented } from './Segmented';
import { ZelligeBand } from './ZelligeBand';
import { t } from '@/lib/i18n';

export type ShareKind = 'streak' | 'masjid' | 'badge' | 'year';

type Props = { visible: boolean; initial?: ShareKind; today: TodaySnapshot; onClose: () => void };

const CARD_W = 270;
const CARD_H = 480;

export function ShareSheet({ visible, initial = 'streak', today, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const [kind, setKind] = useState<ShareKind>(initial);
  const [mounted, setMounted] = useState(visible);
  const [status, setStatus] = useState<string | null>(null);
  if (visible && !mounted) {
    setMounted(true);
    setKind(initial);
    setStatus(null);
  }
  const y = useSharedValue(900);
  const shade = useSharedValue(0);
  const cardRef = useRef<ComponentRef<typeof View>>(null);
  const rewards = useRewards();
  const earned = MILESTONES.filter((m) => today.lifetime >= m.amount);
  const badge: Milestone | null = rewards.featured ?? earned[earned.length - 1] ?? null;

  useEffect(() => {
    if (visible) {
      y.set(reduce ? 0 : withSpring(0, { damping: 22, stiffness: 300, mass: 0.85 }));
      shade.set(withTiming(1, { duration: 200 }));
    } else {
      shade.set(withTiming(0, { duration: 180 }));
      y.set(
        withTiming(reduce ? 0 : 900, { duration: reduce ? 0 : 220, easing: Easing.in(Easing.quad) }, (done) => {
          if (done) scheduleOnRN(setMounted, false);
        }),
      );
    }
  }, [visible, reduce, y, shade]);
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const shadeStyle = useAnimatedStyle(() => ({ opacity: shade.value }));

  const share = async () => {
    if (!cardRef.current) return;
    try {
      const [{ captureRef }, Sharing] = await Promise.all([import('react-native-view-shot'), import('expo-sharing')]);
      const uri = await captureRef(cardRef as Parameters<typeof captureRef>[0], { format: 'png', quality: 1, width: 1080, height: 1920 });
      if (await Sharing.isAvailableAsync()) {
        feedback.medium();
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: t('Share from Salli') });
      }
    } catch {
      setStatus(t('Could not make the image. Please try again.'));
    }
  };

  const options: { value: ShareKind; label: string }[] = [
    { value: 'streak', label: t('Streak') },
    { value: 'masjid', label: t('Masjid') },
    ...(badge ? [{ value: 'badge' as const, label: t('Badge') }] : []),
    { value: 'year', label: t('Year') },
  ];

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, shadeStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t('Close')} />
        </Animated.View>
        <Animated.View style={[styles.sheet, sheetStyle]}>
          <View style={styles.grabber} />
          <ScrollView contentContainerStyle={{ gap: spacing.lg, paddingBottom: insets.bottom + spacing.lg, alignItems: 'stretch' }} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>{t('Share')}</Text>
            <Segmented options={options} value={kind} onChange={setKind} />

            <View style={styles.cardWrap}>
              <View ref={cardRef} collapsable={false} style={styles.card}>
                {kind === 'streak' && <StreakCard today={today} />}
                {kind === 'masjid' && <MasjidCard lifetime={today.lifetime} />}
                {kind === 'badge' && badge && <BadgeCard m={badge} />}
                {kind === 'year' && <YearCard today={today} />}
              </View>
            </View>

            {Platform.OS === 'web' ? (
              <Text style={styles.note}>{t('Sharing images works in the Salli app on your phone.')}</Text>
            ) : (
              <PrimaryButton label={t('Share image')} onPress={share} />
            )}
            {status && <Text style={styles.note}>{status}</Text>}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function CardFooter({ light = true }: { light?: boolean }) {
  return (
    <View style={styles.footer}>
      <Logo size={30} />
      <Text style={[styles.footerText, !light && { color: colors.ink }]}>Salli · صلِّ</Text>
    </View>
  );
}

function StreakCard({ today }: { today: TodaySnapshot }) {
  const { streak } = today;
  return (
    <View style={[styles.face, { backgroundColor: colors.zelligeGreen }]}>
      <PlasterPattern color={colors.lightGold} opacity={0.12} cell={40} />
      <View style={styles.center}>
        <Lantern size={120} lit level={streak.level} />
        <Text style={styles.bigNum}>{streak.current}</Text>
        <Text style={styles.bigLabel}>{t('day streak')}</Text>
        <Text style={styles.line}>{t('Lighting my lantern every day with salawat on the Prophet')}</Text>
        <Text style={styles.arabic}>اللهم صل وسلم على نبينا محمد</Text>
      </View>
      <CardFooter />
      <ZelligeBand height={16} />
    </View>
  );
}

function MasjidCard({ lifetime }: { lifetime: number }) {
  const built = MILESTONES.filter((m) => lifetime >= m.amount).length;
  return (
    <View style={[styles.face, { backgroundColor: colors.night }]}>
      <PlasterPattern color={colors.lightGold} opacity={0.08} cell={40} />
      <View style={styles.center}>
        <Text style={styles.eyebrow}>{t('My masjid')}</Text>
        <View style={styles.medals}>
          {MILESTONES.map((m) => (
            <View key={m.amount} style={[styles.medalSlot, lifetime < m.amount && { opacity: 0.3 }]}>
              <Medallion size={60} milestone={m} earned={lifetime >= m.amount} />
              <Text style={styles.medalName}>{m.name.replace('The ', '')}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.bigLabel}>
          {t('{n} of {total} parts built', { n: built, total: MILESTONES.length })}
        </Text>
        <Text style={styles.line}>{t('Building it one salawat at a time')}</Text>
      </View>
      <CardFooter />
      <ZelligeBand height={16} />
    </View>
  );
}

function YearCard({ today }: { today: TodaySnapshot }) {
  const r = yearRecap(today.date, today.version);
  return (
    <View style={[styles.face, { backgroundColor: colors.night }]}>
      <PlasterPattern color={colors.lightGold} opacity={0.08} cell={40} />
      <View style={styles.center}>
        <Text style={styles.eyebrow}>{t('My {year} in Salli', { year: r.year })}</Text>
        <Text style={styles.bigNum}>{r.total.toLocaleString('en-US')}</Text>
        <Text style={styles.bigLabel}>{t('salawat this year')}</Text>
        <View style={styles.yearRow}>
          <View style={styles.yearStat}>
            <Text style={styles.yearValue}>{r.litDays}</Text>
            <Text style={styles.yearLabel}>{t('lit days')}</Text>
          </View>
          <View style={styles.yearStat}>
            <Text style={styles.yearValue}>{r.longestRun}</Text>
            <Text style={styles.yearLabel}>{t('longest run')}</Text>
          </View>
          <View style={styles.yearStat}>
            <Text style={styles.yearValue}>{r.litFridays}</Text>
            <Text style={styles.yearLabel}>{t('lit Fridays')}</Text>
          </View>
        </View>
        <Text style={styles.arabic}>اللهم صل وسلم على نبينا محمد</Text>
      </View>
      <CardFooter />
      <ZelligeBand height={16} />
    </View>
  );
}

function BadgeCard({ m }: { m: Milestone }) {
  return (
    <View style={[styles.face, { backgroundColor: m.palette.stage }]}>
      <PlasterPattern color={m.palette.glow} opacity={0.08} cell={40} />
      <View style={styles.center}>
        <Text style={[styles.eyebrow, { color: m.palette.glow }]}>{t('Milestone reached')}</Text>
        <Medallion size={150} milestone={m} earned />
        <Text style={styles.badgeName}>{m.name}</Text>
        <Text style={[styles.arabic, { color: m.palette.glow }]}>{m.arabic}</Text>
        <Text style={[styles.line, { color: m.palette.glow }]}>“{m.title}”</Text>
      </View>
      <CardFooter />
    </View>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
    root: { flex: 1, justifyContent: 'flex-end' },
    yearRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    yearStat: { alignItems: 'center', minWidth: 64 },
    yearValue: { fontFamily: fonts.display, fontVariant: ['lining-nums'], fontSize: 28, color: '#FBF6EC' },
    yearLabel: { fontFamily: fonts.ui, fontSize: 10, color: colors.lightGold, textTransform: 'uppercase', letterSpacing: 0.6 },
    backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(22,19,15,0.5)' },
    sheet: {
      backgroundColor: colors.plaster,
      borderTopLeftRadius: radius.card,
      borderTopRightRadius: radius.card,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      width: '100%',
      maxWidth: 560,
      alignSelf: 'center',
      maxHeight: '94%',
    },
    grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.cardBorder, marginBottom: spacing.md },
    title: { fontFamily: fonts.display, fontSize: 30, color: colors.ink, textAlign: 'center' },
    cardWrap: { alignItems: 'center' },
    card: { width: CARD_W, height: CARD_H, borderRadius: 22, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
    face: { flex: 1, justifyContent: 'space-between' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg, gap: 4 },
    bigNum: { fontFamily: fonts.display, fontVariant: ['lining-nums'], fontSize: 88, lineHeight: 92, color: colors.lightGold, marginTop: spacing.sm },
    bigLabel: { fontFamily: fonts.display, fontSize: 26, color: '#FBF6EC' },
    line: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 19, color: 'rgba(251,246,236,0.85)', textAlign: 'center', marginTop: spacing.sm },
    arabic: { fontFamily: fonts.arabic, fontSize: 17, lineHeight: 30, color: colors.lightGold, textAlign: 'center', marginTop: 4 },
    eyebrow: { fontFamily: fonts.uiSemi, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.lightGold, marginBottom: spacing.sm },
    medals: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginBottom: spacing.md },
    medalSlot: { width: 70, alignItems: 'center' },
    medalName: { fontFamily: fonts.uiMedium, fontSize: 10, color: 'rgba(251,246,236,0.75)', marginTop: 2 },
    badgeName: { fontFamily: fonts.display, fontSize: 34, color: '#FBF6EC', marginTop: spacing.md },
    footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingBottom: spacing.md },
    footerText: { fontFamily: fonts.display, fontSize: 18, color: '#FBF6EC' },
    note: { fontFamily: fonts.ui, fontSize: 13, color: colors.muted, textAlign: 'center' },
  }),
);

/**
 * Your year in Salli: the year so far as a short story of big numbers, on
 * a night background, each card rising in as it appears. Ends with a share
 * card. Like a fitness app's year in review, but only ever about you.
 */
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EightPointStar, Lantern, PlasterPattern, PrimaryButton, sallaParts, ShareSheet, ZelligeBand } from '@/components';
import { Medallion } from '@/components/milestones/Medallion';
import { MILESTONES } from '@/content/milestones';
import { dateLocale, t } from '@/lib/i18n';
import { keyToDate } from '@/lib/salliDay';
import { useToday } from '@/store/counts';
import { yearRecap, type TimeOfDay } from '@/store/recap';
import { colors, fonts, radius, spacing, themedStyles } from '@/theme';

const fmt = (n: number) => n.toLocaleString('en-US');

export default function Recap() {
  const insets = useSafeAreaInsets();
  const today = useToday();
  const r = yearRecap(today.date, today.version);
  const [shareOpen, setShareOpen] = useState(false);

  const month = (m: number) => new Date(2026, m, 15).toLocaleDateString(dateLocale(), { month: 'long' });
  const day = (k: string) => keyToDate(k).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'long' });
  const timeLine: Record<TimeOfDay, string> = {
    morning: t('Most of your salawat came in the morning, before noon.'),
    afternoon: t('Most of your salawat came in the afternoon.'),
    evening: t('Most of your salawat came in the evening, around Maghrib.'),
    night: t('Most of your salawat came at night.'),
  };
  const wayName: Record<string, string> = {
    tap: t('Tap counter'),
    quick: t('Quick add'),
    pad: t('Number pad'),
    reminder: t('From a reminder'),
    telegram: t('Telegram bot'),
  };
  const earned = MILESTONES.filter((m) => r.milestones.includes(m.name));

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xl }]}>
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('Close')} hitSlop={10} style={styles.close}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>

        <Slide i={0} style={styles.hero}>
          <PlasterPattern color={colors.lightGold} opacity={0.1} cell={44} />
          <Text style={styles.eyebrow}>{t('Your {year} in Salli', { year: r.year })}</Text>
          <Lantern size={110} lit level="gold" />
          <Text style={styles.huge}>{fmt(r.total)}</Text>
          <Text style={styles.label}>{sallaParts(t('salawat on the Prophet ﷺ this year'), { fontFamily: fonts.arabic })}</Text>
          <Text style={styles.arabic}>اللهم صل وسلم على نبينا محمد</Text>
        </Slide>

        <Slide i={1}>
          <Text style={styles.big}>{fmt(r.litDays)}</Text>
          <Text style={styles.label}>{t('days your lantern was lit')}</Text>
          <View style={styles.pair}>
            <Stat value={fmt(r.activeDays)} label={t('days you counted')} />
            <Stat value={t('{n} days', { n: r.longestRun })} label={t('longest run')} />
          </View>
        </Slide>

        {(r.bestDay || r.bestMonth) && (
          <Slide i={2}>
            <Text style={styles.eyebrow}>{t('Your best')}</Text>
            <View style={styles.pair}>
              {r.bestDay && <Stat value={fmt(r.bestDay.total)} label={t('best day · {date}', { date: day(r.bestDay.date) })} />}
              {r.bestMonth && <Stat value={fmt(r.bestMonth.total)} label={t('best month · {month}', { month: month(r.bestMonth.month) })} />}
            </View>
          </Slide>
        )}

        {r.favouriteTime && (
          <Slide i={3}>
            <EightPointStar size={46} fill={colors.zelligeGreen} stroke={colors.saffron} strokeWidth={1.5} />
            <Text style={styles.sentence}>{timeLine[r.favouriteTime]}</Text>
            {r.favouriteWay && <Text style={styles.sub}>{t('Your favourite way to count: {way}', { way: wayName[r.favouriteWay] ?? r.favouriteWay })}</Text>}
          </Slide>
        )}

        <Slide i={4}>
          <Text style={styles.eyebrow}>{t('Built this year')}</Text>
          {earned.length > 0 ? (
            <View style={styles.medals}>
              {earned.map((m) => (
                <View key={m.amount} style={{ alignItems: 'center', gap: 4 }}>
                  <Medallion size={64} milestone={m} earned />
                  <Text style={styles.medalName}>{m.name.replace(/^The /, '')}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.sub}>{t('Your next part of the masjid is on its way.')}</Text>
          )}
          <View style={styles.pair}>
            <Stat value={fmt(r.lamps)} label={t('lamps lit')} />
            <Stat value={fmt(r.litFridays)} label={t('lit Fridays')} />
          </View>
        </Slide>

        <Slide i={5} style={styles.closing}>
          <Text style={styles.arabicBig}>وَاللَّهُ يُضَاعِفُ لِمَنْ يَشَاءُ</Text>
          <Text style={styles.ref}>{t('Sūrat al-Baqarah 2:261')}</Text>
          <Text style={styles.sub}>{t('May Allah accept every one of them.')}</Text>
          <PrimaryButton label={t('Share my year')} onPress={() => setShareOpen(true)} />
          <ZelligeBand height={16} />
        </Slide>
      </ScrollView>
      <ShareSheet visible={shareOpen} initial="year" today={today} onClose={() => setShareOpen(false)} />
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/** A card that rises in, one after another. */
function Slide({ i, style, children }: { i: number; style?: object; children: React.ReactNode }) {
  const reduce = useReducedMotion();
  const p = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (!reduce) p.set(withDelay(120 + i * 140, withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) })));
  }, [i, p, reduce]);
  const anim = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateY: (1 - p.value) * 36 }, { scale: 0.96 + p.value * 0.04 }] }));
  return <Animated.View style={[styles.slide, style, anim]}>{children}</Animated.View>;
}

const styles = themedStyles(() =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: colors.night },
    content: { paddingHorizontal: spacing.lg, gap: spacing.lg, maxWidth: 520, width: '100%', alignSelf: 'center' },
    topRow: { flexDirection: 'row', justifyContent: 'flex-end' },
    close: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(251,246,236,0.08)' },
    closeText: { fontSize: 18, color: '#FBF6EC' },
    slide: {
      backgroundColor: 'rgba(251,246,236,0.05)',
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: 'rgba(233,184,96,0.25)',
      padding: spacing.xl,
      alignItems: 'center',
      gap: spacing.sm,
      overflow: 'hidden',
    },
    hero: { backgroundColor: colors.zelligeGreen, borderColor: colors.saffron, paddingVertical: spacing.xl * 1.5 },
    closing: { paddingBottom: 0, gap: spacing.md },
    eyebrow: { fontFamily: fonts.uiSemi, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.lightGold },
    huge: { fontFamily: fonts.display, fontVariant: ['lining-nums'], fontSize: 76, lineHeight: 86, color: '#FBF6EC' },
    big: { fontFamily: fonts.display, fontVariant: ['lining-nums'], fontSize: 64, lineHeight: 74, color: colors.lightGold },
    label: { fontFamily: fonts.uiMedium, fontSize: 15, color: '#FBF6EC', textAlign: 'center' },
    arabic: { fontFamily: fonts.arabic, fontSize: 20, lineHeight: 36, color: colors.lightGold, marginTop: spacing.sm },
    arabicBig: { fontFamily: fonts.arabic, fontSize: 28, lineHeight: 52, color: colors.lightGold, textAlign: 'center' },
    sentence: { fontFamily: fonts.display, fontSize: 26, lineHeight: 32, color: '#FBF6EC', textAlign: 'center' },
    ref: { fontFamily: fonts.uiSemi, fontSize: 12, color: colors.saffron, marginTop: -spacing.sm },
    sub: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 20, color: 'rgba(251,246,236,0.75)', textAlign: 'center' },
    pair: { flexDirection: 'row', gap: spacing.md, alignSelf: 'stretch', marginTop: spacing.sm },
    stat: { flex: 1, alignItems: 'center', backgroundColor: 'rgba(251,246,236,0.06)', borderRadius: 16, paddingVertical: spacing.md, paddingHorizontal: spacing.sm },
    statValue: { fontFamily: fonts.display, fontVariant: ['lining-nums'], fontSize: 30, color: '#FBF6EC' },
    statLabel: { fontFamily: fonts.ui, fontSize: 12, color: 'rgba(251,246,236,0.7)', textAlign: 'center', marginTop: 2 },
    medals: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.md, marginTop: spacing.sm },
    medalName: { fontFamily: fonts.uiMedium, fontSize: 11, color: 'rgba(251,246,236,0.8)' },
  }),
);

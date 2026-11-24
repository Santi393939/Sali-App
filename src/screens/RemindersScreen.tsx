/**
 * Reminders: a full-screen vertical feed, one card per swipe (snap).
 * Each card: type tag, Arabic (Amiri, gold), divider ornament, English, source.
 * Under the text, a centred row: like (count), save, share.
 * Bottom: "Send 10 salawat now". Everything is centred on the screen.
 */
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import Svg, { Line, Path } from 'react-native-svg';

import { HorseshoeArch, PlasterPattern } from '@/components';
import { eightPointStarPath } from '@/components/geometry';
import { useTabs } from '@/components/tabs';
import { KIND_LABEL, REMINDERS, type Reminder } from '@/content/reminders';
import { feedback } from '@/lib/feedback';
import { addSalawat } from '@/store/counts';
import { recordReminderLike, recordReminderView } from '@/store/quests';
import { toggleAction, useReminderActions } from '@/store/reminderActions';
import { colors, fonts, radius, spacing, themedStyles } from '@/theme';
import { getLanguage, t } from '@/lib/i18n';

const TAB_INDEX = 1;
const SEND_AMOUNT = 10;

export default function RemindersScreen() {
  const insets = useSafeAreaInsets();
  const tabs = useTabs();
  const actions = useReminderActions();
  const [height, setHeight] = useState(0);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const [filter, setFilter] = useState<'all' | 'saved'>('all');
  // The saved list is fixed when you open it, so unsaving a card doesn't yank it away mid-read.
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const savedCount = REMINDERS.filter((r) => actions[r.id]?.saved).length;
  const data = filter === 'saved' ? REMINDERS.filter((r) => savedIds.includes(r.id)) : REMINDERS;

  const choose = (f: 'all' | 'saved') => {
    if (f === filter) return;
    feedback.selection();
    if (f === 'saved') setSavedIds(REMINDERS.filter((r) => actions[r.id]?.saved).map((r) => r.id));
    activeRef.current = 0;
    setActive(0);
    setFilter(f);
  };

  const onLayout = (e: LayoutChangeEvent) => setHeight(Math.round(e.nativeEvent.layout.height));

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!height) return;
      const i = Math.round(e.nativeEvent.contentOffset.y / height);
      if (i !== activeRef.current && i >= 0 && i < data.length) {
        activeRef.current = i;
        setActive(i);
        feedback.selection();
        recordReminderView(data[i].id);
      }
    },
    [height, data],
  );

  return (
    <View style={styles.page} onLayout={onLayout}>
      {tabs.index === TAB_INDEX && <StatusBar style="light" />}
      {height > 0 && filter === 'saved' && data.length === 0 && (
        <View style={[styles.emptySaved, { height }]}>
          <BookmarkIcon filled={false} size={44} />
          <Text style={styles.emptyTitle}>{t('Nothing saved yet')}</Text>
          <Text style={styles.emptyText}>{t('Tap the bookmark on any reminder to keep it here for later.')}</Text>
          <Pressable onPress={() => choose('all')} accessibilityRole="button" style={styles.emptyBtn}>
            <Text style={styles.emptyBtnText}>{t('Browse reminders')}</Text>
          </Pressable>
        </View>
      )}
      {height > 0 && data.length > 0 && (
        <FlatList
          key={filter}
          data={data}
          keyExtractor={(r) => r.id}
          renderItem={({ item, index }) => (
            <ReminderCard
              reminder={item}
              height={height}
              topInset={insets.top + 52}
              active={index === active}
              liked={actions[item.id]?.liked ?? false}
              saved={actions[item.id]?.saved ?? false}
              position={`${index + 1} / ${data.length}`}
            />
          )}
          getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
          pagingEnabled
          snapToInterval={height}
          snapToAlignment="start"
          decelerationRate="fast"
          disableIntervalMomentum
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          windowSize={3}
          initialNumToRender={2}
          maxToRenderPerBatch={2}
        />
      )}

      {/* For you / Saved switch */}
      <View style={[styles.switchWrap, { top: insets.top + 10 }]} pointerEvents="box-none">
        <View style={styles.switch}>
          {(['all', 'saved'] as const).map((f) => (
            <Pressable
              key={f}
              onPress={() => choose(f)}
              accessibilityRole="tab"
              accessibilityState={{ selected: filter === f }}
              style={[styles.switchBtn, filter === f && styles.switchBtnOn]}>
              <Text style={[styles.switchText, filter === f && styles.switchTextOn]}>
                {f === 'all' ? t('For you') : `${t('Saved')}${savedCount ? ` · ${savedCount}` : ''}`}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

// ---------- one card ----------

type CardProps = {
  reminder: Reminder;
  height: number;
  topInset: number;
  active: boolean;
  liked: boolean;
  saved: boolean;
  position: string;
};

function ReminderCard({ reminder, height, topInset, active, liked, saved, position }: CardProps) {
  const reduce = useReducedMotion();
  const shown = useSharedValue(reduce ? 1 : 0);

  // Text rises in each time the card snaps into view.
  useEffect(() => {
    if (reduce) return;
    if (active) shown.set(withDelay(60, withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) })));
    else shown.set(withTiming(0.35, { duration: 200 }));
  }, [active, reduce, shown]);

  const arabicStyle = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ translateY: (1 - shown.value) * 18 }],
  }));
  const englishStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, (shown.value - 0.3) / 0.7),
    transform: [{ translateY: (1 - shown.value) * 26 }],
  }));

  const share = async () => {
    try {
      await Share.share({ message: `${reminder.arabic}\n\n${getLanguage() === 'ar' ? '' : `${t(reminder.english)}\n`}— ${t(reminder.sourceRef)}\n\n${t('Shared from Salli')}` });
    } catch {}
  };

  return (
    <View style={[styles.card, { height }]}>
      <PlasterPattern color={colors.lightGold} opacity={0.05} cell={56} />

      {/* Top: type tag */}
      <View style={[styles.top, { paddingTop: topInset + spacing.md }]}>
        <View style={styles.tag}>
          <TagIcon kind={reminder.kind} />
          <Text style={styles.tagText}>{t(KIND_LABEL[reminder.kind])}</Text>
        </View>
        {!reminder.verifiedBy && reminder.kind !== 'video' && (
          <View style={styles.review}>
            <Text style={styles.reviewText}>{t('Awaiting review')}</Text>
          </View>
        )}
        <Text style={styles.counter}>{position}</Text>
      </View>

      {/* Middle: the text */}
      <View style={styles.middle}>
        {reminder.kind === 'video' ? (
          <VideoSlot />
        ) : (
          <>
            <Animated.Text style={[styles.arabic, reminder.arabic.length > 90 && styles.arabicLong, arabicStyle]}>
              {reminder.arabic}
            </Animated.Text>
            <Ornament />
            <Animated.View style={[styles.englishBlock, englishStyle]}>
              {getLanguage() !== 'ar' && (
              <Text style={styles.english}>
                {t(reminder.english).split('ﷺ').map((part, i) => (
                  <Text key={i}>
                    {i > 0 && <Text style={styles.salla}>ﷺ</Text>}
                    {part}
                  </Text>
                ))}
              </Text>
              )}
              <Text style={styles.source}>{t(reminder.sourceRef)}</Text>
            </Animated.View>
          </>
        )}
      </View>

      {/* Actions */}
      <View style={styles.rail}>
        <LikeButton id={reminder.id} liked={liked} count={reminder.baseLikes + (liked ? 1 : 0)} />
        <RailButton
          label={saved ? t('Saved') : t('Save')}
          onPress={() => {
            feedback.medium();
            toggleAction(reminder.id, 'saved');
          }}>
          <BookmarkIcon filled={saved} />
        </RailButton>
        {Platform.OS !== 'web' && (
          <RailButton label={t('Share')} onPress={share}>
            <ShareIcon />
          </RailButton>
        )}
      </View>

      {/* Bottom: send 10 */}
      <SendTen />
    </View>
  );
}

// ---------- send 10 salawat ----------

function SendTen() {
  const fill = useSharedValue(0);
  const float = useSharedValue(0);
  const [busy, setBusy] = useState(false);

  const send = () => {
    addSalawat(SEND_AMOUNT, 'reminder');
    feedback.add('medium'); // Impact Heavy + tick cluster
    setBusy(true);
    fill.set(
      withSequence(
        withTiming(1, { duration: 320, easing: Easing.out(Easing.quad) }),
        withDelay(
          900,
          withTiming(0, { duration: 380 }, (done) => {
            if (done) scheduleOnRN(setBusy, false);
          }),
        ),
      ),
    );
    float.set(0);
    float.set(withTiming(1, { duration: 1000, easing: Easing.out(Easing.cubic) }));
  };

  const fillStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: fill.value }] }));
  const floatStyle = useAnimatedStyle(() => ({
    opacity: float.value === 0 ? 0 : float.value < 0.15 ? float.value / 0.15 : 1 - Math.max(0, (float.value - 0.5) / 0.5),
    transform: [{ translateY: -46 * float.value }],
  }));

  return (
    <View style={styles.bottom}>
      <Animated.Text style={[styles.plusTen, floatStyle]} pointerEvents="none">
        +{SEND_AMOUNT}
      </Animated.Text>
      <Pressable
        onPress={send}
        accessibilityRole="button"
        accessibilityLabel={t('Send 10 salawat now')}
        style={({ pressed }) => [styles.sendBtn, pressed && { transform: [{ scale: 0.98 }] }]}>
        {() => (
          <>
            <Animated.View style={[styles.sendFill, fillStyle]} />
            <Text style={[styles.sendText, busy && { color: colors.night }]}>
              {busy ? `${t('{n} salawat sent', { n: SEND_AMOUNT })} · ما شاء الله` : t('Send 10 salawat now')}
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

// ---------- rail ----------

function RailButton({ label, onPress, children }: { label: string; onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={styles.railBtn} hitSlop={6}>
      <View style={styles.railCircle}>{children}</View>
      <Text style={styles.railLabel}>{label}</Text>
    </Pressable>
  );
}

function LikeButton({ id, liked, count }: { id: string; liked: boolean; count: number }) {
  const pop = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  return (
    <RailButton
      label={count.toLocaleString('en-US')}
      onPress={() => {
        const now = toggleAction(id, 'liked');
        feedback.medium();
        if (now) recordReminderLike();
        if (now) {
          pop.set(withSequence(withTiming(1.35, { duration: 110 }), withSpring(1, { damping: 8, stiffness: 320 })));
        }
      }}>
      <Animated.View style={style}>
        <HeartIcon filled={liked} />
      </Animated.View>
    </RailButton>
  );
}

// ---------- pieces ----------

function Ornament() {
  return (
    <View style={styles.ornament}>
      <Svg width={200} height={22}>
        <Line x1={10} y1={11} x2={82} y2={11} stroke={colors.saffron} strokeWidth={1} strokeOpacity={0.7} />
        <Line x1={118} y1={11} x2={190} y2={11} stroke={colors.saffron} strokeWidth={1} strokeOpacity={0.7} />
        <Path d={eightPointStarPath(100, 11, 10)} fill="none" stroke={colors.lightGold} strokeWidth={1.2} />
        <Path d={eightPointStarPath(100, 11, 4, undefined, 22.5)} fill={colors.saffron} />
        <Path d="M88 11 L91 8 L94 11 L91 14 Z M106 11 L109 8 L112 11 L109 14 Z" fill={colors.saffron} />
      </Svg>
    </View>
  );
}

function VideoSlot() {
  return (
    <View style={styles.video}>
      <HorseshoeArch width={190} height={240} fill={colors.deepGreen}>
        <View style={styles.play}>
          <Svg width={28} height={28} viewBox="0 0 24 24">
            <Path d="M8 5.5v13l10.5-6.5Z" fill={colors.night} />
          </Svg>
        </View>
      </HorseshoeArch>
      <Text style={styles.videoTitle}>{t('Video reminder')}</Text>
      <Text style={styles.videoBody}>{t('Short videos will play here once they are hosted (Mux or Cloudflare Stream).')}</Text>
    </View>
  );
}

function TagIcon({ kind }: { kind: Reminder['kind'] }) {
  const stroke = colors.lightGold;
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {kind === 'quran' && <Path d="M12 6.5C10.3 5 7.7 4.5 4 4.5v13c3.7 0 6.3.5 8 2 1.7-1.5 4.3-2 8-2v-13c-3.7 0-6.3.5-8 2Zm0 0v13" />}
      {kind === 'hadith' && <Path d="M5 4h10l4 4v12H5Z M9 12h6 M9 16h6 M9 8h3" />}
      {kind === 'video' && <Path d="M8 5.5v13l10.5-6.5Z" />}
    </Svg>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill={filled ? '#E0604A' : 'none'} stroke={filled ? '#E0604A' : '#FBF6EC'} strokeWidth={1.8} strokeLinejoin="round">
      <Path d="M12 20s-7.5-4.6-9.2-9.3C1.7 7.6 3.6 4.5 6.9 4.5c2 0 3.4 1.1 5.1 3 1.7-1.9 3.1-3 5.1-3 3.3 0 5.2 3.1 4.1 6.2C19.5 15.4 12 20 12 20Z" />
    </Svg>
  );
}

function BookmarkIcon({ filled, size = 24 }: { filled: boolean; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? colors.lightGold : 'none'} stroke={filled ? colors.lightGold : '#FBF6EC'} strokeWidth={1.8} strokeLinejoin="round">
      <Path d="M6 3.5h12v17l-6-4-6 4Z" />
    </Svg>
  );
}

function ShareIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#FBF6EC" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 15V3.5M7.5 8 12 3.5 16.5 8M5 12.5v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
    </Svg>
  );
}

const RAIL_W = 64;

const styles = themedStyles(() =>
  StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.night },
  switchWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  switch: { flexDirection: 'row', borderRadius: 999, backgroundColor: 'rgba(251,246,236,0.1)', padding: 3 },
  switchBtn: { paddingHorizontal: 16, height: 34, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  switchBtnOn: { backgroundColor: 'rgba(233,184,96,0.22)' },
  switchText: { fontFamily: fonts.uiSemi, fontSize: 13, color: 'rgba(251,246,236,0.65)' },
  switchTextOn: { color: colors.lightGold },
  emptySaved: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, gap: spacing.sm },
  emptyTitle: { fontFamily: fonts.display, fontSize: 28, color: '#FBF6EC', marginTop: spacing.sm },
  emptyText: { fontFamily: fonts.ui, fontSize: 15, lineHeight: 22, color: 'rgba(251,246,236,0.7)', textAlign: 'center', maxWidth: 280 },
  emptyBtn: { marginTop: spacing.md, height: 46, paddingHorizontal: spacing.xl, borderRadius: radius.button, borderWidth: 1.5, borderColor: colors.saffron, alignItems: 'center', justifyContent: 'center' },
  emptyBtnText: { fontFamily: fonts.uiSemi, fontSize: 15, color: colors.lightGold },
  card: { backgroundColor: colors.night, overflow: 'hidden' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(233,184,96,0.55)',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagText: { fontFamily: fonts.uiSemi, fontSize: 12, color: colors.lightGold, letterSpacing: 0.4 },
  review: { borderRadius: radius.pill, backgroundColor: 'rgba(251,246,236,0.08)', paddingHorizontal: 10, paddingVertical: 5 },
  reviewText: { fontFamily: fonts.uiMedium, fontSize: 11, color: 'rgba(251,246,236,0.6)' },
  counter: { fontFamily: fonts.uiMedium, fontSize: 12, color: 'rgba(251,246,236,0.45)' },

  middle: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.lg },
  arabic: {
    alignSelf: 'stretch',
    fontFamily: fonts.arabic,
    fontSize: 30,
    lineHeight: 58,
    color: colors.lightGold,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  arabicLong: { fontSize: 26, lineHeight: 50 },
  ornament: { alignItems: 'center', marginVertical: spacing.lg },
  englishBlock: { alignSelf: 'stretch', alignItems: 'center' },
  english: { fontFamily: fonts.ui, fontSize: 17, lineHeight: 27, color: 'rgba(251,246,236,0.92)', textAlign: 'center' },
  salla: { fontFamily: fonts.arabic, fontSize: 18 },
  source: { fontFamily: fonts.uiSemi, fontSize: 13, color: colors.saffron, textAlign: 'center', marginTop: spacing.md, letterSpacing: 0.3 },

  rail: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', gap: spacing.xl, paddingBottom: spacing.lg },
  railBtn: { alignItems: 'center', gap: 4, minWidth: RAIL_W },
  railCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(251,246,236,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  railLabel: { fontFamily: fonts.uiMedium, fontSize: 12, color: 'rgba(251,246,236,0.8)' },

  bottom: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, alignItems: 'center' },
  plusTen: {
    position: 'absolute',
    top: -8,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: fonts.display,
    fontVariant: ['lining-nums'],
    fontSize: 28,
    color: colors.lightGold,
  },
  sendBtn: {
    height: 54,
    alignSelf: 'stretch',
    borderRadius: radius.button,
    borderWidth: 1.5,
    borderColor: colors.saffron,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sendFill: { ...StyleSheet.absoluteFill, backgroundColor: colors.lightGold, transformOrigin: 'left' },
  sendText: { fontFamily: fonts.uiSemi, fontSize: 16, color: colors.lightGold },

  video: { alignItems: 'center', gap: spacing.md },
  play: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.lightGold, alignItems: 'center', justifyContent: 'center', paddingLeft: 4 },
  videoTitle: { fontFamily: fonts.display, fontSize: 26, color: '#FBF6EC' },
  videoBody: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 21, color: 'rgba(251,246,236,0.7)', textAlign: 'center', maxWidth: 260 },
}),
);

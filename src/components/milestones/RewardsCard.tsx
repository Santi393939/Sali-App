/**
 * Rewards: every milestone unlocks a title, a theme and a tap sound.
 * Locked items show what they need; tapping one opens that milestone.
 */
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { MILESTONES, type Milestone } from '@/content/milestones';
import { SOUNDS, THEMES, type SoundId, type ThemeId } from '@/content/rewards';
import { feedback } from '@/lib/feedback';
import { applyMilestoneRewards, type ActiveRewards } from '@/store/rewards';
import { updateSettings } from '@/store/settings';
import { colors, fonts, spacing, themedStyles } from '@/theme';

import { Card } from '../Card';
import { horseshoeArchPath } from '../geometry';
import { ZelligeBand } from '../ZelligeBand';
import { Medallion } from './Medallion';

type Props = {
  lifetime: number;
  active: ActiveRewards;
  /** Open the milestone that unlocks a locked reward. */
  onLocked: (amount: number) => void;
};

const unlockOf = (amount: number) => MILESTONES.find((m) => m.amount === amount);

export function RewardsCard({ lifetime, active, onLocked }: Props) {
  const earned = MILESTONES.filter((m) => lifetime >= m.amount);
  const latest = earned[earned.length - 1];
  const choose = (patch: Parameters<typeof updateSettings>[0]) => {
    feedback.medium();
    updateSettings(patch);
  };
  const locked = (amount: number) => {
    feedback.selection();
    onLocked(amount);
  };
  const wearingLatest =
    latest && active.theme === latest.theme && active.sound === latest.sound && active.featured?.amount === latest.amount;

  return (
    <Card>
      <Text style={styles.title}>Rewards</Text>
      <Text style={styles.sub}>
        {earned.length} of {MILESTONES.length} parts built. Each one unlocks a title, a theme and a tap sound.
      </Text>

      {latest && !wearingLatest && (
        <Pressable
          onPress={() => {
            feedback.add('large');
            applyMilestoneRewards(latest);
          }}
          accessibilityRole="button"
          style={({ pressed }) => [styles.wearAll, { backgroundColor: latest.palette.face }, pressed && { opacity: 0.9 }]}>
          <Medallion size={40} milestone={latest} earned />
          <View style={{ flex: 1 }}>
            <Text style={styles.wearTitle}>Wear the {latest.name.replace('The ', '')} set</Text>
            <Text style={styles.wearSub}>
              {THEMES[latest.theme].name} theme · {SOUNDS[latest.sound].name} · “{latest.title}”
            </Text>
          </View>
        </Pressable>
      )}

      {/* Title & badge */}
      <Section label="Title & badge" hint={active.featured ? active.featured.title : 'Shown beside your name'}>
        <View style={styles.badgeRow}>
          {MILESTONES.map((m) => {
            const has = lifetime >= m.amount;
            const selected = active.featured?.amount === m.amount;
            return (
              <Pressable
                key={m.amount}
                accessibilityRole="button"
                accessibilityLabel={`${m.title}${selected ? ', in use' : ''}${has ? '' : ', locked'}`}
                onPress={() => (has ? choose({ featuredBadge: selected ? null : m.amount }) : locked(m.amount))}
                style={[styles.badgeSlot, selected && { borderColor: m.palette.rim, backgroundColor: colors.highlight }]}>
                <Medallion size={42} milestone={m} earned={has} />
              </Pressable>
            );
          })}
        </View>
      </Section>

      {/* Themes */}
      <Section label="Themes" hint="Arch, star and tiles across the app">
        <View style={styles.grid}>
          {(Object.keys(THEMES) as ThemeId[]).map((k) => {
            const t = THEMES[k];
            const open = lifetime >= t.unlock;
            return (
              <Chip
                key={k}
                label={t.name}
                selected={active.theme === k}
                lockedFor={open ? null : t.unlock}
                onPress={() => (open ? choose({ theme: k }) : locked(t.unlock))}>
                <View style={styles.themePreview}>
                  <Svg width={30} height={36}>
                    <Path d={horseshoeArchPath(30, 36, 1)} fill={t.arch} stroke={colors.saffron} strokeWidth={1.2} />
                  </Svg>
                  <View style={styles.themeBand}>
                    <ZelligeBand height={14} theme={k} />
                  </View>
                </View>
              </Chip>
            );
          })}
        </View>
      </Section>

      {/* Tap sounds */}
      <Section label="Tap sounds" hint="Tap one to hear it" last>
        <View style={styles.grid}>
          {(Object.keys(SOUNDS) as SoundId[]).map((k) => {
            const s = SOUNDS[k];
            const open = lifetime >= s.unlock;
            const owner = MILESTONES.find((m) => m.sound === k);
            return (
              <Chip
                key={k}
                label={s.name}
                selected={active.sound === k}
                lockedFor={open ? null : s.unlock}
                onPress={() => {
                  if (!open) return locked(s.unlock);
                  feedback.previewSound(k);
                  choose({ tapSound: k });
                }}>
                <SoundGlyph color={colors.statusBar === 'light' ? colors.lightGold : (owner?.palette.face ?? colors.link)} />
              </Chip>
            );
          })}
        </View>
      </Section>
    </Card>
  );
}

function Section({ label, hint, last, children }: { label: string; hint: string; last?: boolean; children: ReactNode }) {
  return (
    <View style={[styles.section, last && { paddingBottom: 0 }]}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionLabel}>{label}</Text>
        <Text style={styles.sectionHint} numberOfLines={1}>
          {hint}
        </Text>
      </View>
      {children}
    </View>
  );
}

function Chip({
  label,
  selected,
  lockedFor,
  onPress,
  children,
}: {
  label: string;
  selected: boolean;
  lockedFor: number | null;
  onPress: () => void;
  children: ReactNode;
}) {
  const owner: Milestone | undefined = lockedFor != null ? unlockOf(lockedFor) : undefined;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: !!owner }}
      accessibilityLabel={`${label}${owner ? `, unlocks at ${owner.short}` : selected ? ', in use' : ''}`}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && { transform: [{ scale: 0.97 }] }]}>
      <View style={[styles.chipArt, owner && { opacity: 0.3 }]}>{children}</View>
      <Text style={[styles.chipLabel, owner && { color: colors.muted }]} numberOfLines={1}>
        {label}
      </Text>
      {owner ? (
        <View style={styles.lockRow}>
          <LockIcon />
          <Text style={styles.lockText}>{owner.short}</Text>
        </View>
      ) : selected ? (
        <Text style={styles.inUse}>In use</Text>
      ) : (
        <Text style={styles.use}>Use</Text>
      )}
    </Pressable>
  );
}

function LockIcon() {
  return (
    <Svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke={colors.muted} strokeWidth={2.4} strokeLinecap="round">
      <Path d="M6 11h12v9H6Z M8.5 11V8a3.5 3.5 0 0 1 7 0v3" />
    </Svg>
  );
}

function SoundGlyph({ color }: { color: string }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 10v4h3l4 4V6L7 10Z M15 9.5a3.5 3.5 0 0 1 0 5 M17.5 7a7 7 0 0 1 0 10" />
    </Svg>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
  title: { fontFamily: fonts.display, fontSize: 24, color: colors.ink },
  sub: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 19, color: colors.muted, marginTop: 2 },
  wearAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: 16,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  wearTitle: { fontFamily: fonts.uiSemi, fontSize: 15, color: '#FBF6EC' },
  wearSub: { fontFamily: fonts.ui, fontSize: 12, color: 'rgba(251,246,236,0.85)', marginTop: 2 },
  section: { borderTopWidth: 1, borderTopColor: colors.cardBorder, marginTop: spacing.md, paddingTop: spacing.md },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: spacing.sm, gap: spacing.sm },
  sectionLabel: { fontFamily: fonts.uiSemi, fontSize: 15, color: colors.ink },
  sectionHint: { fontFamily: fonts.ui, fontSize: 12, color: colors.muted, flexShrink: 1, textAlign: 'right' },
  badgeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  badgeSlot: { padding: 3, borderRadius: 26, borderWidth: 2, borderColor: 'transparent' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  chip: {
    width: '31%',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    backgroundColor: colors.plaster,
    padding: spacing.sm,
    alignItems: 'center',
    gap: 4,
  },
  chipSelected: { borderColor: colors.saffron, backgroundColor: colors.highlight },
  chipArt: { alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch', minHeight: 30 },
  themePreview: { alignItems: 'center', alignSelf: 'stretch', gap: 4 },
  themeBand: { alignSelf: 'stretch', borderRadius: 3, overflow: 'hidden' },
  chipLabel: { fontFamily: fonts.uiMedium, fontSize: 12, color: colors.ink, textAlign: 'center' },
  lockRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  lockText: { fontFamily: fonts.uiSemi, fontSize: 11, color: colors.muted },
  inUse: { fontFamily: fonts.uiSemi, fontSize: 11, color: colors.terracotta },
  use: { fontFamily: fonts.uiSemi, fontSize: 11, color: colors.link },
}),
);

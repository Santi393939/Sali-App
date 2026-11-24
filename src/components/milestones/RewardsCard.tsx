/**
 * Rewards: what each milestone unlocks, and the controls to use them.
 * Locked items show what they need; tapping one opens that milestone.
 */
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { MILESTONES } from '@/content/milestones';
import {
  ARCH_THEMES,
  BAND_THEMES,
  FEATURED_BADGE_UNLOCK,
  TAP_SOUNDS,
  type ArchTheme,
  type BandTheme,
  type TapSound,
} from '@/content/rewards';
import { feedback } from '@/lib/feedback';
import type { ActiveRewards } from '@/store/rewards';
import { updateSettings } from '@/store/settings';
import { colors, fonts, spacing } from '@/theme';

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

const short = (n: number) => MILESTONES.find((m) => m.amount === n)?.short ?? '';
const nameOf = (n: number) => MILESTONES.find((m) => m.amount === n)?.name ?? '';

export function RewardsCard({ lifetime, active, onLocked }: Props) {
  const unlocked = MILESTONES.filter((m) => lifetime >= m.amount).length;
  const choose = (patch: Parameters<typeof updateSettings>[0]) => {
    feedback.medium();
    updateSettings(patch);
  };
  const locked = (amount: number) => {
    feedback.selection();
    onLocked(amount);
  };

  return (
    <Card>
      <Text style={styles.title}>Rewards</Text>
      <Text style={styles.sub}>
        {unlocked} of {MILESTONES.length} unlocked. Each part of your masjid adds something you can use.
      </Text>

      {/* Featured badge */}
      <Section label="Featured badge" hint="Shown beside your name" need={FEATURED_BADGE_UNLOCK} lifetime={lifetime}>
        <View style={styles.badgeRow}>
          {MILESTONES.map((m) => {
            const earned = lifetime >= m.amount;
            const selected = active.featuredBadge === m.amount;
            return (
              <Pressable
                key={m.amount}
                accessibilityRole="button"
                accessibilityLabel={`${m.name}${selected ? ', featured' : ''}${earned ? '' : ', locked'}`}
                onPress={() => (earned ? choose({ featuredBadge: selected ? null : m.amount }) : locked(m.amount))}
                style={[styles.badgeSlot, selected && styles.badgeSelected]}>
                <Medallion size={42} icon={m.icon} earned={earned} />
              </Pressable>
            );
          })}
        </View>
      </Section>

      {/* Counter arch */}
      <Section label="Counter arch" hint="The arch you tap on Today" lifetime={lifetime}>
        <View style={styles.chips}>
          {(Object.keys(ARCH_THEMES) as ArchTheme[]).map((k) => {
            const t = ARCH_THEMES[k];
            const open = lifetime >= t.unlock;
            return (
              <Chip
                key={k}
                label={t.name}
                selected={active.arch === k}
                lockedFor={open ? null : t.unlock}
                onPress={() => (open ? choose({ archTheme: k }) : locked(t.unlock))}>
                <Svg width={26} height={32}>
                  <Path d={horseshoeArchPath(26, 32, 1)} fill={t.arch} stroke={colors.saffron} strokeWidth={1.2} />
                </Svg>
              </Chip>
            );
          })}
        </View>
      </Section>

      {/* Tile band */}
      <Section label="Tile bands" hint="The zellige strips across the app" lifetime={lifetime}>
        <View style={styles.chips}>
          {(Object.keys(BAND_THEMES) as BandTheme[]).map((k) => {
            const t = BAND_THEMES[k];
            const open = lifetime >= t.unlock;
            return (
              <Chip
                key={k}
                label={t.name}
                wide
                selected={active.band === k}
                lockedFor={open ? null : t.unlock}
                onPress={() => (open ? choose({ bandTheme: k }) : locked(t.unlock))}>
                <View style={styles.bandPreview}>
                  <ZelligeBand height={16} theme={k} />
                </View>
              </Chip>
            );
          })}
        </View>
      </Section>

      {/* Tap sound */}
      <Section label="Tap sound" hint="Plays each time you tap the arch" lifetime={lifetime} last>
        <View style={styles.chips}>
          {(Object.keys(TAP_SOUNDS) as TapSound[]).map((k) => {
            const t = TAP_SOUNDS[k];
            const open = lifetime >= t.unlock;
            return (
              <Chip
                key={k}
                label={t.name}
                wide
                selected={active.sound === k}
                lockedFor={open ? null : t.unlock}
                onPress={() => {
                  if (!open) return locked(t.unlock);
                  feedback.previewSound(k);
                  choose({ tapSound: k });
                }}>
                <SoundIcon kind={k} />
              </Chip>
            );
          })}
        </View>
      </Section>
    </Card>
  );
}

function Section({
  label,
  hint,
  need,
  lifetime,
  last,
  children,
}: {
  label: string;
  hint: string;
  need?: number;
  lifetime: number;
  last?: boolean;
  children: ReactNode;
}) {
  const closed = need != null && lifetime < need;
  return (
    <View style={[styles.section, last && { paddingBottom: 0 }]}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionLabel}>{label}</Text>
        <Text style={styles.sectionHint}>{closed ? `Reach ${nameOf(need!)} · ${short(need!)}` : hint}</Text>
      </View>
      {children}
    </View>
  );
}

function Chip({
  label,
  selected,
  lockedFor,
  wide,
  onPress,
  children,
}: {
  label: string;
  selected: boolean;
  lockedFor: number | null;
  wide?: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  const isLocked = lockedFor != null;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: isLocked }}
      accessibilityLabel={`${label}${isLocked ? `, locked until ${short(lockedFor!)}` : selected ? ', in use' : ''}`}
      style={({ pressed }) => [styles.chip, wide && styles.chipWide, selected && styles.chipSelected, pressed && { transform: [{ scale: 0.97 }] }]}>
      <View style={[styles.chipArt, isLocked && { opacity: 0.35 }]}>{children}</View>
      <Text style={[styles.chipLabel, isLocked && { color: colors.muted }]} numberOfLines={2}>
        {label}
      </Text>
      {isLocked ? (
        <View style={styles.lockRow}>
          <LockIcon />
          <Text style={styles.lockText}>{short(lockedFor!)}</Text>
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

function SoundIcon({ kind }: { kind: TapSound }) {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={colors.zelligeGreen} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {kind === 'tick' ? (
        <Path d="M4 12h3l4-4v8l-4-4M15 9.5a3.5 3.5 0 0 1 0 5" />
      ) : (
        <Path d="M12 3.5c3 4 5 6.6 5 9.5a5 5 0 0 1-10 0c0-2.9 2-5.5 5-9.5Z" stroke={colors.cobalt} />
      )}
    </Svg>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.display, fontSize: 24, color: colors.ink },
  sub: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 19, color: colors.muted, marginTop: 2 },
  section: { borderTopWidth: 1, borderTopColor: colors.cardBorder, marginTop: spacing.md, paddingTop: spacing.md },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: spacing.sm, gap: spacing.sm },
  sectionLabel: { fontFamily: fonts.uiSemi, fontSize: 15, color: colors.ink },
  sectionHint: { fontFamily: fonts.ui, fontSize: 12, color: colors.muted, flexShrink: 1, textAlign: 'right' },
  badgeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  badgeSlot: { padding: 3, borderRadius: 26, borderWidth: 2, borderColor: 'transparent' },
  badgeSelected: { borderColor: colors.saffron, backgroundColor: '#FBEFD6' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    width: '23%',
    flexGrow: 1,
    minWidth: 72,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    backgroundColor: colors.plaster,
    padding: spacing.sm,
    alignItems: 'center',
    gap: 4,
  },
  chipWide: { width: '45%' },
  chipSelected: { borderColor: colors.saffron, backgroundColor: '#FBEFD6' },
  chipArt: { height: 34, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  bandPreview: { alignSelf: 'stretch', borderRadius: 4, overflow: 'hidden' },
  chipLabel: { fontFamily: fonts.uiMedium, fontSize: 12, color: colors.ink, textAlign: 'center' },
  lockRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  lockText: { fontFamily: fonts.uiSemi, fontSize: 11, color: colors.muted },
  inUse: { fontFamily: fonts.uiSemi, fontSize: 11, color: colors.terracotta },
  use: { fontFamily: fonts.uiSemi, fontSize: 11, color: colors.zelligeGreen },
});

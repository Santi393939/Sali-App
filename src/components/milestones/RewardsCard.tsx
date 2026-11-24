/**
 * Rewards: every milestone unlocks a title, a theme and a tap sound.
 * Locked items show what they need; tapping one opens that milestone.
 */
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { GLASSES, LAMP_STEP, lampsFor } from '@/content/extras';
import { MILESTONES, type Milestone } from '@/content/milestones';
import { SOUNDS, THEMES, type SoundId, type ThemeId } from '@/content/rewards';
import { feedback } from '@/lib/feedback';
import { switchTheme } from '@/lib/themeSwitch';
import { applyMilestoneRewards, resetRewards, type ActiveRewards } from '@/store/rewards';
import { updateSettings } from '@/store/settings';
import { colors, fonts, paletteFor, PALETTES, spacing, themedStyles } from '@/theme';

import { Card } from '../Card';
import { Lantern } from '../Lantern';
import { eightPointStarPath, horseshoeArchPath } from '../geometry';
import { ZelligeBand } from '../ZelligeBand';
import { Medallion } from './Medallion';
import { isRTL, t } from '@/lib/i18n';

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
  const wear = (m: Milestone) => {
    feedback.add('large');
    switchTheme(() => applyMilestoneRewards(m), m.theme, paletteFor(m.theme).plaster, m);
  };
  const wearingLatest =
    latest && active.theme === latest.theme && active.sound === latest.sound && active.featured?.amount === latest.amount;

  return (
    <Card>
      <Text style={styles.title}>{t('Rewards')}</Text>
      <Text style={styles.sub}>
        {t('{n} of {total} parts built. Each one unlocks a title, a theme and a tap sound.', { n: earned.length, total: MILESTONES.length })}
      </Text>

      {latest && !wearingLatest && (
        <Pressable
          onPress={() => wear(latest)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.wearAll, { backgroundColor: latest.palette.face }, pressed && { opacity: 0.9 }]}>
          <Medallion size={40} milestone={latest} earned />
          <View style={{ flex: 1 }}>
            <Text style={styles.wearTitle}>{t('Wear the {name} set', { name: latest.name.replace(/^The /, '') })}</Text>
            <Text style={styles.wearSub}>
              {t('{name} theme', { name: THEMES[latest.theme].name })} · {SOUNDS[latest.sound].name} · “{latest.title}”
            </Text>
          </View>
        </Pressable>
      )}

      {/* Badge sets: tap a badge to wear its theme, sound and title */}
      <Section label={t('Badge sets')} hint={active.featured ? active.featured.title : t('Tap a badge to wear its set')}>
        <View style={styles.badgeRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('Default Zellige look') + (!active.featured && active.theme === 'zellige' ? t(', in use') : '')}
            onPress={() => {
              feedback.medium();
              switchTheme(resetRewards, 'zellige', paletteFor('zellige').plaster);
            }}
            style={[styles.badgeSlot, !active.featured && active.theme === 'zellige' && { borderColor: colors.saffron, backgroundColor: colors.highlight }]}>
            <Svg width={38} height={38}>
              <Path d={eightPointStarPath(19, 19, 17)} fill={PALETTES.zellige.zelligeGreen} stroke={PALETTES.zellige.saffron} strokeWidth={1.5} />
            </Svg>
          </Pressable>
          {MILESTONES.map((m) => {
            const has = lifetime >= m.amount;
            const selected = active.featured?.amount === m.amount && active.theme === m.theme;
            return (
              <Pressable
                key={m.amount}
                accessibilityRole="button"
                accessibilityLabel={t('{name} set', { name: m.name }) + (selected ? t(', in use') : '') + (has ? '' : t(', locked'))}
                onPress={() => (has ? wear(m) : locked(m.amount))}
                style={[styles.badgeSlot, selected && { borderColor: m.palette.rim, backgroundColor: colors.highlight }]}>
                <Medallion size={38} milestone={m} earned={has} />
              </Pressable>
            );
          })}
        </View>
      </Section>

      {/* Themes */}
      <Section label={t('Themes')} hint={t('Arch, star and tiles across the app')}>
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
                onPress={() => {
                  if (!open) return locked(t.unlock);
                  feedback.medium();
                  switchTheme(() => updateSettings({ theme: k }), k, paletteFor(k).plaster);
                }}>
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

      {/* Lantern glass (a new colour with each lamp, every 5,000) */}
      <Section label={t('Lantern glass')} hint={t('A new colour with each lamp')}>
        <View style={styles.grid}>
          {GLASSES.map((g) => {
            const open = lampsFor(lifetime) >= g.lamp;
            return (
              <Chip
                key={g.id}
                label={g.name}
                selected={active.glass === g.color}
                lockedFor={null}
                lockText={open ? undefined : `${((g.lamp * LAMP_STEP) / 1000).toLocaleString('en-US')}k`}
                onPress={() => {
                  if (!open) {
                    feedback.selection();
                    return;
                  }
                  choose({ lanternGlass: g.id });
                }}>
                <Lantern size={34} lit glow={false} glassColor={g.color} />
              </Chip>
            );
          })}
        </View>
      </Section>

      {/* Tap sounds */}
      <Section label={t('Sound sets')} hint={t('Tap, +100 and +1,000 · tap to hear')} last>
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
                  feedback.previewSet(k);
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
  lockText,
  onPress,
  children,
}: {
  label: string;
  selected: boolean;
  lockedFor: number | null;
  /** Lock label for rewards not tied to a big milestone. */
  lockText?: string;
  onPress: () => void;
  children: ReactNode;
}) {
  const owner: Milestone | undefined = lockedFor != null ? unlockOf(lockedFor) : undefined;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: !!owner }}
      accessibilityLabel={label + (owner ? t(', unlocks at {n}', { n: owner.short }) : selected ? t(', in use') : '')}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && { transform: [{ scale: 0.97 }] }]}>
      <View style={[styles.chipArt, (owner || lockText) && { opacity: 0.3 }]}>{children}</View>
      <Text style={[styles.chipLabel, owner && { color: colors.muted }]} numberOfLines={1}>
        {label}
      </Text>
      {owner || lockText ? (
        <View style={styles.lockRow}>
          <LockIcon />
          <Text style={styles.lockText}>{owner ? owner.short : lockText}</Text>
        </View>
      ) : selected ? (
        <Text style={styles.inUse}>{t('In use')}</Text>
      ) : (
        <Text style={styles.use}>{t('Use')}</Text>
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
  sectionHint: { fontFamily: fonts.ui, fontSize: 12, color: colors.muted, flexShrink: 1, textAlign: isRTL() ? 'left' : 'right' },
  badgeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  badgeSlot: { padding: 2, borderRadius: 24, borderWidth: 2, borderColor: 'transparent' },
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

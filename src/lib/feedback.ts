/**
 * Haptics and sound for each moment in the brief's "Animations and haptics"
 * table, fired together so motion, touch and sound land at the same time.
 * Haptics always play (even with Reduce Motion on). Sounds are placeholders
 * until the purchased set arrives; they respect the phone's silent switch.
 */
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';

import { getRewards } from '@/store/rewards';

type SoundName = 'tick' | 'cluster' | 'chime' | 'success' | 'drop' | 'knock' | 'clink' | 'bell' | 'gong' | 'birds';

const SOURCES: Record<SoundName, number> = {
  tick: require('../../assets/sounds/tick.wav'),
  cluster: require('../../assets/sounds/tick-cluster.wav'),
  chime: require('../../assets/sounds/chime.wav'),
  success: require('../../assets/sounds/success.wav'),
  drop: require('../../assets/sounds/drop.wav'),
  knock: require('../../assets/sounds/knock.wav'),
  clink: require('../../assets/sounds/clink.wav'),
  bell: require('../../assets/sounds/bell.wav'),
  gong: require('../../assets/sounds/gong.wav'),
  birds: require('../../assets/sounds/birds.wav'),
};

const VOLUME: Record<SoundName, number> = {
  tick: 0.35,
  cluster: 0.45,
  chime: 0.55,
  success: 0.6,
  drop: 0.45,
  knock: 0.5,
  clink: 0.4,
  bell: 0.4,
  gong: 0.5,
  birds: 0.4,
};

const players: Partial<Record<SoundName, AudioPlayer>> = {};

function play(name: SoundName) {
  try {
    let p = players[name];
    if (!p) {
      p = createAudioPlayer(SOURCES[name]);
      p.volume = VOLUME[name];
      players[name] = p;
    }
    p.seekTo(0).catch(() => {});
    p.play();
  } catch {
    // Sound is a nicety; never let it break counting.
  }
}

const safe = (fn: () => Promise<void>) => {
  fn().catch(() => {});
};

/** How big an add feels. */
export type AddKind = 'tap' | 'small' | 'medium' | 'large';

/** +1 → tap; +100 → small; +300 → medium; +1,000 or any number-pad add → large. */
export function addKind(amount: number, source: 'tap' | 'quick' | 'pad'): AddKind {
  if (source === 'tap') return 'tap';
  if (source === 'pad' || amount >= 1000) return 'large';
  if (amount >= 300) return 'medium';
  return 'small';
}

export const feedback = {
  add(kind: AddKind) {
    switch (kind) {
      case 'tap':
        safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
        play(getRewards().sound);
        break;
      case 'small':
        safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
        play('cluster');
        break;
      case 'medium':
        safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
        play('cluster');
        break;
      case 'large':
        safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
        play('chime');
        break;
    }
  },
  /** Number pad key press. */
  key() {
    safe(() => Haptics.selectionAsync());
  },
  /**
   * Streak takeover sequence (times from the moment it opens):
   * Light 0 s · Heavy 0.35 s + chime (lantern ignites) · Success 0.9 s + success
   * sound (number flips) · Medium 1.4 s (check stamps) · Light 1.75 s (goal bar).
   * Returns a cancel function.
   */
  takeover(): () => void {
    const steps: [number, () => void][] = [
      [0, () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light))],
      [350, () => {
        safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
        play('chime');
      }],
      [900, () => {
        safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
        play('success');
      }],
      [1400, () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium))],
      [1750, () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light))],
    ];
    const timers = steps.map(([ms, fn]) => setTimeout(fn, ms));
    return () => timers.forEach(clearTimeout);
  },
  /** A tasbih round of 33 taps completed. */
  round(big = false) {
    safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
    play(big ? 'chime' : 'clink');
  },
  /** A daily quest completed. */
  quest(all = false) {
    safe(() => (all ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)));
    play(all ? 'success' : 'cluster');
  },
  /** Crossing into a new tab mid-swipe. */
  selection() {
    safe(() => Haptics.selectionAsync());
  },
  /** Toggles, landing on a tab and other medium taps. */
  medium() {
    safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
  },
  /** Preview a tap sound (Rewards on Me). */
  previewSound(sound: SoundName) {
    play(sound);
  },
  /**
   * Each milestone's unlock has its own rhythm, growing with the milestone.
   * Returns a cancel function.
   */
  milestone(effect: 'doors' | 'tiles' | 'fountain' | 'beam' | 'rings' | 'petals', sound: SoundName): () => void {
    const L = () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
    const M = () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
    const H = () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
    const S = () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
    const T = () => safe(() => Haptics.selectionAsync());
    const own = () => play(sound);
    const chime = () => play('chime');
    const success = () => play('success');
    const PATTERNS: Record<typeof effect, [number, () => void][]> = {
      // knock-knock, the doors open
      doors: [[0, L], [250, () => (M(), own())], [450, () => (M(), own())], [800, () => (S(), chime())]],
      // a ripple of tiles clicking into place
      tiles: [[0, L], ...[300, 360, 420, 480, 540, 600, 660, 720].map((ms) => [ms, () => (T(), own())] as [number, () => void]), [900, () => (S(), chime())]],
      // water rising, then the splash
      fountain: [[0, L], [250, L], [420, M], [600, () => (H(), own())], [900, () => (S(), chime())], [1500, own]],
      // the beam climbs, then the bell
      beam: [[0, M], [300, M], [600, H], [900, () => (S(), own(), chime())], [1500, own]],
      // deep pulses as the rings spread
      rings: [[0, H], [450, () => (H(), own())], [900, () => (H(), own())], [1350, () => (S(), chime(), success())]],
      // the biggest: bursts, then petals with birdsong
      petals: [[0, H], [200, M], [400, () => (S(), chime())], [900, () => (H(), own())], [1300, () => (S(), success())], [1800, own], [2500, own]],
    };
    const timers = PATTERNS[effect].map(([ms, fn]) => setTimeout(fn, ms));
    return () => timers.forEach(clearTimeout);
  },
  /** Opening the number pad sheet. */
  sheetOpen() {
    safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
  },
};

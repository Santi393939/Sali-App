/**
 * Haptics and sound for each moment in the brief's "Animations and haptics"
 * table, fired together so motion, touch and sound land at the same time.
 * Haptics always play (even with Reduce Motion on). Sounds are placeholders
 * until the purchased set arrives; they respect the phone's silent switch.
 */
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';

type SoundName = 'tick' | 'cluster' | 'chime' | 'success';

const SOURCES: Record<SoundName, number> = {
  tick: require('../../assets/sounds/tick.wav'),
  cluster: require('../../assets/sounds/tick-cluster.wav'),
  chime: require('../../assets/sounds/chime.wav'),
  success: require('../../assets/sounds/success.wav'),
};

const VOLUME: Record<SoundName, number> = { tick: 0.35, cluster: 0.45, chime: 0.55, success: 0.6 };

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
        play('tick');
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
  /** Toggles and other medium taps. */
  medium() {
    safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
  },
  /** Opening the number pad sheet. */
  sheetOpen() {
    safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
  },
};

import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { feedback } from '@/lib/feedback';
import { MAX_SINGLE_ADD } from '@/store/counts';
import { colors, fonts, radius, spacing } from '@/theme';

import { PrimaryButton } from './PrimaryButton';

type Props = {
  visible: boolean;
  onAdd: (amount: number) => void;
  onClose: () => void;
  /** Heading above the number. */
  title?: string;
  /** Button text for a typed amount, e.g. "Add 250" or "Set goal to 500". */
  actionLabel?: (amount: string) => string;
  max?: number;
};

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'del'] as const;
const OFFSCREEN = 700;

/** Bottom sheet for typing any amount. Caps at MAX_SINGLE_ADD. */
export function NumberPadSheet({
  visible,
  onAdd,
  onClose,
  title = 'Add salawat',
  actionLabel = (a) => `Add ${a}`,
  max = MAX_SINGLE_ADD,
}: Props) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const [digits, setDigits] = useState('');
  const amount = Number(digits || '0');

  // Keep the Modal mounted while the sheet slides away.
  const [mounted, setMounted] = useState(visible);
  if (visible && !mounted) setMounted(true);
  const y = useSharedValue(OFFSCREEN);
  const shade = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Sheet springs up (~0.28 s to settle) while the backdrop fades in.
      y.value = reduceMotion ? 0 : withSpring(0, { damping: 22, stiffness: 340, mass: 0.8, overshootClamping: false });
      shade.value = withTiming(1, { duration: 200 });
    } else {
      shade.value = withTiming(0, { duration: 180 });
      y.value = withTiming(reduceMotion ? 0 : OFFSCREEN, { duration: reduceMotion ? 0 : 200, easing: Easing.in(Easing.quad) }, (done) => {
        if (done) scheduleOnRN(setMounted, false);
      });
    }
  }, [visible, reduceMotion, y, shade]);

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const shadeStyle = useAnimatedStyle(() => ({ opacity: shade.value }));

  const close = () => {
    setDigits('');
    onClose();
  };

  const press = (key: (typeof KEYS)[number]) => {
    feedback.key();
    if (key === 'del') {
      setDigits((d) => d.slice(0, -1));
      return;
    }
    setDigits((d) => {
      const next = (d + key).replace(/^0+/, '');
      return Number(next || '0') > max ? d : next;
    });
  };

  const add = () => {
    if (amount <= 0) return;
    onAdd(amount);
    setDigits('');
  };

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={close} statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, shadeStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Close number pad" />
        </Animated.View>
        <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }, sheetStyle]}>
          <View style={styles.grabber} />
          <Text style={styles.label}>{title}</Text>
          <Text
            style={[styles.display, amount === 0 && styles.displayEmpty]}
            accessibilityLiveRegion="polite"
            numberOfLines={1}
            adjustsFontSizeToFit>
            {amount.toLocaleString('en-US')}
          </Text>
          <Text style={styles.hint}>Up to {max.toLocaleString('en-US')}</Text>

          <View style={styles.grid}>
            {KEYS.map((key) => (
              <PadKey key={key} label={key === 'del' ? 'Delete' : key} onPress={() => press(key)}>
                {key === 'del' ? <DeleteIcon /> : <Text style={styles.keyText}>{key}</Text>}
              </PadKey>
            ))}
          </View>

          <PrimaryButton
            label={amount > 0 ? actionLabel(amount.toLocaleString('en-US')) : actionLabel('').trim()}
            onPress={add}
            disabled={amount === 0}
          />
          <Pressable onPress={close} accessibilityRole="button" style={styles.cancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

/** A key that springs down to 0.96 while pressed. */
function PadKey({ label, onPress, children }: { label: string; onPress: () => void; children: ReactNode }) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[styles.keyWrap, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => scale.set(withSpring(0.96, { damping: 20, stiffness: 600 }))}
        onPressOut={() => scale.set(withSpring(1, { damping: 14, stiffness: 400 }))}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}>
        {children}
      </Pressable>
    </Animated.View>
  );
}

function DeleteIcon() {
  return (
    <Svg width={26} height={20} viewBox="0 0 26 20" fill="none" stroke={colors.ink} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round">
      <Path d="M8 2H23a1.5 1.5 0 0 1 1.5 1.5v13A1.5 1.5 0 0 1 23 18H8L1.5 10Z" />
      <Path d="M12 7l6 6M18 7l-6 6" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(22,19,15,0.45)' },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.cardBorder, marginBottom: spacing.md },
  label: { fontFamily: fonts.uiSemi, fontSize: 12, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.8, textAlign: 'center' },
  display: {
    fontFamily: fonts.display,
    fontVariant: ['lining-nums'],
    fontSize: 64,
    lineHeight: 74,
    color: colors.ink,
    textAlign: 'center',
  },
  displayEmpty: { color: colors.cardBorder },
  hint: { fontFamily: fonts.ui, fontSize: 12, color: colors.muted, textAlign: 'center', marginBottom: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.sm, marginBottom: spacing.lg },
  keyWrap: { width: '31.5%' },
  key: {
    height: 56,
    borderRadius: radius.button,
    backgroundColor: colors.plaster,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyPressed: { backgroundColor: colors.cardBorder },
  keyText: { fontFamily: fonts.uiSemi, fontSize: 22, color: colors.ink },
  cancel: { height: 48, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xs },
  cancelText: { fontFamily: fonts.uiSemi, fontSize: 15, color: colors.muted },
});

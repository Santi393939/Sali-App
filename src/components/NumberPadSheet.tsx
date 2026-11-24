import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { MAX_SINGLE_ADD } from '@/store/counts';
import { colors, fonts, radius, spacing } from '@/theme';

import { PrimaryButton } from './PrimaryButton';

type Props = {
  visible: boolean;
  onAdd: (amount: number) => void;
  onClose: () => void;
};

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'del'] as const;

/** Bottom sheet for typing any amount. Caps at MAX_SINGLE_ADD. */
export function NumberPadSheet({ visible, onAdd, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [digits, setDigits] = useState('');
  const amount = Number(digits || '0');

  const close = () => {
    setDigits('');
    onClose();
  };

  const press = (key: (typeof KEYS)[number]) => {
    if (key === 'del') {
      setDigits((d) => d.slice(0, -1));
      return;
    }
    setDigits((d) => {
      const next = (d + key).replace(/^0+/, '');
      return Number(next || '0') > MAX_SINGLE_ADD ? d : next;
    });
  };

  const add = () => {
    if (amount <= 0) return;
    onAdd(amount);
    setDigits('');
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close} statusBarTranslucent>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Close number pad" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.grabber} />
          <Text style={styles.label}>Add salawat</Text>
          <Text
            style={[styles.display, amount === 0 && styles.displayEmpty]}
            accessibilityLiveRegion="polite"
            numberOfLines={1}
            adjustsFontSizeToFit>
            {amount.toLocaleString('en-US')}
          </Text>
          <Text style={styles.hint}>Up to {MAX_SINGLE_ADD.toLocaleString('en-US')} at a time</Text>

          <View style={styles.grid}>
            {KEYS.map((key) => (
              <Pressable
                key={key}
                onPress={() => press(key)}
                accessibilityRole="button"
                accessibilityLabel={key === 'del' ? 'Delete' : key}
                style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}>
                {key === 'del' ? <DeleteIcon /> : <Text style={styles.keyText}>{key}</Text>}
              </Pressable>
            ))}
          </View>

          <PrimaryButton
            label={amount > 0 ? `Add ${amount.toLocaleString('en-US')}` : 'Add'}
            onPress={add}
            disabled={amount === 0}
          />
          <Pressable onPress={close} accessibilityRole="button" style={styles.cancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
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
  key: {
    width: '31.5%',
    height: 56,
    borderRadius: radius.button,
    backgroundColor: colors.plaster,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyPressed: { backgroundColor: colors.cardBorder, transform: [{ scale: 0.96 }] },
  keyText: { fontFamily: fonts.uiSemi, fontSize: 22, color: colors.ink },
  cancel: { height: 48, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xs },
  cancelText: { fontFamily: fonts.uiSemi, fontSize: 15, color: colors.muted },
});

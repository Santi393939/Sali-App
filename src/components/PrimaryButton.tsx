import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fonts, radius, size, themedStyles } from '@/theme';

type Props = {
  label: string;
  onPress?: () => void;
  /** primary = green double frame; secondary = cream with saffron border. */
  variant?: 'primary' | 'secondary';
  compact?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Salli's main button: green fill, saffron border and an inner green ring
 * (the double-frame look). Height 56 (54 when compact), radius 16.
 */
export function PrimaryButton({ label, onPress, variant = 'primary', compact = false, disabled, style }: Props) {
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        { height: compact ? size.buttonHeightCompact : size.buttonHeight },
        primary ? styles.primary : styles.secondary,
        pressed && (primary ? styles.primaryPressed : styles.secondaryPressed),
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}>
      {primary && <View style={styles.innerRing} pointerEvents="none" />}
      <Text style={[styles.label, primary ? styles.labelPrimary : styles.labelSecondary]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
  base: {
    minWidth: size.minTouch,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  primary: {
    backgroundColor: colors.zelligeGreen,
    borderWidth: 1.5,
    borderColor: colors.saffron,
  },
  primaryPressed: {
    backgroundColor: colors.deepGreen,
  },
  secondary: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.saffron,
  },
  secondaryPressed: {
    backgroundColor: colors.plaster,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },
  disabled: {
    opacity: 0.5,
  },
  innerRing: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: 3,
    bottom: 3,
    borderRadius: radius.button - 3,
    borderWidth: 1,
    borderColor: colors.primaryRing,
  },
  label: {
    fontFamily: fonts.uiSemi,
    fontSize: 16,
  },
  labelPrimary: {
    color: colors.onPrimary,
  },
  labelSecondary: {
    color: colors.link,
  },
}),
);

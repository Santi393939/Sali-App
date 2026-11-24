import { StyleSheet, TextInput, type StyleProp, type TextStyle } from 'react-native';
import Animated, { useAnimatedProps, type SharedValue } from 'react-native-reanimated';

import { formatCount } from './format';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

type Props = {
  value: SharedValue<number>;
  style?: StyleProp<TextStyle>;
};

/**
 * A number that redraws on the UI thread every frame without touching React
 * state (a read-only TextInput whose text is set from a worklet).
 */
export function AnimatedCount({ value, style }: Props) {
  const animatedProps = useAnimatedProps(() => {
    const text = formatCount(value.value);
    return { text, defaultValue: text } as object;
  });
  return (
    <AnimatedTextInput
      editable={false}
      underlineColorAndroid="transparent"
      pointerEvents="none"
      importantForAccessibility="no"
      style={[styles.reset, style]}
      animatedProps={animatedProps}
    />
  );
}

const styles = StyleSheet.create({
  reset: { padding: 0, margin: 0, textAlign: 'center' },
});

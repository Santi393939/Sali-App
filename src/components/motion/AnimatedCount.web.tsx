import { useState } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import { useAnimatedReaction, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { formatCount } from './format';

type Props = {
  value: SharedValue<number>;
  style?: StyleProp<TextStyle>;
};

/** Web version: browsers have no separate UI thread, so a plain Text follows the value. */
export function AnimatedCount({ value, style }: Props) {
  const [text, setText] = useState('0');
  useAnimatedReaction(
    () => formatCount(value.value),
    (next, prev) => {
      if (next !== prev) scheduleOnRN(setText, next);
    },
  );
  return <Text style={[{ textAlign: 'center' }, style]}>{text}</Text>;
}

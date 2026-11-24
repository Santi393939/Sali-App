import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, fonts } from '@/theme';

import { eightPointStarPath, horseshoeArchPath } from './geometry';

type Props = {
  size: number;
};

/**
 * Salli logo: green 8-point star with a saffron edge, a cream horseshoe arch
 * inside, and صلِّ in the doorway. The Arabic is set in Amiri until the
 * commissioned Maghribi calligraphy file arrives.
 */
export function Logo({ size }: Props) {
  const c = size / 2;
  const edge = Math.max(1.5, size * 0.03);
  const archW = size * 0.42;
  const archH = size * 0.5;
  const archX = c - archW / 2;
  const archY = c - archH / 2 + size * 0.02;
  return (
    <View style={{ width: size, height: size }} accessibilityLabel="Salli logo">
      <Svg width={size} height={size}>
        <Path d={eightPointStarPath(c, c, c - edge / 2)} fill={colors.zelligeGreen} stroke={colors.saffron} strokeWidth={edge} />
        <Path
          d={horseshoeArchPath(archW, archH, 0, 22)}
          fill={colors.card}
          transform={`translate(${archX} ${archY})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
        <Text
          style={{
            fontFamily: fonts.arabicBold,
            fontSize: size * 0.2,
            lineHeight: size * 0.36,
            color: colors.zelligeGreen,
            marginTop: size * 0.07,
            writingDirection: 'rtl',
          }}>
          صلِّ
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

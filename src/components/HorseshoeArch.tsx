import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, themedStyles } from '@/theme';

import { horseshoeArchPath } from './geometry';

type Props = {
  width: number;
  height: number;
  fill?: string;
  /** Gold outline drawn around the arch. Set to 0 to hide. */
  frameWidth?: number;
  frameColor?: string;
  /** Second, inner line inside the frame (the double-frame look). */
  innerLine?: boolean;
  /** How far the arc wraps below its centre line, in degrees. */
  wrap?: number;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * A Moroccan horseshoe arch (arc wider than a semicircle) with an optional
 * saffron double frame. Children are centred inside the arch.
 */
export function HorseshoeArch({
  width,
  height,
  fill = colors.zelligeGreen,
  frameWidth = 2,
  frameColor = colors.saffron,
  innerLine = true,
  wrap = 24,
  children,
  style,
}: Props) {
  const outer = frameWidth / 2;
  const innerInset = frameWidth + 5;
  return (
    <View style={[{ width, height }, style]}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Path d={horseshoeArchPath(width, height, outer, wrap)} fill={fill} />
        {frameWidth > 0 && (
          <Path
            d={horseshoeArchPath(width, height, outer, wrap)}
            fill="none"
            stroke={frameColor}
            strokeWidth={frameWidth}
          />
        )}
        {frameWidth > 0 && innerLine && (
          <Path
            d={horseshoeArchPath(width, height + innerInset, innerInset, wrap)}
            fill="none"
            stroke={colors.lightGold}
            strokeOpacity={0.55}
            strokeWidth={1}
          />
        )}
      </Svg>
      <View style={styles.content} pointerEvents="box-none">
        {children}
      </View>
    </View>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
  content: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
}),
);

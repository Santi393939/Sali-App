import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';

import { colors } from '@/theme';

import { eightPointStarPath } from './geometry';

type Props = {
  /** Distance between star centres in px. */
  cell?: number;
  color?: string;
  opacity?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Carved-plaster texture: thin 8-point star line art on a staggered grid,
 * at low opacity. Fills its parent; place it behind other content.
 */
export function PlasterPattern({ cell = 44, color = colors.terracotta, opacity = 0.13, style }: Props) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setBox({ w: Math.round(width), h: Math.round(height) });
  };

  const cols = Math.ceil(box.w / cell) + 1;
  const rows = Math.ceil(box.h / cell) + 1;
  const r = cell * 0.36;

  return (
    <View style={[StyleSheet.absoluteFill, style]} onLayout={onLayout} pointerEvents="none">
      {box.w > 0 && (
        <Svg width={box.w} height={box.h}>
          <G stroke={color} strokeOpacity={opacity} strokeWidth={1} fill="none">
            {Array.from({ length: rows }, (_, row) =>
              Array.from({ length: cols }, (_, col) => {
                const cx = col * cell + (row % 2 ? cell / 2 : 0);
                const cy = row * cell;
                return (
                  <G key={`${row}-${col}`}>
                    <Path d={eightPointStarPath(cx, cy, r)} />
                    <Path d={eightPointStarPath(cx, cy, r * 0.55, undefined, 22.5)} />
                    <Circle cx={cx} cy={cy} r={r * 0.18} />
                  </G>
                );
              }),
            )}
          </G>
        </Svg>
      )}
    </View>
  );
}

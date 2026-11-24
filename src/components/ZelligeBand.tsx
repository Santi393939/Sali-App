import { useState } from 'react';
import { View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';

import { colors, size as sizes } from '@/theme';

import { diamondPath, eightPointStarPath } from './geometry';

type Props = {
  /** Strip height in px, 14–28. */
  height?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Zellige tile strip: cobalt 8-point stars with saffron centres and small
 * green diamonds between them, on cream, edged with thin saffron lines.
 */
export function ZelligeBand({ height = 20, style }: Props) {
  const h = Math.min(sizes.zelligeBandMax, Math.max(sizes.zelligeBandMin, height));
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));

  const edge = 1.5; // saffron line top and bottom
  const inner = h - edge * 2;
  const tile = inner * 1.15; // spacing between star centres
  const count = width > 0 ? Math.ceil(width / tile) + 1 : 0;
  // Centre the pattern so both ends are cut evenly.
  const offset = (width - (count - 1) * tile) / 2;
  const cy = h / 2;
  const starR = inner * 0.43;
  const dotR = inner * 0.1;
  const diamondR = inner * 0.16;

  return (
    <View style={[{ height: h, width: '100%' }, style]} onLayout={onLayout}>
      {width > 0 && (
        <Svg width={width} height={h}>
          <Rect x={0} y={0} width={width} height={h} fill={colors.card} />
          <G>
            {Array.from({ length: count }, (_, i) => {
              const cx = offset + i * tile;
              return (
                <G key={i}>
                  <Path d={eightPointStarPath(cx, cy, starR)} fill={colors.cobalt} />
                  <Circle cx={cx} cy={cy} r={dotR} fill={colors.saffron} />
                  <Path d={diamondPath(cx + tile / 2, cy, diamondR)} fill={colors.zelligeGreen} />
                </G>
              );
            })}
          </G>
          <Line x1={0} y1={edge / 2} x2={width} y2={edge / 2} stroke={colors.saffron} strokeWidth={edge} />
          <Line x1={0} y1={h - edge / 2} x2={width} y2={h - edge / 2} stroke={colors.saffron} strokeWidth={edge} />
        </Svg>
      )}
    </View>
  );
}

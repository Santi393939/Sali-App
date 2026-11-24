import Svg, { Circle, Path, Rect } from 'react-native-svg';

type IconProps = { color: string; size?: number };

const base = (color: string) => ({
  fill: 'none',
  stroke: color,
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

/** Today: a horseshoe arch with a star. */
export function TodayIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...base(color)}>
      <Path d="M5 21V11.5a7 7 0 1 1 14 0V21" />
      <Path d="M3 21h18" />
      <Path d="m12 9 1 2 2 .3-1.5 1.4.4 2.1L12 13.8l-1.9 1 .4-2.1L9 11.3l2-.3Z" />
    </Svg>
  );
}

/** Reminders: an open book. */
export function RemindersIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...base(color)}>
      <Path d="M12 6.5C10.3 5 7.7 4.5 4 4.5v13c3.7 0 6.3.5 8 2 1.7-1.5 4.3-2 8-2v-13c-3.7 0-6.3.5-8 2Z" />
      <Path d="M12 6.5v13" />
    </Svg>
  );
}

/** Group: three people. */
export function GroupIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...base(color)}>
      <Circle cx={12} cy={8} r={3} />
      <Path d="M6.5 19.5c.6-3 2.8-4.7 5.5-4.7s4.9 1.7 5.5 4.7" />
      <Circle cx={5} cy={10} r={2} />
      <Path d="M1.8 17.5c.4-1.8 1.6-2.9 3.2-3.1" />
      <Circle cx={19} cy={10} r={2} />
      <Path d="M22.2 17.5c-.4-1.8-1.6-2.9-3.2-3.1" />
    </Svg>
  );
}

/** Stats: arch-topped bars. */
export function StatsIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...base(color)}>
      <Path d="M4 20v-6a2 2 0 0 1 4 0v6" />
      <Path d="M10 20V8a2 2 0 0 1 4 0v12" />
      <Path d="M16 20v-9a2 2 0 0 1 4 0v9" />
      <Path d="M2.5 20.5h19" />
    </Svg>
  );
}

/** Me: a person inside a rounded frame. */
export function MeIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...base(color)}>
      <Rect x={3} y={3} width={18} height={18} rx={6} />
      <Circle cx={12} cy={10} r={3} />
      <Path d="M7 18c.9-2 2.7-3 5-3s4.1 1 5 3" />
    </Svg>
  );
}

import Svg, { Circle, Path } from 'react-native-svg';

import type { MilestoneIconName } from '@/content/milestones';

type Props = { name: MilestoneIconName; size: number; color: string; accent?: string };

/** Line drawings of the parts of a Moroccan masjid, on a 32 × 32 grid. */
export function MilestoneIcon({ name, size, color, accent = color }: Props) {
  const line = { fill: 'none', stroke: color, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      {name === 'door' && (
        <>
          {/* horseshoe arch doorway with a star knocker */}
          <Path {...line} d="M9 28V15.5a7 7 0 0 1 1.2-4A7 7 0 0 1 16 8.5a7 7 0 0 1 5.8 3A7 7 0 0 1 23 15.5V28" />
          <Path {...line} d="M5 28h22" />
          <Path {...line} d="M16 9v19" strokeOpacity={0.45} />
          <Circle cx={19} cy={19} r={1.4} fill={accent} />
        </>
      )}
      {name === 'courtyard' && (
        <>
          {/* zellige floor: star tile in a square */}
          <Path {...line} d="M5 5h22v22H5Z" />
          <Path {...line} d="M16 8l2.3 5.7L24 16l-5.7 2.3L16 24l-2.3-5.7L8 16l5.7-2.3Z" stroke={accent} />
          <Path {...line} d="M5 5l5 5M27 5l-5 5M5 27l5-5M27 27l-5-5" strokeOpacity={0.5} />
        </>
      )}
      {name === 'fountain' && (
        <>
          {/* basin with a rising jet */}
          <Path {...line} d="M5 21h22l-2.5 5h-17Z" />
          <Path {...line} d="M11 21v-3h10v3" />
          <Path {...line} stroke={accent} d="M16 18V8M16 8c-3 0-5 3-5.5 6M16 8c3 0 5 3 5.5 6" />
        </>
      )}
      {name === 'minaret' && (
        <>
          {/* square Maghribi minaret with lantern top */}
          <Path {...line} d="M11 28V11h10v17" />
          <Path {...line} d="M9.5 11h13" />
          <Path {...line} d="M13 11V7h6v4M16 7V4" />
          <Path {...line} stroke={accent} d="M14 22v-3a2 2 0 0 1 4 0v3Z" />
          <Path {...line} d="M8 28h16" />
        </>
      )}
      {name === 'dome' && (
        <>
          {/* dome with crescent finial */}
          <Path {...line} d="M6 24c0-7 4.5-12 10-12s10 5 10 12" />
          <Path {...line} d="M4 24h24M7 28h18M7 24v4M25 24v4" />
          <Path {...line} d="M16 12V8" />
          <Path {...line} stroke={accent} d="M18 4.5a2.6 2.6 0 1 0 0 3.8 2 2 0 1 1 0-3.8Z" />
        </>
      )}
      {name === 'riad' && (
        <>
          {/* garden: palm and orange tree under an arch */}
          <Path {...line} d="M4 28V14a12 12 0 0 1 24 0v14" strokeOpacity={0.5} />
          <Path {...line} d="M16 28V15" />
          <Path {...line} stroke={accent} d="M16 15c-2-3-5-3.5-7-2.5M16 15c2-3 5-3.5 7-2.5M16 15c-1-3.5-.5-6 1-7.5M16 15c-3-1-5.5 0-6.5 2M16 15c3-1 5.5 0 6.5 2" />
          <Path {...line} d="M8 28h16" />
        </>
      )}
    </Svg>
  );
}

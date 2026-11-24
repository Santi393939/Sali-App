import { Canvas, Circle, Group, Path } from '@shopify/react-native-skia';
import { useEffect } from 'react';
import { useDerivedValue, useSharedValue, withTiming, Easing, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { BURST_DURATION, makeParticles, particleAt, type Burst, type Particle } from './particles';

type Props = {
  bursts: Burst[];
  /** Canvas size; bursts start at its centre. */
  size: number;
  onDone: (id: number) => void;
};

/** Spark bursts drawn with Skia on the UI thread. */
export function Sparks({ bursts, size, onDone }: Props) {
  return (
    <Canvas style={{ width: size, height: size }} pointerEvents="none">
      {bursts.map((b) => (
        <BurstLayer key={b.id} burst={b} centre={size / 2} onDone={onDone} />
      ))}
    </Canvas>
  );
}

function BurstLayer({ burst, centre, onDone }: { burst: Burst; centre: number; onDone: (id: number) => void }) {
  const progress = useSharedValue(0);
  const particles = makeParticles(burst);
  useEffect(() => {
    progress.value = withTiming(1, { duration: BURST_DURATION[burst.kind], easing: Easing.linear }, (finished) => {
      if (finished) scheduleOnRN(onDone, burst.id);
    });
  }, [burst.id, burst.kind, onDone, progress]);
  return (
    <Group transform={[{ translateX: centre }, { translateY: centre }]}>
      {particles.map((pt, i) => (
        <Spark key={i} pt={pt} progress={progress} />
      ))}
    </Group>
  );
}

const DIAMOND = (r: number) => `M0,${-r}L${r * 0.7},0L0,${r}L${-r * 0.7},0Z`;

function Spark({ pt, progress }: { pt: Particle; progress: SharedValue<number> }) {
  const transform = useDerivedValue(() => {
    const s = particleAt(pt, progress.value);
    return [{ translateX: s.x }, { translateY: s.y }, { rotate: s.rotate }, { scale: s.scale }];
  });
  const opacity = useDerivedValue(() => particleAt(pt, progress.value).opacity);
  return (
    <Group transform={transform} opacity={opacity}>
      {pt.shape === 'dot' ? <Circle cx={0} cy={0} r={pt.size} color={pt.color} /> : <Path path={DIAMOND(pt.size)} color={pt.color} />}
    </Group>
  );
}

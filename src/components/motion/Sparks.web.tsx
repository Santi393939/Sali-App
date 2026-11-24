import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { BURST_DURATION, makeParticles, particleAt, type Burst, type Particle } from './particles';

type Props = {
  bursts: Burst[];
  size: number;
  onDone: (id: number) => void;
};

/**
 * Web preview version of the spark bursts. Same maths as the Skia version,
 * drawn with plain views so the preview needs no 7 MB Skia download.
 */
export function Sparks({ bursts, size, onDone }: Props) {
  return (
    <View style={{ width: size, height: size }} pointerEvents="none">
      {bursts.map((b) => (
        <BurstLayer key={b.id} burst={b} centre={size / 2} onDone={onDone} />
      ))}
    </View>
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
    <>
      {particles.map((pt, i) => (
        <Spark key={i} pt={pt} progress={progress} centre={centre} />
      ))}
    </>
  );
}

function Spark({ pt, progress, centre }: { pt: Particle; progress: SharedValue<number>; centre: number }) {
  const d = pt.size * 2;
  const style = useAnimatedStyle(() => {
    const s = particleAt(pt, progress.value);
    return {
      opacity: s.opacity,
      transform: [
        { translateX: s.x },
        { translateY: s.y },
        { rotate: `${s.rotate + (pt.shape === 'diamond' ? Math.PI / 4 : 0)}rad` },
        { scaleY: pt.shape === 'diamond' ? 1.25 : 1 },
        { scale: s.scale },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: centre - pt.size,
          top: centre - pt.size,
          width: d,
          height: d,
          backgroundColor: pt.color,
          borderRadius: pt.shape === 'dot' ? pt.size : 1,
        },
        style,
      ]}
    />
  );
}

/** Shared maths for spark bursts, used by the Skia (native) and View (web) versions. */

export type BurstKind = 'tap' | 'small' | 'medium' | 'large';

export type Burst = {
  id: number;
  kind: BurstKind;
};

export type Particle = {
  angle: number; // radians
  distance: number; // px travelled
  size: number; // px half-diagonal
  spin: number; // radians over the life
  color: string;
  shape: 'dot' | 'diamond';
};

export const BURST_DURATION: Record<BurstKind, number> = {
  tap: 450,
  small: 750,
  medium: 800,
  large: 950,
};

// Small deterministic random so a burst looks the same on every re-render.
function rng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

const COLORS = ['#E9B860', '#C98E2B', '#FBF6EC', '#E9B860'];

export function makeParticles(burst: Burst): Particle[] {
  const r = rng(burst.id * 7919 + 13);
  const count =
    burst.kind === 'tap' ? 4 : burst.kind === 'small' ? 9 + Math.floor(r() * 3) : burst.kind === 'medium' ? 12 + Math.floor(r() * 3) : 22;
  const reach = burst.kind === 'tap' ? [26, 44] : burst.kind === 'large' ? [80, 135] : [60, 110];
  const start = r() * Math.PI * 2;
  return Array.from({ length: count }, (_, i) => ({
    angle: start + (i / count) * Math.PI * 2 + (r() - 0.5) * 0.5,
    distance: reach[0] + r() * (reach[1] - reach[0]),
    size: burst.kind === 'tap' ? 2.5 : 3.5 + r() * 3,
    spin: (r() - 0.5) * Math.PI * 3,
    color: burst.kind === 'tap' ? '#E9B860' : COLORS[i % COLORS.length],
    shape: burst.kind === 'tap' ? 'dot' : 'diamond',
  }));
}

/** Position, scale and opacity of a particle at progress p (0–1). */
export function particleAt(pt: Particle, p: number) {
  'worklet';
  const ease = 1 - Math.pow(1 - p, 3); // ease-out cubic
  const x = Math.cos(pt.angle) * pt.distance * ease;
  const y = Math.sin(pt.angle) * pt.distance * ease + 18 * p * p; // a little gravity
  return {
    x,
    y,
    rotate: pt.spin * p,
    scale: 1 - 0.55 * p,
    opacity: p < 0.6 ? 1 : 1 - (p - 0.6) / 0.4,
  };
}

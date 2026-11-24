/**
 * Shared drawing maths for Salli's Moroccan shapes.
 * All functions return SVG path strings.
 */

/** Ratio of inner to outer radius for an 8-point star made of two overlapping squares. */
export const STAR_INNER_RATIO = Math.cos(Math.PI / 4) / Math.cos(Math.PI / 8); // ≈ 0.765

/**
 * 8-point star (two squares, one turned 45°) centred on (cx, cy).
 * `r` is the radius to the tips. `rotation` is in degrees.
 */
export function eightPointStarPath(
  cx: number,
  cy: number,
  r: number,
  innerRatio = STAR_INNER_RATIO,
  rotation = 0,
): string {
  const pts: string[] = [];
  const rot = (rotation * Math.PI) / 180 - Math.PI / 2; // first tip points up
  for (let i = 0; i < 16; i++) {
    const radius = i % 2 === 0 ? r : r * innerRatio;
    const a = rot + (i * Math.PI) / 8;
    pts.push(`${(cx + radius * Math.cos(a)).toFixed(2)},${(cy + radius * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
}

/** Diamond (square on its point) centred on (cx, cy) with half-diagonal `r`. */
export function diamondPath(cx: number, cy: number, r: number): string {
  return `M${cx},${cy - r}L${cx + r},${cy}L${cx},${cy + r}L${cx - r},${cy}Z`;
}

/**
 * Horseshoe arch: a circular arc wider than a semicircle, closing in at the
 * springing points, then straight jambs down to the base.
 *
 * The arch fills a `width` × `height` box (minus `inset` on every side).
 * `wrap` is how far the arc continues below its centre line, in degrees
 * (0 = a plain round arch; 20–30 reads as a Moroccan horseshoe).
 */
export function horseshoeArchPath(width: number, height: number, inset = 0, wrap = 24): string {
  const w = width - inset * 2;
  const r = w / 2;
  const cx = width / 2;
  const cy = inset + r; // circle centre: the arc touches the top of the box
  const t = (wrap * Math.PI) / 180;
  const dx = r * Math.cos(t);
  const dy = r * Math.sin(t);
  const leftX = cx - dx;
  const rightX = cx + dx;
  const springY = cy + dy;
  const baseY = height - inset;
  return [
    `M${leftX.toFixed(2)},${baseY.toFixed(2)}`,
    `L${leftX.toFixed(2)},${springY.toFixed(2)}`,
    `A${r.toFixed(2)},${r.toFixed(2)} 0 1 1 ${rightX.toFixed(2)},${springY.toFixed(2)}`,
    `L${rightX.toFixed(2)},${baseY.toFixed(2)}`,
    'Z',
  ].join(' ');
}

/** n-point star with the given inner ratio; first tip points up (plus `rotation` degrees). */
export function starPath(cx: number, cy: number, r: number, points: number, innerRatio: number, rotation = 0): string {
  const pts: string[] = [];
  const rot = (rotation * Math.PI) / 180 - Math.PI / 2;
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? r : r * innerRatio;
    const a = rot + (i * Math.PI) / points;
    pts.push(`${(cx + radius * Math.cos(a)).toFixed(2)},${(cy + radius * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
}

/** Circle with a scalloped edge (`bumps` rounded lobes). */
export function scallopPath(cx: number, cy: number, r: number, bumps: number): string {
  const inner = r * 0.9;
  const parts: string[] = [];
  for (let i = 0; i < bumps; i++) {
    const a0 = (i / bumps) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((i + 1) / bumps) * Math.PI * 2 - Math.PI / 2;
    const am = (a0 + a1) / 2;
    const p0 = [cx + inner * Math.cos(a0), cy + inner * Math.sin(a0)];
    const p1 = [cx + inner * Math.cos(a1), cy + inner * Math.sin(a1)];
    const c = [cx + r * 1.08 * Math.cos(am), cy + r * 1.08 * Math.sin(am)];
    if (i === 0) parts.push(`M${p0[0].toFixed(2)},${p0[1].toFixed(2)}`);
    parts.push(`Q${c[0].toFixed(2)},${c[1].toFixed(2)} ${p1[0].toFixed(2)},${p1[1].toFixed(2)}`);
  }
  return parts.join(' ') + 'Z';
}

/** A square tile turned 45° with clipped (bevelled) corners. */
export function tilePath(cx: number, cy: number, r: number): string {
  const b = r * 0.22;
  const pts = [
    [cx, cy - r + b * 0.2], [cx + b, cy - r + b], [cx + r - b, cy - b], [cx + r - b * 0.2, cy],
    [cx + r - b, cy + b], [cx + b, cy + r - b], [cx, cy + r - b * 0.2], [cx - b, cy + r - b],
    [cx - r + b, cy + b], [cx - r + b * 0.2, cy], [cx - r + b, cy - b], [cx - b, cy - r + b],
  ];
  return `M${pts.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join('L')}Z`;
}

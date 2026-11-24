/** 12345.6 → "12,346". Safe to call from UI-thread worklets. */
export function formatCount(n: number): string {
  'worklet';
  const s = Math.round(n).toString();
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

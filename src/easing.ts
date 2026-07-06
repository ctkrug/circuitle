/** Cubic ease-out: fast start, gentle settle — used for snap and travel tweens. */
export function easeOutCubic(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return 1 - Math.pow(1 - clamped, 3);
}

/** Linear interpolation between `a` and `b` at position `t` (not clamped). */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Rounds a pixel/coordinate value to the nearest multiple of `spacing`. */
export function snapToGrid(value: number, spacing: number): number {
  return Math.round(value / spacing) * spacing;
}

/**
 * Mulberry32: a tiny, fast, deterministic PRNG. We need reproducibility (the
 * same date must always produce the same puzzle for every player) rather
 * than cryptographic quality, so a small hand-rolled generator beats pulling
 * in a dependency.
 */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hashes a string into a 32-bit seed (FNV-1a). */
export function hashSeed(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Returns a random integer in [0, max) using the given RNG function. */
export function randInt(rng: () => number, max: number): number {
  return Math.floor(rng() * max);
}

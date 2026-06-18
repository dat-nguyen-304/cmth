/**
 * Deterministic PRNG (mulberry32). The whole point of this module: combat must be
 * reproducible from a single uint32 seed so the server can re-run a battle later
 * (async PvP validation). Never use Math.random() anywhere in the sim.
 *
 * The generator state lives on the battle state object so it serializes with it.
 */

export interface RngHolder {
  rngState: number;
}

/** Advance the generator and return a float in [0, 1). Mutates holder.rngState. */
export function nextFloat(holder: RngHolder): number {
  let t = (holder.rngState = (holder.rngState + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Random float in [min, max). */
export function nextRange(holder: RngHolder, min: number, max: number): number {
  return min + (max - min) * nextFloat(holder);
}

/** Normalize an arbitrary number into a valid uint32 seed. */
export function toSeed(n: number): number {
  return n >>> 0;
}

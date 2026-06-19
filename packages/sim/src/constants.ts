/** Tunable constants for the combat sim. Kept in one place for balancing. */

/** Fixed simulation step. Combat advances in whole ticks; the renderer interpolates. */
export const TICKS_PER_SECOND = 30;
export const DT = 1 / TICKS_PER_SECOND;

/** Safety cap so a stalemate can never loop forever (60s of sim time). */
export const MAX_BATTLE_TICKS = 60 * TICKS_PER_SECOND;

/** Energy / ultimate economy. */
export const ENERGY_MAX = 100;
export const ENERGY_ON_DEAL = 8; // gained when you land an auto-attack
export const ENERGY_ON_TAKE = 6; // gained when you get hit

/** Auto-attack damage variance (+/- this fraction), the only RNG in normal combat. */
export const DAMAGE_VARIANCE = 0.1;

/**
 * Knockback (world units) applied to the target of an auto-attack. Melee shoves the
 * target back noticeably; ranged attacks barely nudge.
 */
export const KNOCKBACK_MELEE = 22;
export const KNOCKBACK_RANGED = 5;

/** An attackRange at or below this counts as a melee attacker (knockback + feel). */
export const MELEE_RANGE_MAX = 130;

/**
 * Movement is uniform: every unit advances at the same pace, so run speed is not a
 * per-character stat — only attack speed (attackInterval) differentiates tempo.
 * Slows scale this value down while active.
 */
export const MOVE_SPEED = 110; // world units per second

/** Horizontal spacing between units at spawn (the starting file on each side). */
export const UNIT_GAP = 50;

/**
 * Soft body radius: units closer than this on the x-axis gently push apart. Kept small
 * on purpose — combat is 1-D, so if separation is large the rear units of a deep file
 * can never reach attack range and just stand idle. A small value lets melee units
 * pack/overlap so EVERYONE gets into the fight, while still avoiding a single-pixel
 * stack.
 */
export const SEPARATION = 10;

/** Arena bounds (world units). Positions are clamped inside. */
export const ARENA_WIDTH = 1000;
export const ARENA_HEIGHT = 520;

/** Per-level stat growth: stat = base * (1 + GROWTH_PER_LEVEL * (level - 1)). */
export const GROWTH_PER_LEVEL = 0.12;

/** Each gold-bought "tu luyện" tier adds this fraction to a character's HP/ATK/DEF
 *  (which also strengthens ults, since ults scale off those stats). */
export const UPGRADE_BONUS_PER_TIER = 0.06;

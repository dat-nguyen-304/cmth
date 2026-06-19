/**
 * Deterministic, headless combat engine.
 *
 * Pure logic only — no rendering, no DOM, no Math.random, no Date. Given the same
 * seed and the same sequence of ult inputs, two runs produce byte-identical states.
 * The renderer reads BattleState each frame; the (future) server re-runs this same
 * code to validate PvP results.
 */

import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  DAMAGE_VARIANCE,
  DT,
  ENERGY_MAX,
  ENERGY_ON_DEAL,
  ENERGY_ON_TAKE,
  GROWTH_PER_LEVEL,
  KNOCKBACK_MELEE,
  KNOCKBACK_RANGED,
  MAX_BATTLE_TICKS,
  MELEE_RANGE_MAX,
  MOVE_SPEED,
  SEPARATION,
  UNIT_GAP,
  UPGRADE_BONUS_PER_TIER,
} from './constants.js';
import { getCharacter } from './data.js';
import { nextRange, toSeed } from './rng.js';
import type {
  BattleEvent,
  BattleState,
  Combatant,
  Controller,
  Recruit,
  Side,
} from './types.js';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

function scaleStat(base: number, level: number): number {
  return base * (1 + GROWTH_PER_LEVEL * (level - 1));
}

function makeCombatant(uid: number, recruit: Recruit, side: Side, pos: { x: number; y: number }): Combatant {
  const def = getCharacter(recruit.defId);
  const level = recruit.level ?? 1;
  const b = def.base;
  // "Tu luyện": gold-bought upgrade tiers scale HP/ATK/DEF on top of level growth.
  const up = 1 + UPGRADE_BONUS_PER_TIER * (recruit.upgrade ?? 0);
  const maxHp = scaleStat(b.maxHp, level) * up;
  return {
    uid,
    defId: def.id,
    name: def.name,
    sect: def.sect,
    side,
    level,
    pos: { x: pos.x, y: pos.y },
    facing: side === 0 ? 1 : -1,
    hp: maxHp,
    maxHp,
    atk: scaleStat(b.atk, level) * up,
    def: scaleStat(b.def, level) * up,
    attackRange: b.attackRange,
    attackInterval: b.attackInterval,
    attackTimer: 0,
    energy: 0,
    shield: 0,
    slowTimer: 0,
    slowFactor: 1,
    defDownTimer: 0,
    defDownFactor: 1,
    dotTimer: 0,
    dotPerSecond: 0,
    alive: true,
  };
}

/**
 * Place a team as a single horizontal file on its side. Every unit shares ONE row
 * (same y) — combat is 1-D. Index 0 stands at the front (nearest the centre) and the
 * rest queue up behind it along the x-axis.
 */
function placeTeam(recruits: Recruit[], side: Side, startUid: number): Combatant[] {
  const y = ARENA_HEIGHT / 2;
  const front = side === 0 ? ARENA_WIDTH * 0.36 : ARENA_WIDTH * 0.64;
  const back = side === 0 ? -1 : 1; // queue away from the centre
  return recruits.map((r, i) =>
    makeCombatant(startUid + i, r, side, { x: front + back * UNIT_GAP * i, y }),
  );
}

export function createBattle(teamA: Recruit[], teamB: Recruit[], seed: number): BattleState {
  const a = placeTeam(teamA, 0, 0);
  const b = placeTeam(teamB, 1, a.length);
  return {
    tick: 0,
    rngState: toSeed(seed),
    combatants: [...a, ...b],
    finished: false,
    winner: null,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Combat is 1-D: distance and range are measured along the x-axis only. */
function dist(a: Combatant, b: Combatant): number {
  return Math.abs(a.pos.x - b.pos.x);
}

/** Movement speed is uniform (MOVE_SPEED); only slows modify it. */
function effectiveSpd(c: Combatant): number {
  return c.slowTimer > 0 ? MOVE_SPEED * c.slowFactor : MOVE_SPEED;
}

function effectiveDef(c: Combatant): number {
  return c.defDownTimer > 0 ? c.def * c.defDownFactor : c.def;
}

/**
 * Nearest living enemy by horizontal (x) distance — combat is 1-D and everyone
 * shares one row. Ties are broken by lowest uid for determinism.
 */
function nearestEnemy(state: BattleState, c: Combatant): Combatant | null {
  let best: Combatant | null = null;
  let bestDx = Infinity;
  for (const o of state.combatants) {
    if (!o.alive || o.side === c.side) continue;
    const dx = Math.abs(c.pos.x - o.pos.x);
    if (dx < bestDx || (dx === bestDx && (best === null || o.uid < best.uid))) {
      best = o;
      bestDx = dx;
    }
  }
  return best;
}

function livingAllies(state: BattleState, c: Combatant): Combatant[] {
  return state.combatants.filter((o) => o.alive && o.side === c.side);
}

function livingEnemies(state: BattleState, c: Combatant): Combatant[] {
  return state.combatants.filter((o) => o.alive && o.side !== c.side);
}

/**
 * Soft separation: any two living units closer than SEPARATION on the x-axis are
 * pushed apart equally. Everyone charges into the same brawl, and this keeps them
 * from collapsing onto a single point — they spread into a packed melee instead.
 */
function separate(state: BattleState): void {
  const list = state.combatants;
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (!a.alive) continue;
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j];
      if (!b.alive) continue;
      const dx = b.pos.x - a.pos.x;
      const absdx = Math.abs(dx);
      if (absdx >= SEPARATION) continue;
      const push = (SEPARATION - absdx) / 2;
      const dir = absdx === 0 ? (a.uid < b.uid ? 1 : -1) : dx > 0 ? 1 : -1;
      a.pos.x -= dir * push;
      b.pos.x += dir * push;
      clampToArena(a.pos);
      clampToArena(b.pos);
    }
  }
}

function clampToArena(p: { x: number; y: number }): void {
  if (p.x < 0) p.x = 0;
  else if (p.x > ARENA_WIDTH) p.x = ARENA_WIDTH;
  if (p.y < 0) p.y = 0;
  else if (p.y > ARENA_HEIGHT) p.y = ARENA_HEIGHT;
}

function gainEnergy(c: Combatant, amount: number): void {
  c.energy = Math.min(ENERGY_MAX, c.energy + amount);
}

/**
 * Apply damage from source to target: mitigation, shield absorption, energy gain
 * for both sides, optional knockback, and death. Pushes events into the sink.
 */
function dealDamage(
  source: Combatant,
  target: Combatant,
  rawAmount: number,
  events: BattleEvent[],
  opts: { knockback?: number; fromAuto?: boolean } = {},
): void {
  if (!target.alive) return;
  const mitigated = rawAmount * (100 / (100 + effectiveDef(target)));
  let remaining = mitigated;
  if (target.shield > 0) {
    const absorbed = Math.min(target.shield, remaining);
    target.shield -= absorbed;
    remaining -= absorbed;
  }
  target.hp -= remaining;

  if (opts.fromAuto) gainEnergy(source, ENERGY_ON_DEAL);
  gainEnergy(target, ENERGY_ON_TAKE);

  if (opts.knockback && opts.knockback > 0) {
    const dir = Math.sign(target.pos.x - source.pos.x) || (target.side === 0 ? -1 : 1);
    target.pos.x += dir * opts.knockback;
    clampToArena(target.pos);
  }

  let killed = false;
  if (target.hp <= 0) {
    target.hp = 0;
    target.alive = false;
    killed = true;
  }

  events.push({ type: 'attack', source: source.uid, target: target.uid, amount: remaining, killed });
  if (killed) events.push({ type: 'death', uid: target.uid });
}

function heal(source: Combatant, target: Combatant, amount: number, events: BattleEvent[]): void {
  if (!target.alive) return;
  const before = target.hp;
  target.hp = Math.min(target.maxHp, target.hp + amount);
  events.push({ type: 'heal', source: source.uid, target: target.uid, amount: target.hp - before });
}

// ---------------------------------------------------------------------------
// Ultimates (one flavor per sect)
// ---------------------------------------------------------------------------

function castUlt(state: BattleState, c: Combatant, events: BattleEvent[]): void {
  events.push({ type: 'ult', source: c.uid, sect: c.sect });
  switch (c.sect) {
    case 'thieu_lam': {
      // Tank: large self shield + smaller shield to all allies.
      const self = c.maxHp * 0.45;
      c.shield += self;
      events.push({ type: 'shield', source: c.uid, target: c.uid, amount: self });
      for (const a of livingAllies(state, c)) {
        if (a.uid === c.uid) continue;
        const s = c.maxHp * 0.12;
        a.shield += s;
        events.push({ type: 'shield', source: c.uid, target: a.uid, amount: s });
      }
      break;
    }
    case 'cai_bang': {
      // Physical DPS: heavy single-target burst on the nearest enemy.
      const t = nearestEnemy(state, c);
      if (t) dealDamage(c, t, c.atk * 3.2, events, { knockback: KNOCKBACK_MELEE * 1.6 });
      break;
    }
    case 'nga_mi': {
      // Support: heal the lowest-HP-fraction ally.
      const allies = livingAllies(state, c);
      let target: Combatant | null = null;
      let worst = Infinity;
      for (const a of allies) {
        const frac = a.hp / a.maxHp;
        if (frac < worst || (frac === worst && (target === null || a.uid < target.uid))) {
          worst = frac;
          target = a;
        }
      }
      if (target) heal(c, target, c.atk * 3.5, events);
      break;
    }
    case 'vo_dang': {
      // Control: damage + slow the nearest enemy.
      const t = nearestEnemy(state, c);
      if (t) {
        dealDamage(c, t, c.atk * 1.4, events);
        t.slowTimer = 4;
        t.slowFactor = 0.5;
      }
      break;
    }
    case 'ma_giao': {
      // Burst/debuff: AoE damage to all enemies + a defense-down debuff.
      for (const t of livingEnemies(state, c)) {
        dealDamage(c, t, c.atk * 1.2, events);
        t.defDownTimer = 5;
        t.defDownFactor = 0.7;
      }
      break;
    }
  }
  c.energy = 0;
}

// ---------------------------------------------------------------------------
// Tick
// ---------------------------------------------------------------------------

function tickStatuses(c: Combatant, events: BattleEvent[]): void {
  if (c.slowTimer > 0) c.slowTimer = Math.max(0, c.slowTimer - DT);
  if (c.defDownTimer > 0) c.defDownTimer = Math.max(0, c.defDownTimer - DT);
  if (c.dotTimer > 0) {
    c.dotTimer = Math.max(0, c.dotTimer - DT);
    c.hp -= c.dotPerSecond * DT;
    if (c.hp <= 0) {
      c.hp = 0;
      c.alive = false;
      events.push({ type: 'death', uid: c.uid });
    }
  }
}

function actCombatant(state: BattleState, c: Combatant, events: BattleEvent[]): void {
  if (!c.alive) return;
  if (c.attackTimer > 0) c.attackTimer = Math.max(0, c.attackTimer - DT);

  const target = nearestEnemy(state, c);
  if (!target) return;

  c.facing = target.pos.x >= c.pos.x ? 1 : -1;
  const d = dist(c, target);

  if (d > c.attackRange) {
    // Charge straight at the target along x. y is fixed for life; allies don't block —
    // everyone piles in, and separate() keeps them from overlapping.
    const dir = target.pos.x >= c.pos.x ? 1 : -1;
    c.pos.x += dir * effectiveSpd(c) * DT;
    clampToArena(c.pos);
  } else if (c.attackTimer <= 0) {
    // In range: auto-attack with slight damage variance. Melee shoves harder.
    const variance = nextRange(state, 1 - DAMAGE_VARIANCE, 1 + DAMAGE_VARIANCE);
    const knockback = c.attackRange <= MELEE_RANGE_MAX ? KNOCKBACK_MELEE : KNOCKBACK_RANGED;
    dealDamage(c, target, c.atk * variance, events, { knockback, fromAuto: true });
    c.attackTimer = c.attackInterval;
  }
}

function checkVictory(state: BattleState): void {
  const aliveA = state.combatants.some((c) => c.alive && c.side === 0);
  const aliveB = state.combatants.some((c) => c.alive && c.side === 1);
  if (!aliveA || !aliveB) {
    state.finished = true;
    state.winner = aliveA && !aliveB ? 0 : !aliveA && aliveB ? 1 : null;
  } else if (state.tick >= MAX_BATTLE_TICKS) {
    // Timeout: the side with more total remaining HP wins (deterministic).
    state.finished = true;
    const hp = (side: Side) =>
      state.combatants.filter((c) => c.side === side).reduce((s, c) => s + c.hp, 0);
    const hpA = hp(0);
    const hpB = hp(1);
    state.winner = hpA === hpB ? null : hpA > hpB ? 0 : 1;
  }
}

/**
 * Advance the battle one fixed timestep.
 *
 * @param fireUltUids uids whose ultimate should fire this tick (player input).
 *                    Invalid requests (dead, not enough energy) are ignored.
 * @returns the events that occurred this tick (for the renderer; safe to ignore).
 */
export function stepBattle(state: BattleState, fireUltUids: number[] = []): BattleEvent[] {
  const events: BattleEvent[] = [];
  if (state.finished) return events;

  // 1. Player ult inputs (deterministic order: ascending uid).
  if (fireUltUids.length > 0) {
    const byUid = new Map(state.combatants.map((c) => [c.uid, c]));
    for (const uid of [...fireUltUids].sort((x, y) => x - y)) {
      const c = byUid.get(uid);
      if (c && c.alive && c.energy >= ENERGY_MAX) castUlt(state, c, events);
    }
  }

  // 2. Status effects (DoT, expiring debuffs).
  for (const c of state.combatants) tickStatuses(c, events);

  // 3. Each combatant acts (move toward / attack nearest enemy), in uid order.
  for (const c of state.combatants) actCombatant(state, c, events);

  // 4. Push overlapping bodies apart so the brawl stays readable.
  separate(state);

  // 5. Advance clock and resolve victory.
  state.tick += 1;
  checkVictory(state);
  return events;
}

/** Uids of every living combatant whose ult is charged. */
export function readyUlts(state: BattleState): number[] {
  return state.combatants.filter((c) => c.alive && c.energy >= ENERGY_MAX).map((c) => c.uid);
}

/** A controller that fires every ready ult immediately. Useful for headless runs. */
export const autoUltController: Controller = (state) => readyUlts(state);

/** Run a battle to completion headless. Returns the final state (mutated in place). */
export function runToEnd(state: BattleState, controller: Controller = () => []): BattleState {
  let guard = 0;
  while (!state.finished && guard <= MAX_BATTLE_TICKS + 1) {
    stepBattle(state, controller(state));
    guard += 1;
  }
  return state;
}

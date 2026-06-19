import {
  createBattle,
  stepBattle,
  DT,
  ENERGY_MAX,
  type BattleEvent,
  type BattleState,
  type Combatant,
  type Recruit,
  type Side,
} from '@cmth/sim';

/**
 * Drives the deterministic sim at a fixed timestep from real (variable) frame time,
 * and exposes interpolated positions so rendering stays smooth between ticks.
 * Player ult clicks are queued and applied on the next sim step.
 */
export class BattleRunner {
  readonly state: BattleState;
  private acc = 0;
  private prev = new Map<number, { x: number; y: number }>();
  private pending: number[] = [];

  constructor(teamA: Recruit[], teamB: Recruit[], seed: number) {
    this.state = createBattle(teamA, teamB, seed);
    this.capturePrev();
  }

  get finished(): boolean {
    return this.state.finished;
  }

  get winner(): Side | null {
    return this.state.winner;
  }

  queueUlt(uid: number): void {
    if (!this.pending.includes(uid)) this.pending.push(uid);
  }

  /** Uids of living enemy (side 1) units whose ult is charged. */
  private enemyReadyUlts(): number[] {
    const out: number[] = [];
    for (const c of this.state.combatants) {
      if (c.side === 1 && c.alive && c.energy >= ENERGY_MAX) out.push(c.uid);
    }
    return out;
  }

  /** Advance by real elapsed milliseconds. Returns events from any ticks that ran. */
  update(dtMs: number): BattleEvent[] {
    const events: BattleEvent[] = [];
    this.acc += Math.min(dtMs, 250) / 1000; // clamp to avoid spiral of death
    while (this.acc >= DT && !this.state.finished) {
      this.capturePrev();
      // Player ults come from portrait clicks; enemy AI greedily fires any ready ult
      // so foe healers/tanks/casters actually use their kit.
      const inputs = [...this.pending, ...this.enemyReadyUlts()];
      this.pending = [];
      events.push(...stepBattle(this.state, inputs));
      this.acc -= DT;
    }
    return events;
  }

  /** Interpolation factor in [0,1] between the previous and current tick. */
  private get alpha(): number {
    const a = this.acc / DT;
    return a < 0 ? 0 : a > 1 ? 1 : a;
  }

  private capturePrev(): void {
    for (const c of this.state.combatants) this.prev.set(c.uid, { x: c.pos.x, y: c.pos.y });
  }

  renderPos(c: Combatant): { x: number; y: number } {
    const p = this.prev.get(c.uid);
    if (!p) return { x: c.pos.x, y: c.pos.y };
    const a = this.alpha;
    return { x: p.x + (c.pos.x - p.x) * a, y: p.y + (c.pos.y - p.y) * a };
  }
}

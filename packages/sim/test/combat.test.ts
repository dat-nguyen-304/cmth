import { describe, it, expect } from 'vitest';
import {
  createBattle,
  stepBattle,
  runToEnd,
  readyUlts,
  autoUltController,
  ENERGY_MAX,
  MAX_BATTLE_TICKS,
  type Recruit,
} from '../src/index.js';

const A: Recruit[] = [{ defId: 'ly_tuu_cuong', level: 5 }];
const B: Recruit[] = [{ defId: 'cau_nhi', level: 1 }];

describe('combat resolution', () => {
  it('a battle always terminates with a winner (or draw) within the tick cap', () => {
    const state = runToEnd(createBattle(A, B, 42), autoUltController);
    expect(state.finished).toBe(true);
    expect(state.tick).toBeLessThanOrEqual(MAX_BATTLE_TICKS);
  });

  it('combat is 1-D: every unit keeps its starting row (y never changes)', () => {
    const team: Recruit[] = [
      { defId: 'thiet_la_han' },
      { defId: 'ly_tuu_cuong' },
      { defId: 'tieu_ngoc' },
    ];
    const foes: Recruit[] = [
      { defId: 'huyet_anh' },
      { defId: 'thanh_van' },
      { defId: 'cau_nhi' },
    ];
    const state = createBattle(team, foes, 31);
    // Every unit on both sides shares one row.
    expect(new Set(state.combatants.map((c) => c.pos.y)).size).toBe(1);
    const startY = new Map(state.combatants.map((c) => [c.uid, c.pos.y]));
    for (let i = 0; i < MAX_BATTLE_TICKS && !state.finished; i++) {
      stepBattle(state, autoUltController(state));
      for (const c of state.combatants) {
        expect(c.pos.y).toBe(startY.get(c.uid));
      }
    }
  });

  it('ranged characters deal damage without closing to melee range', () => {
    // Huyết Ảnh (range 300) vs a melee tank. The caster should land hits while still
    // far outside any melee range.
    const state = createBattle([{ defId: 'huyet_anh' }], [{ defId: 'thiet_la_han' }], 9);
    const caster = state.combatants.find((c) => c.defId === 'huyet_anh')!;
    const foe = state.combatants.find((c) => c.defId === 'thiet_la_han')!;
    let rangedHit = false;
    for (let i = 0; i < MAX_BATTLE_TICKS && !state.finished; i++) {
      const events = stepBattle(state, []); // autos only
      const far = Math.abs(caster.pos.x - foe.pos.x) > 150; // way beyond melee
      if (far && events.some((e) => e.type === 'attack' && e.source === caster.uid)) {
        rangedHit = true;
        break;
      }
    }
    expect(rangedHit).toBe(true);
  });

  it('a stronger team beats a weaker one', () => {
    // Same character, one side far higher level => should win.
    const strong: Recruit[] = [{ defId: 'ly_tuu_cuong', level: 10 }];
    const weak: Recruit[] = [{ defId: 'ly_tuu_cuong', level: 1 }];
    const state = runToEnd(createBattle(strong, weak, 7), autoUltController);
    expect(state.winner).toBe(0);
  });

  it('energy accrues from combat and ults become ready', () => {
    const state = createBattle(
      [{ defId: 'ly_tuu_cuong' }],
      [{ defId: 'cau_nhi' }],
      3,
    );
    let sawReady = false;
    for (let i = 0; i < MAX_BATTLE_TICKS && !state.finished; i++) {
      stepBattle(state, []); // never fire, just let energy build
      if (readyUlts(state).length > 0) {
        sawReady = true;
        break;
      }
    }
    expect(sawReady).toBe(true);
  });

  it('firing an ult consumes energy', () => {
    const state = createBattle([{ defId: 'huyet_anh' }], [{ defId: 'cau_nhi' }], 5);
    // Build energy without firing.
    for (let i = 0; i < MAX_BATTLE_TICKS && readyUlts(state).length === 0; i++) {
      stepBattle(state, []);
    }
    const ready = readyUlts(state);
    expect(ready.length).toBeGreaterThan(0);
    const uid = ready[0]!;
    const caster = state.combatants.find((c) => c.uid === uid)!;
    expect(caster.energy).toBeGreaterThanOrEqual(ENERGY_MAX);
    stepBattle(state, [uid]);
    expect(caster.energy).toBeLessThan(ENERGY_MAX);
  });

  it('healer ult (Nga Mi) restores ally HP', () => {
    // Tank in front (takes chip damage but survives), healer behind it. The enemy is
    // a low-damage punching bag so the tank stays alive-and-damaged long enough for the
    // healer to charge her ult and actually heal someone.
    const team: Recruit[] = [
      { defId: 'thiet_la_han' },
      { defId: 'tieu_ngoc' },
    ];
    const foes: Recruit[] = [{ defId: 'thiet_la_han', level: 3 }];
    const state = createBattle(team, foes, 11);
    let healed = false;
    for (let i = 0; i < MAX_BATTLE_TICKS && !state.finished; i++) {
      const events = stepBattle(state, autoUltController(state));
      if (events.some((e) => e.type === 'heal' && e.amount > 0)) {
        healed = true;
        break;
      }
    }
    expect(healed).toBe(true);
  });
});

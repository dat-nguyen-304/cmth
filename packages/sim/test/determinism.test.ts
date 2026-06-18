import { describe, it, expect } from 'vitest';
import {
  createBattle,
  runToEnd,
  stepBattle,
  autoUltController,
  snapshot,
  type Recruit,
} from '../src/index.js';

const TEAM_A: Recruit[] = [
  { defId: 'thiet_la_han', level: 3 },
  { defId: 'ly_tuu_cuong', level: 2 },
  { defId: 'tieu_ngoc', level: 2 },
];
const TEAM_B: Recruit[] = [
  { defId: 'huyet_anh', level: 2 },
  { defId: 'thanh_van', level: 3 },
  { defId: 'cau_nhi', level: 2 },
];

describe('determinism', () => {
  it('same seed + same inputs => identical final state', () => {
    const a = runToEnd(createBattle(TEAM_A, TEAM_B, 12345), autoUltController);
    const b = runToEnd(createBattle(TEAM_A, TEAM_B, 12345), autoUltController);
    expect(snapshot(a)).toBe(snapshot(b));
    expect(a.finished).toBe(true);
  });

  it('different seeds => different outcomes (RNG is actually wired in)', () => {
    const a = runToEnd(createBattle(TEAM_A, TEAM_B, 1), autoUltController);
    const b = runToEnd(createBattle(TEAM_A, TEAM_B, 99999), autoUltController);
    expect(snapshot(a)).not.toBe(snapshot(b));
  });

  it('stepping tick-by-tick matches running to the end (no hidden global state)', () => {
    const full = runToEnd(createBattle(TEAM_A, TEAM_B, 777), autoUltController);

    const stepped = createBattle(TEAM_A, TEAM_B, 777);
    let guard = 0;
    while (!stepped.finished && guard < 100000) {
      stepBattle(stepped, autoUltController(stepped));
      guard += 1;
    }
    expect(snapshot(stepped)).toBe(snapshot(full));
  });
});

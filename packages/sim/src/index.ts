/** Public API of the deterministic combat sim. */

export * from './types.js';
export * from './constants.js';
export {
  createBattle,
  stepBattle,
  runToEnd,
  readyUlts,
  autoUltController,
} from './engine.js';
export { SECTS, CHARACTERS, ALL_CHARACTER_IDS, getCharacter } from './data.js';
export type { SectInfo } from './data.js';

import type { BattleState } from './types.js';

/**
 * A compact, stable snapshot of the parts of a battle that must be reproducible.
 * Used by tests (and later PvP validation) to compare two runs for equality.
 */
export function snapshot(state: BattleState): string {
  const parts = [
    `t${state.tick}`,
    `r${state.rngState}`,
    `w${state.winner}`,
    state.finished ? 'F' : 'O',
  ];
  for (const c of state.combatants) {
    parts.push(
      `${c.uid}:${c.hp.toFixed(4)}:${c.pos.x.toFixed(4)}:${c.pos.y.toFixed(4)}:` +
        `${c.energy.toFixed(4)}:${c.shield.toFixed(4)}:${c.alive ? 1 : 0}`,
    );
  }
  return parts.join('|');
}

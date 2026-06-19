import { ALL_CHARACTER_IDS, type Recruit } from '@cmth/sim';
import { sanitizeTeam, TEAM_SIZE, type PlayerProgress } from './progress';

/**
 * The recruits that take the field, in the player's chosen order (index 0 = front).
 * Falls back to the first owned characters if no valid team is set.
 */
export function buildPlayerTeam(p: PlayerProgress): Recruit[] {
  let ids = sanitizeTeam(p.team ?? [], p.chars);
  if (ids.length === 0) ids = Object.keys(p.chars).slice(0, TEAM_SIZE);
  return ids.map((defId) => ({ defId, level: p.chars[defId]!.level }));
}

/** Enemy team scales with stage: more units and higher level as you climb. */
export function buildEnemyTeam(stage: number): Recruit[] {
  const size = Math.min(6, 3 + Math.floor((stage - 1) / 2));
  const out: Recruit[] = [];
  for (let i = 0; i < size; i++) {
    const defId = ALL_CHARACTER_IDS[i % ALL_CHARACTER_IDS.length]!;
    out.push({ defId, level: stage });
  }
  return out;
}

/** Deterministic battle seed per stage (Phase 1). */
export function battleSeed(stage: number): number {
  return stage * 1000 + 7;
}

const AREAS = [
  'Tân Thủ Thôn',
  'Tử Trúc Lâm',
  'Hắc Phong Trại',
  'Lạc Nhật Cốc',
  'U Minh Cốc',
  'Tuyết Sơn Lĩnh',
];

/** Flavor name for the hunting area of a given stage (changes every 5 stages). */
export function areaName(stage: number): string {
  return AREAS[Math.floor((stage - 1) / 5) % AREAS.length]!;
}

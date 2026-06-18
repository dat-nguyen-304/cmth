import { ALL_CHARACTER_IDS, type Recruit } from '@cmth/sim';
import type { PlayerProgress } from './progress';

/** Your team for Phase 1: every owned character, at its current level (max 6). */
export function buildPlayerTeam(p: PlayerProgress): Recruit[] {
  return Object.entries(p.chars)
    .slice(0, 6)
    .map(([defId, cp]) => ({ defId, level: cp.level }));
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

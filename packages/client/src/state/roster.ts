import { type Recruit } from '@cmth/sim';
import { sanitizeTeam, TEAM_SIZE, type PlayerProgress } from './progress';

/**
 * The recruits that take the field, in the player's chosen order (index 0 = front).
 * Falls back to the first owned characters if no valid team is set.
 */
export function buildPlayerTeam(p: PlayerProgress): Recruit[] {
  let ids = sanitizeTeam(p.team ?? [], p.chars);
  if (ids.length === 0) ids = Object.keys(p.chars).slice(0, TEAM_SIZE);
  return ids.map((defId) => ({
    defId,
    level: p.chars[defId]!.level,
    upgrade: p.chars[defId]!.upgrade,
  }));
}

// Enemy mobs grouped by battlefield role. Pools rotate by area so different regions
// field different foes; index 0 of the returned team is the front line.
const TANKS = ['son_tac', 'ta_dao_si'];
const MELEE = ['da_lang', 'hac_y_nhan'];
const RANGED = ['cung_tac', 'tro_phap_su'];
const HEALERS = ['vu_y'];
const BOSSES = ['ho_vuong', 'son_tac_dau_linh'];

/** Deterministic pick from a role pool, rotated by an offset (area/variety). */
function pick(pool: string[], offset: number): string {
  return pool[((offset % pool.length) + pool.length) % pool.length]!;
}

/**
 * Build a themed PvE encounter for a stage. Composition follows real archetypes —
 * a front-line tank, melee burst, ranged poke, plus a healer and extras as the team
 * grows — so the player has something to build a counter-team against. Every 5th
 * stage is a boss fight (a beefed-up leader on the front line). Deterministic.
 */
export function buildEnemyTeam(stage: number): Recruit[] {
  const area = Math.floor((stage - 1) / 5);
  const size = Math.min(6, 3 + Math.floor((stage - 1) / 2));
  const lvl = stage;
  const isBoss = stage % 5 === 0;

  const team: Recruit[] = [];
  team.push({ defId: pick(TANKS, area), level: lvl }); // front line
  team.push({ defId: pick(MELEE, area), level: lvl });
  team.push({ defId: pick(RANGED, area), level: lvl });
  if (size >= 4) team.push({ defId: pick(HEALERS, area), level: lvl });
  if (size >= 5) team.push({ defId: pick(MELEE, area + 1), level: lvl });
  if (size >= 6) team.push({ defId: pick(RANGED, area + 1), level: lvl });

  const out = team.slice(0, size);
  // Boss stage: swap the front unit for a leader, a few levels above the pack.
  if (isBoss) out[0] = { defId: pick(BOSSES, area), level: lvl + 2 };
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

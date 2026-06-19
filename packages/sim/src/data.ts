/** Roster + sect data. Phase 1 ships a small slice; the model supports all 5 sects. */

import type { BaseStats, CharacterDef, SectId } from './types.js';

export interface SectInfo {
  id: SectId;
  name: string;
  role: string;
  /** Display color for placeholder block art (Phase 1). */
  color: number;
}

export const SECTS: Record<SectId, SectInfo> = {
  thieu_lam: { id: 'thieu_lam', name: 'Thiếu Lâm', role: 'Tank / phòng thủ', color: 0xc9a227 },
  cai_bang: { id: 'cai_bang', name: 'Cái Bang', role: 'Sát thương vật lý', color: 0x8d6e63 },
  nga_mi: { id: 'nga_mi', name: 'Nga Mi', role: 'Hồi máu / hỗ trợ', color: 0x4fc3f7 },
  vo_dang: { id: 'vo_dang', name: 'Võ Đang', role: 'Khống chế / trụ lâu', color: 0x81c784 },
  ma_giao: { id: 'ma_giao', name: 'Ma Giáo', role: 'Bùng nổ / hiệu ứng xấu', color: 0xe57373 },
};

function stats(s: BaseStats): BaseStats {
  return s;
}

/** Phase 1 roster: at least one character per sect so every ult can be exercised. */
export const CHARACTERS: Record<string, CharacterDef> = {
  thiet_la_han: {
    id: 'thiet_la_han',
    name: 'Thiết La Hán',
    sect: 'thieu_lam',
    rarity: 'default',
    base: stats({ maxHp: 1400, atk: 70, def: 60, attackRange: 70, attackInterval: 1.3 }),
  },
  ly_tuu_cuong: {
    id: 'ly_tuu_cuong',
    name: 'Lý Tửu Cuồng',
    sect: 'cai_bang',
    rarity: 'default',
    base: stats({ maxHp: 820, atk: 135, def: 28, attackRange: 80, attackInterval: 0.85 }),
  },
  cau_nhi: {
    id: 'cau_nhi',
    name: 'Cẩu Nhi',
    sect: 'cai_bang',
    rarity: 'default',
    base: stats({ maxHp: 860, atk: 120, def: 30, attackRange: 75, attackInterval: 0.9 }),
  },
  tieu_ngoc: {
    id: 'tieu_ngoc',
    name: 'Tiểu Ngọc',
    sect: 'nga_mi',
    rarity: 'default',
    // Ranged support: stays at the back, heals + pokes from afar.
    base: stats({ maxHp: 760, atk: 80, def: 30, attackRange: 260, attackInterval: 1.1 }),
  },
  thanh_van: {
    id: 'thanh_van',
    name: 'Thanh Vân',
    sect: 'vo_dang',
    rarity: 'default',
    base: stats({ maxHp: 980, atk: 90, def: 42, attackRange: 90, attackInterval: 1.05 }),
  },
  huyet_anh: {
    id: 'huyet_anh',
    name: 'Huyết Ảnh',
    sect: 'ma_giao',
    rarity: 'default',
    // Ranged dark caster: hangs back behind the melee and throws damage from distance.
    base: stats({ maxHp: 760, atk: 120, def: 28, attackRange: 300, attackInterval: 1.0 }),
  },

  // --- Enemy mobs (PvE only) -----------------------------------------------------
  // Each carries a sect so it inherits that sect's ult + color. Per-unit stats sit a
  // bit below the player roster so a pack is beatable; difficulty comes from numbers,
  // levels and composition rather than individually overtuned mobs.
  son_tac: {
    id: 'son_tac',
    name: 'Sơn Tặc',
    sect: 'thieu_lam', // tank: shields itself + pack
    rarity: 'default',
    enemy: true,
    base: stats({ maxHp: 1100, atk: 58, def: 46, attackRange: 70, attackInterval: 1.25 }),
  },
  da_lang: {
    id: 'da_lang',
    name: 'Dã Lang',
    sect: 'cai_bang', // fast melee burst
    rarity: 'default',
    enemy: true,
    base: stats({ maxHp: 600, atk: 108, def: 18, attackRange: 70, attackInterval: 0.8 }),
  },
  cung_tac: {
    id: 'cung_tac',
    name: 'Cung Tặc',
    sect: 'ma_giao', // ranged attacker
    rarity: 'default',
    enemy: true,
    base: stats({ maxHp: 560, atk: 92, def: 16, attackRange: 240, attackInterval: 1.1 }),
  },
  hac_y_nhan: {
    id: 'hac_y_nhan',
    name: 'Hắc Y Nhân',
    sect: 'cai_bang', // assassin: high single-target
    rarity: 'default',
    enemy: true,
    base: stats({ maxHp: 700, atk: 124, def: 22, attackRange: 80, attackInterval: 0.85 }),
  },
  tro_phap_su: {
    id: 'tro_phap_su',
    name: 'Trở Pháp Sư',
    sect: 'ma_giao', // ranged AoE caster
    rarity: 'default',
    enemy: true,
    base: stats({ maxHp: 640, atk: 108, def: 20, attackRange: 300, attackInterval: 1.05 }),
  },
  vu_y: {
    id: 'vu_y',
    name: 'Vu Y',
    sect: 'nga_mi', // healer support, ranged
    rarity: 'default',
    enemy: true,
    base: stats({ maxHp: 700, atk: 58, def: 24, attackRange: 250, attackInterval: 1.2 }),
  },
  ta_dao_si: {
    id: 'ta_dao_si',
    name: 'Tà Đạo Sĩ',
    sect: 'vo_dang', // control: slow
    rarity: 'default',
    enemy: true,
    base: stats({ maxHp: 820, atk: 80, def: 36, attackRange: 95, attackInterval: 1.05 }),
  },
  ho_vuong: {
    id: 'ho_vuong',
    name: 'Hổ Vương',
    sect: 'thieu_lam', // boss: beefy front-line bruiser
    rarity: 'rare',
    enemy: true,
    base: stats({ maxHp: 2200, atk: 132, def: 56, attackRange: 80, attackInterval: 1.0 }),
  },
  son_tac_dau_linh: {
    id: 'son_tac_dau_linh',
    name: 'Sơn Tặc Đầu Lĩnh',
    sect: 'cai_bang', // boss: heavy hitter
    rarity: 'rare',
    enemy: true,
    base: stats({ maxHp: 1600, atk: 152, def: 40, attackRange: 85, attackInterval: 0.9 }),
  },
};

export function getCharacter(id: string): CharacterDef {
  const def = CHARACTERS[id];
  if (!def) throw new Error(`Unknown character id: ${id}`);
  return def;
}

export const ALL_CHARACTER_IDS = Object.keys(CHARACTERS);
/** Characters the player can own/field (excludes enemy-only mobs). */
export const PLAYABLE_CHARACTER_IDS = ALL_CHARACTER_IDS.filter((id) => !CHARACTERS[id]!.enemy);
/** Enemy-only mobs used to build PvE encounters. */
export const ENEMY_CHARACTER_IDS = ALL_CHARACTER_IDS.filter((id) => CHARACTERS[id]!.enemy);

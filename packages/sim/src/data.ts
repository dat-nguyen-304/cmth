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
    base: stats({ maxHp: 1400, atk: 70, def: 60, spd: 95, attackRange: 70, attackInterval: 1.3 }),
  },
  ly_tuu_cuong: {
    id: 'ly_tuu_cuong',
    name: 'Lý Tửu Cuồng',
    sect: 'cai_bang',
    rarity: 'default',
    base: stats({ maxHp: 820, atk: 135, def: 28, spd: 120, attackRange: 80, attackInterval: 0.85 }),
  },
  cau_nhi: {
    id: 'cau_nhi',
    name: 'Cẩu Nhi',
    sect: 'cai_bang',
    rarity: 'default',
    base: stats({ maxHp: 860, atk: 120, def: 30, spd: 125, attackRange: 75, attackInterval: 0.9 }),
  },
  tieu_ngoc: {
    id: 'tieu_ngoc',
    name: 'Tiểu Ngọc',
    sect: 'nga_mi',
    rarity: 'default',
    // Ranged support: stays at the back, heals + pokes from afar.
    base: stats({ maxHp: 760, atk: 80, def: 30, spd: 110, attackRange: 260, attackInterval: 1.1 }),
  },
  thanh_van: {
    id: 'thanh_van',
    name: 'Thanh Vân',
    sect: 'vo_dang',
    rarity: 'default',
    base: stats({ maxHp: 980, atk: 90, def: 42, spd: 108, attackRange: 90, attackInterval: 1.05 }),
  },
  huyet_anh: {
    id: 'huyet_anh',
    name: 'Huyết Ảnh',
    sect: 'ma_giao',
    rarity: 'default',
    // Ranged dark caster: hangs back behind the melee and throws damage from distance.
    base: stats({ maxHp: 760, atk: 120, def: 28, spd: 110, attackRange: 300, attackInterval: 1.0 }),
  },
};

export function getCharacter(id: string): CharacterDef {
  const def = CHARACTERS[id];
  if (!def) throw new Error(`Unknown character id: ${id}`);
  return def;
}

export const ALL_CHARACTER_IDS = Object.keys(CHARACTERS);

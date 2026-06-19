import {
  CHARACTERS,
  GROWTH_PER_LEVEL,
  MELEE_RANGE_MAX,
  UPGRADE_BONUS_PER_TIER,
  type SectId,
} from '@cmth/sim';

/** Presentation-only ultimate names/descriptions per sect (the logic lives in the sim). */
export const SECT_ULT: Record<SectId, { name: string; desc: string }> = {
  thieu_lam: {
    name: 'Kim Cang Hộ Thể',
    desc: 'Tạo khiên lớn cho bản thân và khiên nhỏ cho toàn đội.',
  },
  cai_bang: {
    name: 'Giáng Long Thập Bát Chưởng',
    desc: 'Dồn một đòn sát thương cực mạnh vào kẻ địch gần nhất.',
  },
  nga_mi: {
    name: 'Phật Quang Phổ Chiếu',
    desc: 'Hồi máu lớn cho đồng đội đang có % máu thấp nhất.',
  },
  vo_dang: {
    name: 'Thái Cực Quyền Ý',
    desc: 'Gây sát thương và làm chậm kẻ địch gần nhất trong 4 giây.',
  },
  ma_giao: {
    name: 'Huyết Ma Đại Pháp',
    desc: 'Sát thương diện rộng toàn bộ kẻ địch kèm giảm phòng thủ của chúng.',
  },
};

export interface DisplayStats {
  hp: number;
  atk: number;
  def: number;
  /** Attacks per second (derived from attackInterval; higher = faster "hit speed"). */
  atkSpeed: number;
  ranged: boolean;
}

/** Stats a character would have at a given level + upgrade tier (mirrors the sim). */
export function heroStats(defId: string, level: number, upgrade = 0): DisplayStats {
  const b = CHARACTERS[defId]!.base;
  const f = (1 + GROWTH_PER_LEVEL * (level - 1)) * (1 + UPGRADE_BONUS_PER_TIER * upgrade);
  return {
    hp: Math.round(b.maxHp * f),
    atk: Math.round(b.atk * f),
    def: Math.round(b.def * f),
    atkSpeed: 1 / b.attackInterval,
    ranged: b.attackRange > MELEE_RANGE_MAX,
  };
}

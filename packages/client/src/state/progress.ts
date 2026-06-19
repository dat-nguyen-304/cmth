import { PLAYABLE_CHARACTER_IDS } from '@cmth/sim';

/**
 * Phase 1 progression — stored locally (localStorage). This is intentionally
 * client-only; in Phase 2 the wallet + progression (and an authoritative stamina
 * clock) move server-side per account.
 */

export interface CharProgress {
  /** Bought with gold, capped by the tu luyện tier. Scales HP/ATK/DEF in combat. */
  level: number;
  /** Tu luyện tier (0 = none): raises the level cap and adds a small power bonus. */
  upgrade: number;
}

export interface PlayerProgress {
  gold: number;
  /** Tinh Hoa — scarcer upgrade material (combines with gold for tu luyện). */
  essence: number;
  stage: number;
  /** Account-level "Chưởng Môn" progression, shown in the hub header. */
  playerLevel: number;
  playerExp: number;
  /** Stamina anchor: `stamina` was the value at `staminaAt` (epoch ms); the live
   *  amount is derived by regenerating from there. */
  stamina: number;
  staminaAt: number;
  chars: Record<string, CharProgress>;
  /** Ordered ids of the characters that take the field (1–6). Index 0 is the
   *  front line and engages first, so ordering is a real tactical choice. */
  team: string[];
}

/** Max characters fielded at once (6v6 per the design). */
export const TEAM_SIZE = 6;

export interface Rewards {
  gold: number;
  essence: number;
  playerExp: number;
  playerLeveledTo: number | null;
}

const KEY = 'cmth_progress_v1';

// --- Tunable economy constants (Phase 1) ---------------------------------------
export const STAMINA_MAX = 120;
export const STAMINA_PER_BATTLE = 6;
/** One stamina point regenerated per this many ms (90s — tweak to taste). */
export const STAMINA_REGEN_MS = 90_000;

/** Each tu luyện tier raises a character's level cap by this many levels. */
export const LEVELS_PER_TIER = 10;
export function levelCap(upgrade: number): number {
  return (upgrade + 1) * LEVELS_PER_TIER;
}
/** Gold to raise a character from `level` to `level + 1`. */
export function levelCost(level: number): number {
  return 40 + 20 * level;
}

/** Tinh Hoa earned per win (scarce vs gold), with a bonus on boss stages. */
export const ESSENCE_PER_WIN = 2;
export const ESSENCE_BOSS_BONUS = 6;
/** Boss stages (every 5th) — mirrors the encounter builder. */
export function isBossStage(stage: number): boolean {
  return stage % 5 === 0;
}

/** Tu luyện: cap + cost (gold AND Tinh Hoa) to go from the current tier to the next.
 *  Gold is plentiful so it stays cheap; Tinh Hoa is the real gate. */
export const MAX_UPGRADE = 10;
export function upgradeCost(tier: number): number {
  return 80 * (tier + 1);
}
export function upgradeEssenceCost(tier: number): number {
  return 2 + tier; // 2,3,4,… — a few wins per early tier
}

export function playerExpToNext(level: number): number {
  return 100 + (level - 1) * 80;
}

// --- Persistence ---------------------------------------------------------------

export function defaultProgress(now: number = Date.now()): PlayerProgress {
  const chars: Record<string, CharProgress> = {};
  for (const id of PLAYABLE_CHARACTER_IDS) chars[id] = { level: 1, upgrade: 0 };
  return {
    gold: 0,
    essence: 0,
    stage: 1,
    playerLevel: 1,
    playerExp: 0,
    stamina: STAMINA_MAX,
    staminaAt: now,
    chars,
    team: PLAYABLE_CHARACTER_IDS.slice(0, TEAM_SIZE),
  };
}

/** Fill in any fields/characters added since the save was written. */
function migrate(p: Partial<PlayerProgress>): PlayerProgress {
  const base = defaultProgress();
  // Merge per-character so fields added later (e.g. `upgrade`) get defaults even when
  // an older save only stored {level, exp}.
  const chars: Record<string, CharProgress> = {};
  for (const id of Object.keys(base.chars)) {
    chars[id] = { ...base.chars[id]!, ...(p.chars?.[id] ?? {}) };
  }
  // Keep only owned, unique ids; fall back to a default team if nothing valid.
  const team = sanitizeTeam(p.team ?? base.team, chars);
  return {
    gold: p.gold ?? base.gold,
    essence: p.essence ?? base.essence,
    stage: p.stage ?? base.stage,
    playerLevel: p.playerLevel ?? base.playerLevel,
    playerExp: p.playerExp ?? base.playerExp,
    stamina: p.stamina ?? base.stamina,
    staminaAt: p.staminaAt ?? base.staminaAt,
    chars,
    team: team.length > 0 ? team : Object.keys(chars).slice(0, TEAM_SIZE),
  };
}

/** Drop unknown/unowned ids, de-duplicate, and cap at TEAM_SIZE. */
export function sanitizeTeam(ids: string[], chars: Record<string, CharProgress>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (chars[id] && !seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
    if (out.length >= TEAM_SIZE) break;
  }
  return out;
}

export function loadProgress(): PlayerProgress {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return migrate(JSON.parse(raw) as Partial<PlayerProgress>);
  } catch {
    /* corrupt save — fall through to defaults */
  }
  return defaultProgress();
}

export function saveProgress(p: PlayerProgress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable — non-fatal in Phase 1 */
  }
}

export function resetProgress(): PlayerProgress {
  const p = defaultProgress();
  saveProgress(p);
  return p;
}

/**
 * Spend gold to raise a character's level by one (up to the tu luyện cap).
 * Returns updated progress, or null if at the cap or short on gold.
 */
export function levelUpChar(p: PlayerProgress, defId: string): PlayerProgress | null {
  const cp = p.chars[defId];
  if (!cp) return null;
  if (cp.level >= levelCap(cp.upgrade ?? 0)) return null; // need tu luyện to raise the cap
  const cost = levelCost(cp.level);
  if (p.gold < cost) return null;
  const next = structuredClone(p);
  next.gold -= cost;
  next.chars[defId]!.level = cp.level + 1;
  return next;
}

/**
 * Tu luyện: spend gold + Tinh Hoa to raise the tier by one, which lifts the level
 * cap (and adds a power bonus). Only allowed once the character has hit its current
 * cap. Returns null if maxed, not at cap, or short on either resource.
 */
export function upgradeChar(p: PlayerProgress, defId: string): PlayerProgress | null {
  const cp = p.chars[defId];
  if (!cp) return null;
  const tier = cp.upgrade ?? 0; // tolerate older saves without the field
  if (tier >= MAX_UPGRADE) return null;
  if (cp.level < levelCap(tier)) return null; // must reach the current cap first
  const gold = upgradeCost(tier);
  const essence = upgradeEssenceCost(tier);
  if (p.gold < gold || (p.essence ?? 0) < essence) return null;
  const next = structuredClone(p);
  next.gold -= gold;
  next.essence = (next.essence ?? 0) - essence;
  next.chars[defId]!.upgrade = tier + 1;
  return next;
}

// --- Stamina (derived from the anchor; no per-second writes) --------------------

/** Live stamina at `now`, regenerated from the stored anchor. */
export function currentStamina(p: PlayerProgress, now: number): number {
  if (p.stamina >= STAMINA_MAX) return STAMINA_MAX;
  const gained = Math.floor(Math.max(0, now - p.staminaAt) / STAMINA_REGEN_MS);
  return Math.min(STAMINA_MAX, p.stamina + gained);
}

/** Milliseconds until the next stamina point (0 if already full). */
export function staminaNextInMs(p: PlayerProgress, now: number): number {
  if (currentStamina(p, now) >= STAMINA_MAX) return 0;
  const elapsed = Math.max(0, now - p.staminaAt);
  return STAMINA_REGEN_MS - (elapsed % STAMINA_REGEN_MS);
}

/** Bake accumulated regen into the anchor so we can spend from a clean value. */
function normalizeStamina(p: PlayerProgress, now: number): PlayerProgress {
  const cur = currentStamina(p, now);
  if (cur >= STAMINA_MAX) return { ...p, stamina: STAMINA_MAX, staminaAt: now };
  const remainder = Math.max(0, now - p.staminaAt) % STAMINA_REGEN_MS;
  return { ...p, stamina: cur, staminaAt: now - remainder };
}

export function spendStamina(p: PlayerProgress, now: number, cost: number): PlayerProgress {
  const n = normalizeStamina(p, now);
  return { ...n, stamina: Math.max(0, n.stamina - cost) };
}

// --- Rewards -------------------------------------------------------------------

/** Gold / Tinh Hoa / Chưởng Môn exp granted for winning a stage. Pure, so the
 *  prepare screen can preview it without applying anything. Characters level up by
 *  spending gold, not from battle exp. */
export function winRewards(
  stage: number,
): { gold: number; essence: number; playerExp: number } {
  return {
    gold: 50 + 10 * stage,
    essence: ESSENCE_PER_WIN + (isBossStage(stage) ? ESSENCE_BOSS_BONUS : 0),
    playerExp: 30 + 4 * stage,
  };
}

/** Apply battle rewards: gold, Tinh Hoa, Chưởng Môn exp, stage advance on win. */
export function applyRewards(p: PlayerProgress, win: boolean): { next: PlayerProgress; rewards: Rewards } {
  const next: PlayerProgress = structuredClone(p);
  const rewards: Rewards = { gold: 0, essence: 0, playerExp: 0, playerLeveledTo: null };

  if (win) {
    const w = winRewards(p.stage);
    rewards.gold = w.gold;
    rewards.essence = w.essence;
    rewards.playerExp = w.playerExp;
    next.stage = p.stage + 1;
  } else {
    rewards.gold = 10;
    rewards.essence = 0;
    rewards.playerExp = 10;
  }

  next.gold += rewards.gold;
  next.essence = (next.essence ?? 0) + rewards.essence;

  // Player (Chưởng Môn) exp + level ups.
  next.playerExp += rewards.playerExp;
  let pl = next.playerLevel;
  while (next.playerExp >= playerExpToNext(pl)) {
    next.playerExp -= playerExpToNext(pl);
    pl += 1;
  }
  if (pl !== next.playerLevel) {
    rewards.playerLeveledTo = pl;
    next.playerLevel = pl;
  }

  return { next, rewards };
}

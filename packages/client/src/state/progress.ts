import { PLAYABLE_CHARACTER_IDS } from '@cmth/sim';

/**
 * Phase 1 progression — stored locally (localStorage). This is intentionally
 * client-only; in Phase 2 the wallet + progression (and an authoritative stamina
 * clock) move server-side per account.
 */

export interface CharProgress {
  level: number;
  exp: number;
}

export interface PlayerProgress {
  gold: number;
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

/** A character that gained one or more levels this battle. */
export interface LevelUp {
  defId: string;
  from: number;
  to: number;
}

export interface Rewards {
  gold: number;
  exp: number; // per-character exp
  playerExp: number;
  levelUps: LevelUp[];
  playerLeveledTo: number | null;
}

const KEY = 'cmth_progress_v1';

// --- Tunable economy constants (Phase 1) ---------------------------------------
export const STAMINA_MAX = 120;
export const STAMINA_PER_BATTLE = 6;
/** One stamina point regenerated per this many ms (90s — tweak to taste). */
export const STAMINA_REGEN_MS = 90_000;

export function expToNext(level: number): number {
  return 80 + level * 40;
}

export function playerExpToNext(level: number): number {
  return 100 + (level - 1) * 80;
}

// --- Persistence ---------------------------------------------------------------

export function defaultProgress(now: number = Date.now()): PlayerProgress {
  const chars: Record<string, CharProgress> = {};
  for (const id of PLAYABLE_CHARACTER_IDS) chars[id] = { level: 1, exp: 0 };
  return {
    gold: 0,
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
  const chars = { ...base.chars, ...p.chars };
  // Keep only owned, unique ids; fall back to a default team if nothing valid.
  const team = sanitizeTeam(p.team ?? base.team, chars);
  return {
    gold: p.gold ?? base.gold,
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

/** Gold / per-character exp / player exp granted for winning a stage. Pure, so the
 *  prepare screen can preview it without applying anything. */
export function winRewards(stage: number): { gold: number; exp: number; playerExp: number } {
  return { gold: 50 + 10 * stage, exp: 40 + 8 * stage, playerExp: 30 + 4 * stage };
}

/** Apply battle rewards: gold, per-character exp, player exp, stage advance on win. */
export function applyRewards(p: PlayerProgress, win: boolean): { next: PlayerProgress; rewards: Rewards } {
  const next: PlayerProgress = structuredClone(p);
  const rewards: Rewards = { gold: 0, exp: 0, playerExp: 0, levelUps: [], playerLeveledTo: null };

  if (win) {
    const w = winRewards(p.stage);
    rewards.gold = w.gold;
    rewards.exp = w.exp;
    rewards.playerExp = w.playerExp;
    next.stage = p.stage + 1;
  } else {
    rewards.gold = 10;
    rewards.exp = 15;
    rewards.playerExp = 10;
  }

  next.gold += rewards.gold;

  // Per-character exp + level ups.
  for (const id of Object.keys(next.chars)) {
    const cp = next.chars[id]!;
    const before = cp.level;
    cp.exp += rewards.exp;
    while (cp.exp >= expToNext(cp.level)) {
      cp.exp -= expToNext(cp.level);
      cp.level += 1;
    }
    if (cp.level > before) rewards.levelUps.push({ defId: id, from: before, to: cp.level });
  }

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

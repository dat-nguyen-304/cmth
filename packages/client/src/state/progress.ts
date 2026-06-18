import { ALL_CHARACTER_IDS, CHARACTERS } from '@cmth/sim';

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
}

export interface Rewards {
  gold: number;
  exp: number; // per-character exp
  playerExp: number;
  levelUps: string[];
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
  for (const id of ALL_CHARACTER_IDS) chars[id] = { level: 1, exp: 0 };
  return {
    gold: 0,
    stage: 1,
    playerLevel: 1,
    playerExp: 0,
    stamina: STAMINA_MAX,
    staminaAt: now,
    chars,
  };
}

/** Fill in any fields/characters added since the save was written. */
function migrate(p: Partial<PlayerProgress>): PlayerProgress {
  const base = defaultProgress();
  return {
    gold: p.gold ?? base.gold,
    stage: p.stage ?? base.stage,
    playerLevel: p.playerLevel ?? base.playerLevel,
    playerExp: p.playerExp ?? base.playerExp,
    stamina: p.stamina ?? base.stamina,
    staminaAt: p.staminaAt ?? base.staminaAt,
    chars: { ...base.chars, ...p.chars },
  };
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

/** Apply battle rewards: gold, per-character exp, player exp, stage advance on win. */
export function applyRewards(p: PlayerProgress, win: boolean): { next: PlayerProgress; rewards: Rewards } {
  const next: PlayerProgress = structuredClone(p);
  const rewards: Rewards = { gold: 0, exp: 0, playerExp: 0, levelUps: [], playerLeveledTo: null };

  if (win) {
    rewards.gold = 50 + 10 * p.stage;
    rewards.exp = 40 + 8 * p.stage;
    rewards.playerExp = 30 + 4 * p.stage;
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
    cp.exp += rewards.exp;
    let leveled = false;
    while (cp.exp >= expToNext(cp.level)) {
      cp.exp -= expToNext(cp.level);
      cp.level += 1;
      leveled = true;
    }
    if (leveled) rewards.levelUps.push(CHARACTERS[id]!.name);
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

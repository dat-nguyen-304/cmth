import { ALL_CHARACTER_IDS, CHARACTERS } from '@cmth/sim';

/**
 * Phase 1 progression — stored locally (localStorage). This is intentionally
 * client-only; in Phase 2 the wallet + progression move server-side per account.
 */

export interface CharProgress {
  level: number;
  exp: number;
}

export interface PlayerProgress {
  gold: number;
  stage: number;
  chars: Record<string, CharProgress>;
}

export interface Rewards {
  gold: number;
  exp: number;
  levelUps: string[];
}

const KEY = 'cmth_progress_v1';

export function defaultProgress(): PlayerProgress {
  const chars: Record<string, CharProgress> = {};
  for (const id of ALL_CHARACTER_IDS) chars[id] = { level: 1, exp: 0 };
  return { gold: 0, stage: 1, chars };
}

/** Fill in any characters added since the save was written. */
function migrate(p: PlayerProgress): PlayerProgress {
  const base = defaultProgress();
  return {
    gold: p.gold ?? 0,
    stage: p.stage ?? 1,
    chars: { ...base.chars, ...p.chars },
  };
}

export function loadProgress(): PlayerProgress {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return migrate(JSON.parse(raw) as PlayerProgress);
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

export function expToNext(level: number): number {
  return 80 + level * 40;
}

/** Apply battle rewards: gold, exp to every owned character, and stage advance on a win. */
export function applyRewards(p: PlayerProgress, win: boolean): { next: PlayerProgress; rewards: Rewards } {
  const next: PlayerProgress = structuredClone(p);
  const rewards: Rewards = { gold: 0, exp: 0, levelUps: [] };

  if (win) {
    rewards.gold = 50 + 10 * p.stage;
    rewards.exp = 40 + 8 * p.stage;
    next.stage = p.stage + 1;
  } else {
    rewards.gold = 10;
    rewards.exp = 15;
  }

  next.gold += rewards.gold;
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

  return { next, rewards };
}

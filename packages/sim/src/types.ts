/** Core data types for the combat sim. */

export type Side = 0 | 1;

export type SectId = 'thieu_lam' | 'cai_bang' | 'nga_mi' | 'vo_dang' | 'ma_giao';

export type Rarity = 'default' | 'rare';

export interface BaseStats {
  maxHp: number;
  atk: number;
  def: number;
  attackRange: number; // world units
  attackInterval: number; // seconds between auto-attacks (lower = faster = "hit speed")
}

/** Static definition of a character (roster data, sect-independent of any battle). */
export interface CharacterDef {
  id: string;
  name: string;
  sect: SectId;
  rarity: Rarity;
  base: BaseStats;
}

/** A character entering a battle, at a given level. */
export interface Recruit {
  defId: string;
  level?: number; // defaults to 1
}

export interface Vec2 {
  x: number;
  y: number;
}

/** A live combatant inside a running battle. */
export interface Combatant {
  uid: number; // unique within the battle
  defId: string;
  name: string;
  sect: SectId;
  side: Side;
  level: number;

  pos: Vec2;
  facing: 1 | -1;

  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  attackRange: number;
  attackInterval: number;
  attackTimer: number; // seconds until next auto-attack is allowed

  energy: number;
  shield: number; // flat damage absorbed before HP

  // transient status effects (seconds remaining + magnitude)
  slowTimer: number;
  slowFactor: number; // multiplies move speed while slowTimer > 0
  defDownTimer: number;
  defDownFactor: number; // multiplies def while defDownTimer > 0
  dotTimer: number;
  dotPerSecond: number;

  alive: boolean;
}

export interface BattleState {
  tick: number;
  rngState: number;
  combatants: Combatant[];
  finished: boolean;
  winner: Side | null;
}

export type BattleEvent =
  | { type: 'attack'; source: number; target: number; amount: number; killed: boolean }
  | { type: 'ult'; source: number; sect: SectId }
  | { type: 'heal'; source: number; target: number; amount: number }
  | { type: 'shield'; source: number; target: number; amount: number }
  | { type: 'death'; uid: number };

/** Decides which ready ults fire on a given tick. Lets headless runs auto-play. */
export type Controller = (state: BattleState) => number[];

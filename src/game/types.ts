export interface PhysStats {
  topSpeed: number;
  accel: number;
  turnRate: number;
  shotPower: number;
  accuracy: number;
  control: number;
  passing: number;
  tackle: number;
  chargeRate: number;
  mass: number;
  /** Max stamina pool (engine units). */
  staminaMax: number;
}

export interface MatchPlayerDef {
  key: string;
  name: string;
  charId: string;
  variantId: string;
  skillId: string;
  kit: string;
  side: 0 | 1;
  stats: PhysStats;
  /** -1 for bots, otherwise the human input slot driving this player. */
  human: number;
}

export interface TeamDef {
  name: string;
  color: string;
  accent: string;
}

export interface MatchConfig {
  seed: number;
  durationSec: number;
  tempo: number;
  teams: [TeamDef, TeamDef];
  players: MatchPlayerDef[];
  botSkill: [number, number];
  goalieSkill: [number, number];
  humanCount: number;
  formations?: [Formation, Formation];
}

export type Formation = "balanced" | "attack" | "defend";

export interface PState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hx: number;
  hy: number;
  speed: number;
  charge: number;
  /** Ticks held at full charge; too long → fumble. */
  overhold: number;
  kickCd: number;
  tackleCd: number;
  tackleT: number;
  stun: number;
  /** Current stamina 0..staminaMax. */
  stamina: number;
  aiT: number;
  aiMode: number;
  prevShoot: boolean;
  prevPass: boolean;
  prevAbility: boolean;
  /** Remaining ticks of an active ability. */
  abilityT: number;
  /** Remaining ticks until the ability can be used again. */
  abilityCd: number;
}

export interface GState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hold: number;
  dive: number;
  cd: number;
}

export interface BallState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** -1 free, 0..n-1 player index, 100/101 goalie of side 0/1. */
  owner: number;
  lastTouch: number;
  lastSide: number;
  shotId: number;
  checked0: number;
  checked1: number;
}

export type MatchEvent =
  | { t: "goal"; side: number; scorer: number }
  | { t: "shot"; p: number; power: number }
  | { t: "save"; side: number; catch: boolean }
  | { t: "pass"; p: number }
  | { t: "tackle"; p: number; victim: number }
  | { t: "kick"; x: number; y: number }
  | { t: "post"; x: number; y: number }
  | { t: "ability"; p: number; skillId: string }
  | { t: "fumble"; p: number }
  | { t: "kickoff" }
  | { t: "end" };

export interface PlayerMatchStats {
  goals: number;
  shots: number;
  passes: number;
  tackles: number;
}

export interface MatchState {
  tick: number;
  clock: number;
  phase: 0 | 1 | 3;
  phaseT: number;
  score: [number, number];
  players: PState[];
  goalies: [GState, GState];
  ball: BallState;
  rng: number;
  events: MatchEvent[];
  stats: PlayerMatchStats[];
  saves: [number, number];
  lastGoalSide: number;
}

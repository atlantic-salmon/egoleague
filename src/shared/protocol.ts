import type { MatchConfig } from "@/game/types";
import type { MatchEvent } from "@/game/types";
import type { Snapshot } from "@/game/engine";

export type Difficulty = "easy" | "normal" | "hard" | "ego";

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: "Rookie",
  normal: "Selection",
  hard: "U-20",
  ego: "World Class",
};

export type LobbySlotView =
  | { kind: "human"; userId: number; name: string; teamId: number | null; online: boolean }
  | { kind: "bot"; id: string };

export interface LobbyView {
  code: string;
  hostId: number;
  sides: [LobbySlotView[], LobbySlotView[]];
  settings: { durationSec: number; difficulty: Difficulty };
  status: "open" | "playing";
}

export interface MatchRewardView {
  coins: number;
  gems: number;
  xp: number;
  ratingDelta?: number;
  note?: string;
}

export type ServerMsg =
  | { t: "hello"; userId: number; username: string }
  | { t: "lobby"; lobby: LobbyView }
  | { t: "lobby.closed"; reason: string }
  | { t: "error"; msg: string }
  | { t: "queue"; status: "idle" | "searching"; waiting: number }
  | { t: "match.start"; matchId: string; config: MatchConfig; you: number; mode: "friendly" | "ranked" }
  | { t: "snap"; s: Snapshot; ev: MatchEvent[] }
  | { t: "match.end"; score: [number, number]; side: 0 | 1; reward: MatchRewardView; mode: "friendly" | "ranked" };

export type ClientMsg =
  | { t: "lobby.create" }
  | { t: "lobby.join"; code: string }
  | { t: "lobby.leave" }
  | { t: "lobby.settings"; durationSec?: number; difficulty?: Difficulty }
  | { t: "lobby.bot"; side: 0 | 1; action: "add" | "remove" }
  | { t: "lobby.move"; side: 0 | 1; userId?: number }
  | { t: "lobby.team"; teamId: number | null }
  | { t: "lobby.start" }
  | { t: "queue.join"; teamId: number | null }
  | { t: "queue.leave" }
  | { t: "in"; b: number }
  | { t: "match.leave" };

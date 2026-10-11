import type { Rarity } from "./rarity";

export interface LeagueTeam {
  id: string;
  tier: number;
  name: string;
  blurb: string;
  color: string;
  accent: string;
  variants: string[];
  rarities: Rarity[];
  level: number;
  roll: number;
  botSkill: number;
  goalie: number;
  mySize: number;
  durationSec: number;
  tempo: number;
  recommendedOvr: number;
  rewards: { gems: number; xp: number };
}

/** Escalating PvE ladder. Beat a team to unlock the next; any unlocked team can be replayed. */
export const LEAGUE_TEAMS: LeagueTeam[] = [
  {
    id: "lg-1",
    tier: 1,
    name: "Team Z Reserves",
    blurb: "Warm-up against Blue Lock trainees. Easy goals if you keep moving.",
    color: "#1e3a8a",
    accent: "#93c5fd",
    variants: ["igaguri.base", "raichi.base", "gagamaru.base"],
    rarities: ["C"],
    level: 1,
    roll: 22,
    botSkill: 0.28,
    goalie: 0.3,
    mySize: 3,
    durationSec: 120,
    tempo: 1.12,
    recommendedOvr: 36,
    rewards: { gems: 40, xp: 60 },
  },
  {
    id: "lg-2",
    tier: 2,
    name: "Team Y",
    blurb: "They pack the middle. Pass wide, then cut in.",
    color: "#ca8a04",
    accent: "#fef08a",
    variants: ["igaguri.base", "raichi.base", "otoya.base", "gagamaru.base"],
    rarities: ["C", "UC"],
    level: 4,
    roll: 32,
    botSkill: 0.38,
    goalie: 0.36,
    mySize: 3,
    durationSec: 120,
    tempo: 1.1,
    recommendedOvr: 42,
    rewards: { gems: 55, xp: 80 },
  },
  {
    id: "lg-3",
    tier: 3,
    name: "Team V",
    blurb: "Nagi and Reo link every attack. Steal the ball early.",
    color: "#6d28d9",
    accent: "#ddd6fe",
    variants: ["nagi.base", "reo.base", "otoya.base"],
    rarities: ["UC", "R"],
    level: 8,
    roll: 42,
    botSkill: 0.5,
    goalie: 0.45,
    mySize: 3,
    durationSec: 130,
    tempo: 1.08,
    recommendedOvr: 50,
    rewards: { gems: 70, xp: 110 },
  },
  {
    id: "lg-4",
    tier: 4,
    name: "Rin's Trio",
    blurb: "Clinical finishers. One mistake and you're down.",
    color: "#065f46",
    accent: "#6ee7b7",
    variants: ["rin.base", "aryu.base", "kurona.base"],
    rarities: ["R", "E"],
    level: 12,
    roll: 52,
    botSkill: 0.62,
    goalie: 0.55,
    mySize: 3,
    durationSec: 140,
    tempo: 1.05,
    recommendedOvr: 58,
    rewards: { gems: 90, xp: 140 },
  },
  {
    id: "lg-5",
    tier: 5,
    name: "Barou's Squad",
    blurb: "The King only shoots. Survive the counters and punish him.",
    color: "#18181b",
    accent: "#f87171",
    variants: ["barou.king", "gagamaru.base", "raichi.u20"],
    rarities: ["R", "E"],
    level: 16,
    roll: 58,
    botSkill: 0.68,
    goalie: 0.6,
    mySize: 3,
    durationSec: 140,
    tempo: 1.04,
    recommendedOvr: 66,
    rewards: { gems: 110, xp: 180 },
  },
  {
    id: "lg-6",
    tier: 6,
    name: "U-20 Japan",
    blurb: "Sae runs the tempo. Match him in midfield or get carved open.",
    color: "#0f172a",
    accent: "#e2e8f0",
    variants: ["sae.u20", "shidou.u20", "aryu.base", "raichi.u20", "yukimiya.base"],
    rarities: ["E", "L"],
    level: 22,
    roll: 68,
    botSkill: 0.8,
    goalie: 0.74,
    mySize: 5,
    durationSec: 150,
    tempo: 1.02,
    recommendedOvr: 76,
    rewards: { gems: 150, xp: 240 },
  },
  {
    id: "lg-7",
    tier: 7,
    name: "Manshine City",
    blurb: "Neo Egoist pace. Keep your shape when they stretch the pitch.",
    color: "#0ea5e9",
    accent: "#e0f2fe",
    variants: ["nagi.manshine", "chigiri.manshine", "reo.manshine", "kunigami.ace"],
    rarities: ["M", "L", "WC"],
    level: 30,
    roll: 78,
    botSkill: 0.88,
    goalie: 0.82,
    mySize: 4,
    durationSec: 150,
    tempo: 1.0,
    recommendedOvr: 88,
    rewards: { gems: 200, xp: 320 },
  },
  {
    id: "lg-8",
    tier: 8,
    name: "World Selection",
    blurb: "Kaiser, Rin, Shidou and more. The hardest rung on the ladder.",
    color: "#1e1b4b",
    accent: "#fbbf24",
    variants: ["kaiser.bastard", "rin.pxg", "shidou.pxg", "karasu.pxg", "sae.n1"],
    rarities: ["WC", "N1"],
    level: 42,
    roll: 90,
    botSkill: 0.96,
    goalie: 0.92,
    mySize: 5,
    durationSec: 160,
    tempo: 1.0,
    recommendedOvr: 100,
    rewards: { gems: 300, xp: 450 },
  },
];

export const LEAGUE_BY_ID: Record<string, LeagueTeam> = Object.fromEntries(LEAGUE_TEAMS.map((t) => [t.id, t]));

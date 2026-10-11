import type { Rarity } from "./rarity";

export type Objective = { type: "goals"; n: number } | { type: "win" } | { type: "winBy"; n: number };

export interface StageDef {
  id: string;
  chapter: number;
  title: string;
  blurb: string;
  objective: Objective;
  durationSec: number;
  tempo: number;
  /** Fixed story lineup — you always play these characters, not your collection. */
  preset: string[];
  myBotSkill: number;
  myGoalie: number;
  opp: {
    name: string;
    color: string;
    accent: string;
    variants: string[];
    rarities: Rarity[];
    level: number;
    roll: number;
    botSkill: number;
    goalie: number;
  };
  rewards: { gems: number; xp: number; variant?: string };
  before: string;
  after: string;
  requires: string | null;
  recommendedOvr: number;
}

export const CHAPTERS = [
  { n: 1, title: "First Selection", subtitle: "300 strikers. One survives." },
  { n: 2, title: "Second Selection", subtitle: "Steal the strongest, or be stolen." },
  { n: 3, title: "U-20 Japan", subtitle: "Blue Lock bets its life on one match." },
  { n: 4, title: "Neo Egoist League", subtitle: "The world's best are watching." },
];

export const STAGES: StageDef[] = [
  {
    id: "1-1",
    chapter: 1,
    title: "Enter the Blue Lock",
    blurb: "Alone against the Blue Lock Man. Put three past him before the buzzer.",
    objective: { type: "goals", n: 3 },
    durationSec: 90,
    tempo: 1.18,
    preset: ["isagi.base"],
    myBotSkill: 0.4,
    myGoalie: 0.3,
    opp: { name: "Blue Lock Man", color: "#0b1a3a", accent: "#22d3ee", variants: [], rarities: ["C"], level: 1, roll: 20, botSkill: 0.2, goalie: 0.22 },
    rewards: { gems: 300, xp: 80, variant: "isagi.teamz" },
    before: "c1_intro",
    after: "c1_intro_after",
    requires: null,
    recommendedOvr: 35,
  },
  {
    id: "1-2",
    chapter: 1,
    title: "Team Z vs Team Y",
    blurb: "Your first team match. Learn to pass, then learn when not to.",
    objective: { type: "win" },
    durationSec: 120,
    tempo: 1.16,
    preset: ["isagi.base", "bachira.base", "kunigami.base"],
    myBotSkill: 0.45,
    myGoalie: 0.35,
    opp: { name: "Team Y", color: "#ca8a04", accent: "#fef08a", variants: ["igaguri.base", "raichi.base", "gagamaru.base"], rarities: ["C"], level: 1, roll: 25, botSkill: 0.28, goalie: 0.3 },
    rewards: { gems: 250, xp: 100 },
    before: "c1_teamy",
    after: "c1_teamy_after",
    requires: "1-1",
    recommendedOvr: 38,
  },
  {
    id: "1-3",
    chapter: 1,
    title: "Team Z vs Team V",
    blurb: "Nagi and Reo, the genius duo. Read the play and devour it.",
    objective: { type: "win" },
    durationSec: 120,
    tempo: 1.14,
    preset: ["isagi.teamz", "bachira.teamz", "chigiri.base"],
    myBotSkill: 0.5,
    myGoalie: 0.4,
    opp: { name: "Team V", color: "#6d28d9", accent: "#ddd6fe", variants: ["nagi.base", "reo.base", "otoya.base"], rarities: ["UC"], level: 3, roll: 40, botSkill: 0.45, goalie: 0.4 },
    rewards: { gems: 350, xp: 140, variant: "bachira.teamz" },
    before: "c1_teamv",
    after: "c1_teamv_after",
    requires: "1-2",
    recommendedOvr: 45,
  },
  {
    id: "2-1",
    chapter: 2,
    title: "Rin's Trio",
    blurb: "The number one of Blue Lock is waiting. Score once and you've earned the right to stay.",
    objective: { type: "win" },
    durationSec: 120,
    tempo: 1.1,
    preset: ["isagi.second", "bachira.monster", "nagi.base"],
    myBotSkill: 0.55,
    myGoalie: 0.45,
    opp: { name: "Rin's Trio", color: "#065f46", accent: "#6ee7b7", variants: ["rin.base", "aryu.base", "kurona.base"], rarities: ["R"], level: 8, roll: 50, botSkill: 0.6, goalie: 0.5 },
    rewards: { gems: 400, xp: 200 },
    before: "c2_rin",
    after: "c2_rin_after",
    requires: "1-3",
    recommendedOvr: 55,
  },
  {
    id: "2-2",
    chapter: 2,
    title: "The King's Ego",
    blurb: "Barou only plays for himself. Beat his squad by two or more.",
    objective: { type: "winBy", n: 2 },
    durationSec: 140,
    tempo: 1.08,
    preset: ["isagi.second", "bachira.monster", "chigiri.teamz"],
    myBotSkill: 0.58,
    myGoalie: 0.5,
    opp: { name: "Barou's Squad", color: "#18181b", accent: "#f87171", variants: ["barou.king", "gagamaru.base", "raichi.u20"], rarities: ["R", "E"], level: 12, roll: 55, botSkill: 0.64, goalie: 0.55 },
    rewards: { gems: 450, xp: 260, variant: "hiori.base" },
    before: "c2_barou",
    after: "c2_barou_after",
    requires: "2-1",
    recommendedOvr: 62,
  },
  {
    id: "3-1",
    chapter: 3,
    title: "Blue Lock vs U-20 Japan",
    blurb: "Five against five, and the future of Blue Lock on the line. Sae is watching you.",
    objective: { type: "win" },
    durationSec: 160,
    tempo: 1.04,
    preset: ["isagi.u20", "bachira.u20", "chigiri.u20", "nagi.teamv", "barou.king"],
    myBotSkill: 0.65,
    myGoalie: 0.6,
    opp: { name: "U-20 Japan", color: "#0f172a", accent: "#e2e8f0", variants: ["sae.u20", "shidou.u20", "aryu.base", "raichi.u20", "yukimiya.base"], rarities: ["E", "L"], level: 20, roll: 65, botSkill: 0.78, goalie: 0.72 },
    rewards: { gems: 700, xp: 400 },
    before: "c3_u20",
    after: "c3_u20_after",
    requires: "2-2",
    recommendedOvr: 74,
  },
  {
    id: "4-1",
    chapter: 4,
    title: "Bastard München vs Manshine City",
    blurb: "The Neo Egoist League begins. Win and your price tag goes up.",
    objective: { type: "win" },
    durationSec: 160,
    tempo: 1.0,
    preset: ["isagi.bastard", "hiori.bastard", "kurona.bastard", "kunigami.ace"],
    myBotSkill: 0.7,
    myGoalie: 0.68,
    opp: { name: "Manshine City", color: "#0ea5e9", accent: "#e0f2fe", variants: ["nagi.manshine", "chigiri.manshine", "reo.manshine", "kunigami.wildcard"], rarities: ["M", "L", "WC"], level: 32, roll: 75, botSkill: 0.86, goalie: 0.8 },
    rewards: { gems: 900, xp: 600 },
    before: "c4_manshine",
    after: "c4_manshine_after",
    requires: "3-1",
    recommendedOvr: 86,
  },
  {
    id: "4-2",
    chapter: 4,
    title: "Devour the Emperor",
    blurb: "Kaiser, Rin, Shidou, Karasu and Sae on one team. Become the world's #1.",
    objective: { type: "win" },
    durationSec: 180,
    tempo: 1.0,
    preset: ["isagi.meta", "bachira.barcha", "nagi.manshine", "barou.ubers", "hiori.bastard"],
    myBotSkill: 0.78,
    myGoalie: 0.78,
    opp: { name: "World Selection", color: "#1e1b4b", accent: "#fbbf24", variants: ["kaiser.bastard", "rin.pxg", "shidou.pxg", "karasu.pxg", "sae.n1"], rarities: ["WC", "N1"], level: 48, roll: 90, botSkill: 0.95, goalie: 0.92 },
    rewards: { gems: 1800, xp: 1000 },
    before: "c4_kaiser",
    after: "c4_kaiser_after",
    requires: "4-1",
    recommendedOvr: 100,
  },
];

export const STAGE_BY_ID: Record<string, StageDef> = Object.fromEntries(STAGES.map((s) => [s.id, s]));

export function objectiveText(o: Objective) {
  if (o.type === "goals") return `Score ${o.n} goals`;
  if (o.type === "winBy") return `Win by ${o.n}+ goals`;
  return "Win the match";
}

/** Returns 0 (failed) to 3 stars for a final score from your perspective. */
export function starsFor(o: Objective, mine: number, theirs: number) {
  let ok = false;
  let two = false;
  if (o.type === "goals") {
    ok = mine >= o.n;
    two = mine >= o.n + 2;
    return ok ? (mine >= o.n + 4 ? 3 : two ? 2 : 1) : 0;
  }
  if (o.type === "winBy") ok = mine - theirs >= o.n;
  else ok = mine > theirs;
  if (!ok) return 0;
  two = mine - theirs >= (o.type === "winBy" ? o.n + 1 : 2);
  if (two && theirs === 0) return 3;
  return two ? 2 : 1;
}

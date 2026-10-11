import type { StatKey } from "./catalog";
import type { Rarity } from "./rarity";

/** Permanent mutations rolled on characters at gacha / create time. Max 5 per player. */
export interface TraitDef {
  id: string;
  name: string;
  desc: string;
  /** Positive = buff, negative = debuff. */
  sign: 1 | -1;
  mods: Partial<Record<StatKey, number>>;
}

export const TRAITS: TraitDef[] = [
  // Positive
  { id: "fleet", name: "Fleet Foot", desc: "+Top Speed", sign: 1, mods: { speed: 6 } },
  { id: "burst", name: "Burst Start", desc: "+Acceleration", sign: 1, mods: { accel: 6 } },
  { id: "pivot", name: "Pivot Turn", desc: "+Agility", sign: 1, mods: { agility: 5 } },
  { id: "cannon", name: "Cannon Leg", desc: "+Shot Power", sign: 1, mods: { shot: 6 } },
  { id: "laser", name: "Laser Aim", desc: "+Accuracy", sign: 1, mods: { accuracy: 5 } },
  { id: "glue", name: "Glue Touch", desc: "+Ball Control", sign: 1, mods: { control: 5 } },
  { id: "thread", name: "Thread Pass", desc: "+Passing", sign: 1, mods: { passing: 5 } },
  { id: "clamp", name: "Iron Clamp", desc: "+Tackling", sign: 1, mods: { tackle: 5 } },
  { id: "tank", name: "Tank Frame", desc: "+Physical", sign: 1, mods: { physical: 5 } },
  { id: "predator", name: "Predator", desc: "+Shot and Speed", sign: 1, mods: { shot: 4, speed: 3 } },
  { id: "maestro", name: "Maestro", desc: "+Passing and Control", sign: 1, mods: { passing: 4, control: 3 } },
  { id: "shadow", name: "Shadow Step", desc: "+Accel and Agility", sign: 1, mods: { accel: 4, agility: 3 } },
  { id: "finisher", name: "Clinical", desc: "+Shot and Accuracy", sign: 1, mods: { shot: 3, accuracy: 4 } },
  { id: "engine", name: "Engine", desc: "+Speed and Physical", sign: 1, mods: { speed: 3, physical: 3 } },
  { id: "vision", name: "Wide Vision", desc: "+Passing and Accuracy", sign: 1, mods: { passing: 3, accuracy: 3 } },
  // Negative
  { id: "heavy", name: "Heavy Legs", desc: "-Top Speed", sign: -1, mods: { speed: -5 } },
  { id: "slowstart", name: "Slow Start", desc: "-Acceleration", sign: -1, mods: { accel: -5 } },
  { id: "stiff", name: "Stiff Hips", desc: "-Agility", sign: -1, mods: { agility: -4 } },
  { id: "softshot", name: "Soft Shot", desc: "-Shot Power", sign: -1, mods: { shot: -5 } },
  { id: "wild", name: "Wild Aim", desc: "-Accuracy", sign: -1, mods: { accuracy: -4 } },
  { id: "butter", name: "Butter Touch", desc: "-Ball Control", sign: -1, mods: { control: -4 } },
  { id: "loose", name: "Loose Pass", desc: "-Passing", sign: -1, mods: { passing: -4 } },
  { id: "shy", name: "Shy Tackle", desc: "-Tackling", sign: -1, mods: { tackle: -4 } },
  { id: "frail", name: "Frail Frame", desc: "-Physical", sign: -1, mods: { physical: -4 } },
  { id: "glass", name: "Glass Ankle", desc: "-Speed and Physical", sign: -1, mods: { speed: -3, physical: -3 } },
  { id: "tunnel", name: "Tunnel Vision", desc: "-Passing and Control", sign: -1, mods: { passing: -3, control: -3 } },
  { id: "rusty", name: "Rusty Edge", desc: "-Shot and Accuracy", sign: -1, mods: { shot: -3, accuracy: -3 } },
];

export const TRAIT_BY_ID: Record<string, TraitDef> = Object.fromEntries(TRAITS.map((t) => [t.id, t]));

const POS = TRAITS.filter((t) => t.sign === 1);
const NEG = TRAITS.filter((t) => t.sign === -1);

/** How many traits to roll for a rarity (hard capped at 5). */
export function traitCountRange(rarity: Rarity): [number, number] {
  const table: Record<Rarity, [number, number]> = {
    C: [0, 1],
    UC: [0, 2],
    R: [1, 2],
    E: [1, 3],
    M: [2, 3],
    L: [2, 4],
    WC: [3, 5],
    N1: [3, 5],
  };
  return table[rarity] ?? [0, 1];
}

export function resolveTraits(ids: string[]): TraitDef[] {
  return ids.map((id) => TRAIT_BY_ID[id]).filter(Boolean);
}

export function traitMods(ids: string[]): Partial<Record<StatKey, number>> {
  const out: Partial<Record<StatKey, number>> = {};
  for (const t of resolveTraits(ids)) {
    for (const [k, v] of Object.entries(t.mods) as [StatKey, number][]) {
      out[k] = (out[k] ?? 0) + v;
    }
  }
  return out;
}

/** Deterministic-friendly roller when given a randomInt(0, n) function. */
export function rollTraits(rarity: Rarity, rand: (n: number) => number): string[] {
  const [lo, hi] = traitCountRange(rarity);
  const count = Math.min(5, lo + (hi > lo ? rand(hi - lo + 1) : 0));
  if (count <= 0) return [];
  const picked: string[] = [];
  const used = new Set<string>();
  // Bias toward positives at higher rarity, but always allow some negatives.
  for (let i = 0; i < count; i++) {
    const wantPos = rand(100) < (rarity === "C" || rarity === "UC" ? 55 : rarity === "N1" || rarity === "WC" ? 70 : 60);
    const pool = (wantPos ? POS : NEG).filter((t) => !used.has(t.id));
    const fallback = TRAITS.filter((t) => !used.has(t.id));
    const list = pool.length ? pool : fallback;
    if (!list.length) break;
    const pick = list[rand(list.length)];
    used.add(pick.id);
    picked.push(pick.id);
  }
  return picked;
}

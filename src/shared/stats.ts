import {
  ARCHETYPE_INFO,
  GEAR_BY_ID,
  GEAR_SLOT_STATS,
  QUALITY_STATS,
  SKILLS,
  STAT_KEYS,
  TALENT_STATS,
  VARIANT_BY_ID,
  type StatKey,
} from "./catalog";
import type { Rarity } from "./rarity";
import type { PhysStats } from "@/game/types";
import tuningJson from "./tuning.json";

export type Tuning = typeof tuningJson;
export const DEFAULT_TUNING: Tuning = tuningJson;

export type Ratings = Record<StatKey, number>;

export interface InstanceRolls {
  level: number;
  talent: number;
  quality: number;
}

export interface GearInstanceLike {
  templateId: string;
  talent: number;
  quality: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function rollMultiplier(roll: number, min: number, max: number) {
  return min + (max - min) * (clamp(roll, 0, 100) / 100);
}

export function levelBonus(level: number, quality: number, t: Tuning) {
  const growth = t.stats.levelGrowthMax * (0.75 + 0.5 * (quality / 100));
  return growth * (1 - Math.pow(t.stats.levelDecay, Math.max(0, level - 1)));
}

export function gearPoints(g: GearInstanceLike, t: Tuning) {
  const def = GEAR_BY_ID[g.templateId];
  if (!def) return { stats: {} as Partial<Ratings>, total: 0 };
  const base = t.stats.gearPoints[def.rarity as Rarity];
  const mult = 0.7 + 0.6 * ((g.talent + g.quality) / 200);
  const pts = Math.round(base * mult * 10) / 10;
  const [a, b] = GEAR_SLOT_STATS[def.slot];
  return { stats: { [a]: pts, [b]: pts } as Partial<Ratings>, total: pts * 2 };
}

export function setBonus(gear: GearInstanceLike[], t: Tuning) {
  if (gear.length < 3) return 0;
  const defs = gear.map((g) => GEAR_BY_ID[g.templateId]).filter(Boolean);
  if (defs.length < 3) return 0;
  const slots = new Set(defs.map((d) => d.slot));
  if (slots.size < 3) return 0;
  const rarity = defs[0].rarity;
  if (!defs.every((d) => d.rarity === rarity)) return 0;
  return defs[0].named ? t.stats.namedSetBonusPct : t.stats.setBonusPct;
}

export function computeRatings(
  variantId: string,
  inst: InstanceRolls,
  gear: GearInstanceLike[],
  t: Tuning = DEFAULT_TUNING,
): Ratings {
  const vd = VARIANT_BY_ID[variantId];
  const power = t.stats.rarityPower[(vd?.rarity ?? "C") as Rarity];
  const shape = ARCHETYPE_INFO[vd?.archetype ?? "allround"].shape;
  const skill = SKILLS[vd?.skill ?? "none"];
  const tm = rollMultiplier(inst.talent, t.stats.talentMin, t.stats.talentMax);
  const qm = rollMultiplier(inst.quality, t.stats.qualityMin, t.stats.qualityMax);
  const lb = levelBonus(inst.level, inst.quality, t);
  const sb = setBonus(gear, t);
  const out = {} as Ratings;
  for (const k of STAT_KEYS) {
    const base = power + shape[k] + (skill.mods[k] ?? 0);
    const rollMult = TALENT_STATS.includes(k) ? tm : QUALITY_STATS.includes(k) ? qm : (tm + qm) / 2;
    out[k] = base * rollMult * (1 + lb);
  }
  for (const g of gear) {
    const gp = gearPoints(g, t).stats;
    for (const k of Object.keys(gp) as StatKey[]) out[k] += gp[k] ?? 0;
  }
  for (const k of STAT_KEYS) out[k] = Math.round(clamp(out[k] * (1 + sb), 1, 160) * 10) / 10;
  return out;
}

export function overall(r: Ratings) {
  const w: Record<StatKey, number> = {
    speed: 1.2,
    accel: 1.2,
    agility: 0.8,
    shot: 1.2,
    accuracy: 1,
    control: 1,
    passing: 0.9,
    tackle: 0.7,
    physical: 0.7,
  };
  let s = 0;
  let tw = 0;
  for (const k of STAT_KEYS) {
    s += r[k] * w[k];
    tw += w[k];
  }
  return Math.round(s / tw);
}

/** Converts 0-100+ ratings into engine units. All numbers are fed into the deterministic engine as-is. */
export function toPhysics(r: Ratings, t: Tuning = DEFAULT_TUNING): PhysStats {
  const p = t.stats.physics;
  const round = (x: number) => Math.round(x * 1000) / 1000;
  return {
    topSpeed: round(p.topSpeedBase + r.speed * p.topSpeedPerPoint),
    accel: round(p.accelBase + r.accel * p.accelPerPoint),
    turnRate: round(p.turnBase + r.agility * p.turnPerPoint),
    shotPower: round(p.shotBase + r.shot * p.shotPerPoint),
    accuracy: round(clamp(r.accuracy / 110, 0.2, 0.99)),
    control: round(clamp(r.control / 110, 0.2, 0.99)),
    passing: round(clamp(r.passing / 110, 0.2, 0.99)),
    tackle: round(clamp(r.tackle / 110, 0.2, 0.99)),
    chargeRate: round(p.chargeBase + r.shot * p.chargePerPoint),
    mass: round(0.8 + clamp(r.physical, 0, 130) / 130),
  };
}

export function grade(talent: number, quality: number) {
  const avg = (talent + quality) / 2;
  if (avg >= 90) return "S";
  if (avg >= 75) return "A";
  if (avg >= 55) return "B";
  if (avg >= 35) return "C";
  return "D";
}

export function isPerfect(talent: number, quality: number) {
  return talent >= 95 || quality >= 95;
}

export function estimateValue(rarity: Rarity, talent: number, quality: number, level: number, t: Tuning = DEFAULT_TUNING) {
  const base = t.economy.basePrice[rarity];
  const roll = (talent + quality) / 200;
  const mult = 0.5 + roll * roll * 2.5 + (isPerfect(talent, quality) ? 0.75 : 0);
  return Math.max(t.economy.marketMinPrice, Math.round(base * mult * (1 + 0.02 * Math.max(0, level - 1))));
}

export function levelUpCost(level: number, rarity: Rarity, t: Tuning = DEFAULT_TUNING) {
  const pr = t.progression;
  const rIdx = ["C", "UC", "R", "E", "M", "L", "WC", "N1"].indexOf(rarity);
  const coins = Math.round(pr.levelUpCoinBase * Math.pow(pr.levelUpCoinGrowth, level - 1) * (1 + rIdx * 0.35));
  const shards = Math.round(pr.levelUpShardBase * Math.pow(pr.levelUpShardGrowth, level - 1) * (1 + rIdx * 0.25));
  return { coins, shards };
}

export function accountXpForLevel(level: number, t: Tuning = DEFAULT_TUNING) {
  return Math.round(t.progression.accountXpBase * Math.pow(t.progression.accountXpGrowth, level - 1));
}

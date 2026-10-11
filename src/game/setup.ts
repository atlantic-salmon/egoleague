import { CHARACTER_BY_ID, VARIANTS, VARIANT_BY_ID } from "@/shared/catalog";
import type { Rarity } from "@/shared/rarity";
import { computeRatings, toPhysics, DEFAULT_TUNING, type GearInstanceLike, type Tuning } from "@/shared/stats";
import type { MatchPlayerDef } from "./types";

export interface RosterEntry {
  variantId: string;
  level: number;
  talent: number;
  quality: number;
  traits?: string[];
  gear?: GearInstanceLike[];
}

export function makePlayerDef(
  key: string,
  entry: RosterEntry,
  side: 0 | 1,
  human: number,
  t: Tuning = DEFAULT_TUNING,
  nameOverride?: string,
): MatchPlayerDef {
  const vd = VARIANT_BY_ID[entry.variantId] ?? VARIANT_BY_ID["isagi.base"];
  const ch = CHARACTER_BY_ID[vd.characterId];
  const ratings = computeRatings(vd.id, entry, entry.gear ?? [], t);
  return {
    key,
    name: nameOverride ?? ch.name.split(" ")[0],
    charId: vd.characterId,
    variantId: vd.id,
    skillId: vd.skill,
    kit: vd.kit,
    side,
    stats: toPhysics(ratings, t),
    human,
  };
}

function seeded(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let x = s;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic NPC roster near a rarity band and level. */
export function botRoster(seed: number, count: number, rarities: Rarity[], level: number, roll: number, exclude: string[] = []) {
  const rand = seeded(seed);
  const pool = VARIANTS.filter((v) => rarities.includes(v.rarity) && !exclude.includes(v.characterId));
  const out: RosterEntry[] = [];
  const used = new Set<string>();
  for (let i = 0; i < count; i++) {
    let pick = pool[Math.floor(rand() * pool.length)] ?? VARIANTS[0];
    for (let tries = 0; tries < 8 && used.has(pick.characterId); tries++) {
      pick = pool[Math.floor(rand() * pool.length)] ?? VARIANTS[0];
    }
    used.add(pick.characterId);
    out.push({
      variantId: pick.id,
      level,
      talent: Math.max(0, Math.min(100, Math.round(roll + (rand() - 0.5) * 20))),
      quality: Math.max(0, Math.min(100, Math.round(roll + (rand() - 0.5) * 20))),
    });
  }
  return out;
}

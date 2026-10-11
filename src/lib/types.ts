import type { Rarity } from "@/shared/rarity";
import type { Ratings } from "@/shared/stats";
import type { SkillDef, GearSlot, Archetype } from "@/shared/catalog";

export interface Profile {
  id: number;
  username: string;
  coins: number;
  gems: number;
  infiniteGems?: boolean;
  shards: number;
  xp: number;
  xpNext: number;
  level: number;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  goals: number;
  storyStars: number;
  earlyBoost: boolean;
}

export interface TraitView {
  id: string;
  name: string;
  desc: string;
  sign: 1 | -1;
}

interface ItemBase {
  id: number;
  templateId: string;
  rarity: Rarity;
  talent: number;
  quality: number;
  grade: string;
  perfect: boolean;
  level: number;
  levelCap: number;
  locked: boolean;
  lockedBy: string | null;
  value: number;
  createdAt: number;
  name: string;
  traits: TraitView[];
}

export interface CharItem extends ItemBase {
  kind: "char";
  characterId: string;
  variantLabel: string;
  archetype: Archetype;
  archetypeLabel: string;
  skill: SkillDef;
  ratings: Ratings;
  ovr: number;
  gear: { id: number; slot: GearSlot; templateId: string; rarity: Rarity }[];
}

export interface GearItem extends ItemBase {
  kind: "gear";
  slot: GearSlot;
  named: boolean;
  equippedTo: number | null;
}

export type Item = CharItem | GearItem;

export interface TeamView {
  id: number;
  name: string;
  formation: "balanced" | "attack" | "defend";
  isDefault: boolean;
  slots: (number | null)[];
  players: (CharItem | null)[];
  ovr: number;
}

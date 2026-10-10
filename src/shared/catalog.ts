import type { Rarity } from "./rarity";

export type StatKey =
  | "speed"
  | "accel"
  | "agility"
  | "shot"
  | "accuracy"
  | "control"
  | "passing"
  | "tackle"
  | "physical";

export const STAT_KEYS: StatKey[] = [
  "speed",
  "accel",
  "agility",
  "shot",
  "accuracy",
  "control",
  "passing",
  "tackle",
  "physical",
];

export const STAT_LABEL: Record<StatKey, string> = {
  speed: "Top Speed",
  accel: "Acceleration",
  agility: "Agility",
  shot: "Shot Power",
  accuracy: "Accuracy",
  control: "Ball Control",
  passing: "Passing",
  tackle: "Tackling",
  physical: "Physical",
};

/** Talent scales the ceiling stats; Quality scales the baseline stats. */
export const TALENT_STATS: StatKey[] = ["speed", "shot", "physical"];
export const QUALITY_STATS: StatKey[] = ["accel", "agility", "accuracy", "control", "passing", "tackle"];

export type Archetype =
  | "allround"
  | "explosive"
  | "slowburn"
  | "playmaker"
  | "striker"
  | "dribbler"
  | "tank";

export const ARCHETYPE_INFO: Record<Archetype, { label: string; desc: string; shape: Record<StatKey, number> }> = {
  allround: {
    label: "All-Rounder",
    desc: "Balanced in every area.",
    shape: { speed: 0, accel: 0, agility: 0, shot: 0, accuracy: 0, control: 0, passing: 0, tackle: 0, physical: 0 },
  },
  explosive: {
    label: "Explosive",
    desc: "Hits top speed almost instantly, but that top speed is modest.",
    shape: { speed: -6, accel: 14, agility: 8, shot: 0, accuracy: -2, control: 2, passing: -4, tackle: 0, physical: -6 },
  },
  slowburn: {
    label: "Slow Burn",
    desc: "Takes a long run to wind up, then nobody can catch them.",
    shape: { speed: 16, accel: -12, agility: -4, shot: 2, accuracy: 0, control: 0, passing: -2, tackle: -2, physical: 0 },
  },
  playmaker: {
    label: "Playmaker",
    desc: "Sees the whole pitch. Pinpoint passing and control.",
    shape: { speed: -2, accel: 0, agility: 4, shot: -6, accuracy: 4, control: 8, passing: 14, tackle: -4, physical: -6 },
  },
  striker: {
    label: "Striker",
    desc: "Lives in the box. Huge shots, deadly accuracy.",
    shape: { speed: 2, accel: 2, agility: 0, shot: 12, accuracy: 10, control: -2, passing: -8, tackle: -8, physical: 2 },
  },
  dribbler: {
    label: "Dribbler",
    desc: "Glues the ball to their feet and turns on a dime.",
    shape: { speed: 0, accel: 6, agility: 14, shot: -4, accuracy: -2, control: 14, passing: -2, tackle: -8, physical: -8 },
  },
  tank: {
    label: "Tank",
    desc: "Shrugs off tackles and wins every duel.",
    shape: { speed: -4, accel: -6, agility: -8, shot: 8, accuracy: -2, control: 2, passing: -4, tackle: 12, physical: 16 },
  },
};

export type HairStyle = "messy" | "bob" | "long" | "buzz" | "spiky" | "slick" | "fluffy";

export interface CharacterDef {
  id: string;
  name: string;
  hair: string;
  hairStyle: HairStyle;
  eye: string;
  skin: string;
}

export const CHARACTERS: CharacterDef[] = [
  { id: "isagi", name: "Isagi Yoichi", hair: "#1e2a4a", hairStyle: "messy", eye: "#3b82f6", skin: "#f1c9a5" },
  { id: "bachira", name: "Bachira Meguru", hair: "#facc15", hairStyle: "bob", eye: "#f59e0b", skin: "#f3cfae" },
  { id: "chigiri", name: "Chigiri Hyoma", hair: "#dc2626", hairStyle: "long", eye: "#ef4444", skin: "#f6d6bd" },
  { id: "kunigami", name: "Kunigami Rensuke", hair: "#f97316", hairStyle: "spiky", eye: "#fb923c", skin: "#e8b48f" },
  { id: "nagi", name: "Nagi Seishiro", hair: "#e5e7eb", hairStyle: "fluffy", eye: "#9ca3af", skin: "#f5d9c4" },
  { id: "reo", name: "Mikage Reo", hair: "#7c3aed", hairStyle: "slick", eye: "#a78bfa", skin: "#f1c9a5" },
  { id: "barou", name: "Barou Shoei", hair: "#111827", hairStyle: "slick", eye: "#dc2626", skin: "#d9a27c" },
  { id: "rin", name: "Itoshi Rin", hair: "#14302a", hairStyle: "slick", eye: "#10b981", skin: "#f1d1b6" },
  { id: "hiori", name: "Hiori Yo", hair: "#7dd3fc", hairStyle: "fluffy", eye: "#38bdf8", skin: "#f5d9c4" },
  { id: "kurona", name: "Kurona Ranze", hair: "#be185d", hairStyle: "bob", eye: "#f43f5e", skin: "#f1c9a5" },
  { id: "shidou", name: "Shidou Ryusei", hair: "#f9a8d4", hairStyle: "spiky", eye: "#fde047", skin: "#f3cfae" },
  { id: "karasu", name: "Karasu Tabito", hair: "#0f172a", hairStyle: "messy", eye: "#64748b", skin: "#ecc19d" },
  { id: "otoya", name: "Otoya Eita", hair: "#1e3a8a", hairStyle: "spiky", eye: "#60a5fa", skin: "#f1c9a5" },
  { id: "yukimiya", name: "Yukimiya Kenyu", hair: "#d6d3d1", hairStyle: "slick", eye: "#a8a29e", skin: "#f5d9c4" },
  { id: "gagamaru", name: "Gagamaru Gin", hair: "#292524", hairStyle: "buzz", eye: "#a3a3a3", skin: "#c68a63" },
  { id: "aryu", name: "Aryu Jyubei", hair: "#1c1917", hairStyle: "long", eye: "#f472b6", skin: "#f1c9a5" },
  { id: "raichi", name: "Raichi Jingo", hair: "#b91c1c", hairStyle: "spiky", eye: "#fca5a5", skin: "#e8b48f" },
  { id: "igaguri", name: "Igarashi Gurimu", hair: "#3f3f46", hairStyle: "buzz", eye: "#71717a", skin: "#e8b48f" },
  { id: "sae", name: "Itoshi Sae", hair: "#7f1d1d", hairStyle: "slick", eye: "#14b8a6", skin: "#f1d1b6" },
  { id: "kaiser", name: "Michael Kaiser", hair: "#fde68a", hairStyle: "slick", eye: "#2563eb", skin: "#f8e1cf" },
];

export const CHARACTER_BY_ID: Record<string, CharacterDef> = Object.fromEntries(CHARACTERS.map((c) => [c.id, c]));

export interface SkillDef {
  id: string;
  name: string;
  desc: string;
  mods: Partial<Record<StatKey, number>>;
}

export const SKILLS: Record<string, SkillDef> = {
  none: { id: "none", name: "Raw Ego", desc: "No special technique yet.", mods: {} },
  spatial: { id: "spatial", name: "Spatial Awareness", desc: "+4 Passing, +3 Accuracy.", mods: { passing: 4, accuracy: 3 } },
  direct: { id: "direct", name: "Direct Shot", desc: "+6 Shot Power, faster charge.", mods: { shot: 6 } },
  metavision: { id: "metavision", name: "Metavision", desc: "+8 Passing, +6 Accuracy, +4 Agility.", mods: { passing: 8, accuracy: 6, agility: 4 } },
  monster: { id: "monster", name: "Monster Dribble", desc: "+8 Control, +6 Agility.", mods: { control: 8, agility: 6 } },
  sprinter: { id: "sprinter", name: "Panther Legs", desc: "+10 Top Speed once wound up.", mods: { speed: 10 } },
  wildcard: { id: "wildcard", name: "Wild Card Body", desc: "+10 Physical, +4 Shot Power.", mods: { physical: 10, shot: 4 } },
  trap: { id: "trap", name: "Genius Trap", desc: "+10 Control, +4 Accuracy.", mods: { control: 10, accuracy: 4 } },
  chameleon: { id: "chameleon", name: "Chameleon", desc: "+3 to every stat.", mods: { speed: 3, accel: 3, agility: 3, shot: 3, accuracy: 3, control: 3, passing: 3, tackle: 3, physical: 3 } },
  king: { id: "king", name: "King's Shot", desc: "+10 Shot Power, +4 Physical.", mods: { shot: 10, physical: 4 } },
  destroyer: { id: "destroyer", name: "Destroyer", desc: "+8 Passing, +6 Tackling.", mods: { passing: 8, tackle: 6 } },
  devour: { id: "devour", name: "Devour", desc: "+6 Accuracy, +6 Accel, +4 Shot.", mods: { accuracy: 6, accel: 6, shot: 4 } },
  ignition: { id: "ignition", name: "Ignition", desc: "+12 Acceleration.", mods: { accel: 12 } },
  emperor: { id: "emperor", name: "Emperor Impact", desc: "+12 Shot Power, +6 Speed.", mods: { shot: 12, speed: 6 } },
  prodigy: { id: "prodigy", name: "Prodigy's Vision", desc: "+12 Passing, +8 Control.", mods: { passing: 12, control: 8 } },
  ego: { id: "ego", name: "World's #1 Ego", desc: "+8 to every attacking stat.", mods: { speed: 8, accel: 8, shot: 8, accuracy: 8, control: 8 } },
};

export interface VariantDef {
  id: string;
  characterId: string;
  label: string;
  rarity: Rarity;
  archetype: Archetype;
  skill: keyof typeof SKILLS;
  kit: string;
}

const v = (
  characterId: string,
  key: string,
  label: string,
  rarity: Rarity,
  archetype: Archetype,
  skill: keyof typeof SKILLS,
  kit: string,
): VariantDef => ({ id: `${characterId}.${key}`, characterId, label, rarity, archetype, skill, kit });

const BL = "#1d4ed8";
const TEAMZ = "#2563eb";
const U20 = "#0f172a";
const BM = "#991b1b";
const MANSHINE = "#38bdf8";
const PXG = "#1e1b4b";
const BARCHA = "#7f1d1d";
const UBERS = "#0f766e";

export const VARIANTS: VariantDef[] = [
  // Common
  v("isagi", "base", "Base", "C", "allround", "spatial", BL),
  v("bachira", "base", "Base", "C", "dribbler", "none", BL),
  v("chigiri", "base", "Base", "C", "slowburn", "none", BL),
  v("kunigami", "base", "Base", "C", "tank", "none", BL),
  v("kurona", "base", "Base", "C", "explosive", "none", BL),
  v("gagamaru", "base", "Base", "C", "tank", "none", BL),
  v("raichi", "base", "Base", "C", "explosive", "none", BL),
  v("igaguri", "base", "Base", "C", "allround", "none", BL),
  // Uncommon
  v("isagi", "teamz", "Team Z", "UC", "allround", "spatial", TEAMZ),
  v("bachira", "teamz", "Team Z", "UC", "dribbler", "monster", TEAMZ),
  v("chigiri", "teamz", "Team Z", "UC", "slowburn", "sprinter", TEAMZ),
  v("nagi", "base", "Base", "UC", "striker", "trap", BL),
  v("reo", "base", "Base", "UC", "playmaker", "none", BL),
  v("hiori", "base", "Base", "UC", "playmaker", "spatial", BL),
  v("otoya", "base", "Base", "UC", "explosive", "none", BL),
  v("aryu", "base", "Base", "UC", "tank", "none", BL),
  // Rare
  v("isagi", "second", "Second Selection", "R", "striker", "direct", BL),
  v("bachira", "monster", "Monster", "R", "dribbler", "monster", BL),
  v("nagi", "teamv", "Team V", "R", "striker", "trap", "#4c1d95"),
  v("barou", "base", "Base", "R", "tank", "king", BL),
  v("karasu", "base", "Base", "R", "playmaker", "destroyer", BL),
  v("yukimiya", "base", "Base", "R", "dribbler", "none", BL),
  v("kurona", "bastard", "Bastard München", "R", "explosive", "ignition", BM),
  v("raichi", "u20", "U-20", "R", "explosive", "ignition", U20),
  // Epic
  v("isagi", "u20", "U-20", "E", "allround", "direct", U20),
  v("bachira", "u20", "U-20", "E", "dribbler", "monster", U20),
  v("chigiri", "u20", "U-20", "E", "slowburn", "sprinter", U20),
  v("kunigami", "wildcard", "Wild Card", "E", "tank", "wildcard", "#334155"),
  v("reo", "chameleon", "Chameleon", "E", "allround", "chameleon", BL),
  v("barou", "king", "King", "E", "tank", "king", BL),
  v("rin", "base", "Base", "E", "playmaker", "destroyer", BL),
  v("otoya", "barcha", "FC Barcha", "E", "explosive", "ignition", BARCHA),
  v("yukimiya", "ubers", "Ubers", "E", "dribbler", "monster", UBERS),
  // Mythic
  v("bachira", "barcha", "FC Barcha", "M", "dribbler", "monster", BARCHA),
  v("reo", "manshine", "Manshine City", "M", "playmaker", "chameleon", MANSHINE),
  v("hiori", "bastard", "Bastard München", "M", "playmaker", "metavision", BM),
  v("karasu", "pxg", "Paris X Gen", "M", "playmaker", "destroyer", PXG),
  v("kunigami", "ace", "Wild Card Ace", "M", "tank", "wildcard", "#334155"),
  // Legendary
  v("isagi", "bastard", "Bastard München", "L", "allround", "devour", BM),
  v("chigiri", "manshine", "Manshine City", "L", "slowburn", "sprinter", MANSHINE),
  v("nagi", "u20", "U-20", "L", "striker", "trap", U20),
  v("barou", "ubers", "Ubers", "L", "tank", "king", UBERS),
  v("rin", "u20", "U-20", "L", "playmaker", "destroyer", U20),
  v("shidou", "u20", "U-20", "L", "explosive", "direct", U20),
  // World Class
  v("isagi", "meta", "Metavision Awakened", "WC", "playmaker", "metavision", BM),
  v("nagi", "manshine", "Manshine City", "WC", "striker", "trap", MANSHINE),
  v("rin", "pxg", "Paris X Gen", "WC", "striker", "destroyer", PXG),
  v("sae", "u20", "U-20 Captain", "WC", "playmaker", "prodigy", U20),
  v("kaiser", "bastard", "Bastard München", "WC", "striker", "emperor", BM),
  v("shidou", "pxg", "Paris X Gen", "WC", "explosive", "direct", PXG),
  // #1
  v("isagi", "n1", "World's #1 Egoist", "N1", "allround", "ego", "#0b1220"),
  v("rin", "n1", "Awakened Monster", "N1", "striker", "ego", "#052e2b"),
  v("sae", "n1", "Prodigy", "N1", "playmaker", "prodigy", "#3f0d12"),
  v("kaiser", "n1", "Emperor", "N1", "striker", "emperor", "#1e1b4b"),
];

export const VARIANT_BY_ID: Record<string, VariantDef> = Object.fromEntries(VARIANTS.map((x) => [x.id, x]));

export function variantName(variantId: string) {
  const vd = VARIANT_BY_ID[variantId];
  if (!vd) return variantId;
  return `${CHARACTER_BY_ID[vd.characterId]?.name ?? vd.characterId} (${vd.label})`;
}

export function variantShortName(variantId: string) {
  const vd = VARIANT_BY_ID[variantId];
  if (!vd) return variantId;
  const ch = CHARACTER_BY_ID[vd.characterId];
  return ch ? ch.name.split(" ")[0] : vd.characterId;
}

export type GearSlot = "boots" | "band" | "jersey";
export const GEAR_SLOTS: GearSlot[] = ["boots", "band", "jersey"];
export const GEAR_SLOT_LABEL: Record<GearSlot, string> = { boots: "Boots", band: "Headband", jersey: "Jersey" };
export const GEAR_SLOT_STATS: Record<GearSlot, [StatKey, StatKey]> = {
  boots: ["speed", "accel"],
  band: ["accuracy", "control"],
  jersey: ["shot", "passing"],
};

export interface GearDef {
  id: string;
  slot: GearSlot;
  rarity: Rarity;
  name: string;
  named: boolean;
}

const GEAR_NAMES: Record<GearSlot, Record<Rarity, string>> = {
  boots: {
    C: "Worn Cleats",
    UC: "Training Cleats",
    R: "Club Cleats",
    E: "Pro Cleats",
    M: "Elite Cleats",
    L: "Legend's Cleats",
    WC: "Egoist's Edge",
    N1: "Devourer Fangs",
  },
  band: {
    C: "Cotton Headband",
    UC: "Training Headband",
    R: "Club Headband",
    E: "Pro Headband",
    M: "Elite Headband",
    L: "Legend's Headband",
    WC: "Metavision Lens",
    N1: "Crown of the Striker",
  },
  jersey: {
    C: "Practice Bib",
    UC: "Training Kit",
    R: "Club Kit",
    E: "Pro Kit",
    M: "Elite Kit",
    L: "Legend's Kit",
    WC: "Blue Lock No. 11",
    N1: "World's #1 Jersey",
  },
};

export const GEAR: GearDef[] = (["boots", "band", "jersey"] as GearSlot[]).flatMap((slot) =>
  (Object.keys(GEAR_NAMES[slot]) as Rarity[]).map((rarity) => ({
    id: `${slot}.${rarity}`,
    slot,
    rarity,
    name: GEAR_NAMES[slot][rarity],
    named: rarity === "WC" || rarity === "N1",
  })),
);

export const GEAR_BY_ID: Record<string, GearDef> = Object.fromEntries(GEAR.map((g) => [g.id, g]));

export const STARTER_VARIANTS = ["isagi.base", "bachira.base", "chigiri.base", "kunigami.base", "igaguri.base"];
export const STARTER_GEAR = ["boots.C", "band.C", "jersey.C"];

/** Blue Lock Man, the hulking goalkeeper drone guarding every goal. */
export const BLUE_LOCK_MAN = {
  name: "Blue Lock Man",
  body: "#0b1a3a",
  visor: "#22d3ee",
};

export const RARITIES = ["C", "UC", "R", "E", "L", "M", "WC", "N1"] as const;
export type Rarity = (typeof RARITIES)[number];

export const RARITY_INFO: Record<
  Rarity,
  { label: string; short: string; color: string; glow: string; text: string; rainbow?: boolean }
> = {
  C: { label: "Common", short: "C", color: "#9ca3af", glow: "rgba(156,163,175,0.35)", text: "text-zinc-300" },
  UC: { label: "Uncommon", short: "UC", color: "#4ade80", glow: "rgba(74,222,128,0.4)", text: "text-green-400" },
  R: { label: "Rare", short: "R", color: "#38bdf8", glow: "rgba(56,189,248,0.45)", text: "text-sky-400" },
  E: { label: "Epic", short: "E", color: "#a78bfa", glow: "rgba(167,139,250,0.5)", text: "text-violet-400" },
  L: { label: "Legendary", short: "L", color: "#fbbf24", glow: "rgba(251,191,36,0.6)", text: "text-amber-400" },
  M: { label: "Mythic", short: "M", color: "#f472b6", glow: "rgba(244,114,182,0.55)", text: "text-pink-400" },
  WC: {
    label: "World Class",
    short: "WC",
    color: "#f97316",
    glow: "rgba(249,115,22,0.7)",
    text: "text-orange-400",
    rainbow: true,
  },
  N1: { label: "#1", short: "#1", color: "#22d3ee", glow: "rgba(34,211,238,0.85)", text: "text-cyan-300" },
};

export function rarityIndex(r: Rarity) {
  return RARITIES.indexOf(r);
}

export function isRarity(v: unknown): v is Rarity {
  return typeof v === "string" && (RARITIES as readonly string[]).includes(v);
}

/** Legendary and above (L < M < WC < N1). */
export function isLegendaryPlus(r: Rarity) {
  return rarityIndex(r) >= rarityIndex("L");
}

/** Mythic and above — unique named versions. */
export function isMythicPlus(r: Rarity) {
  return rarityIndex(r) >= rarityIndex("M");
}

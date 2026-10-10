export interface BannerDef {
  id: string;
  kind: "char" | "gear";
  name: string;
  tagline: string;
  featured: string[];
  accent: string;
}

export const BANNERS: BannerDef[] = [
  {
    id: "feat_bm",
    kind: "char",
    name: "Bastard München Scout",
    tagline: "Rate-up: Isagi (Bastard München), Kaiser, Hiori and Kurona.",
    featured: ["isagi.bastard", "kaiser.bastard", "hiori.bastard", "kurona.bastard"],
    accent: "#dc2626",
  },
  {
    id: "std_char",
    kind: "char",
    name: "Blue Lock Standard Scout",
    tagline: "Every striker in the facility, every version.",
    featured: [],
    accent: "#2563eb",
  },
  {
    id: "std_gear",
    kind: "gear",
    name: "Gear Locker",
    tagline: "Boots, headbands and kits. Named World Class and #1 pieces inside.",
    featured: [],
    accent: "#16a34a",
  },
];

export const BANNER_BY_ID: Record<string, BannerDef> = Object.fromEntries(BANNERS.map((b) => [b.id, b]));

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { all, get, run, today } from "./db";
import { DEFAULT_TUNING, accountXpForLevel, computeRatings, estimateValue, grade, isPerfect, overall, type Tuning } from "@/shared/stats";
import { GEAR_BY_ID, VARIANT_BY_ID, CHARACTER_BY_ID, ARCHETYPE_INFO, SKILLS, type GearSlot } from "@/shared/catalog";
import type { Rarity } from "@/shared/rarity";
import { QUESTS, type QuestMetric } from "@/shared/quests";
import { HttpError } from "./http";

/** Tuning is read from disk at boot so balance can change without touching code. */
function loadTuning(): Tuning {
  const p = process.env.TUNING_PATH ?? path.join(process.cwd(), "src/shared/tuning.json");
  try {
    return { ...DEFAULT_TUNING, ...JSON.parse(fs.readFileSync(p, "utf8")) };
  } catch {
    return DEFAULT_TUNING;
  }
}
export const T = loadTuning();

export interface UserRow {
  id: number;
  username: string;
  coins: number;
  gems: number;
  shards: number;
  xp: number;
  level: number;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  goals: number;
  win_streak: number;
  story_stars: number;
  flagged: number;
  created_at: number;
}

export interface ItemRow {
  id: number;
  owner_id: number;
  kind: "char" | "gear";
  template_id: string;
  rarity: Rarity;
  talent: number;
  quality: number;
  level: number;
  origin: string;
  created_at: number;
  locked_by: string | null;
  equipped_to: number | null;
  equip_slot: GearSlot | null;
}

export function getUser(id: number) {
  const u = get<UserRow>("SELECT * FROM users WHERE id = ?", id);
  if (!u) throw new HttpError(404, "User not found");
  return u;
}

export interface Delta {
  coins?: number;
  gems?: number;
  shards?: number;
}

/** Applies a currency change and writes a ledger row. Must run inside tx(). CHECK constraints reject overdrafts. */
export function applyDelta(userId: number, d: Delta, kind: string, ref?: string, meta?: unknown, itemId?: number) {
  const c = Math.trunc(d.coins ?? 0);
  const g = Math.trunc(d.gems ?? 0);
  const s = Math.trunc(d.shards ?? 0);
  if (c || g || s) {
    run("UPDATE users SET coins = coins + ?, gems = gems + ?, shards = shards + ? WHERE id = ?", c, g, s, userId);
  }
  run(
    "INSERT INTO ledger(user_id, kind, d_coins, d_gems, d_shards, item_id, ref, meta, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
    userId,
    kind,
    c,
    g,
    s,
    itemId ?? null,
    ref ?? null,
    meta === undefined ? null : JSON.stringify(meta),
    Date.now(),
  );
}

export function rewardMult(userId: number) {
  const u = getUser(userId);
  return u.level <= T.progression.earlyBoostUntilLevel ? T.progression.earlyRewardMult : 1;
}

/** Adds XP and processes level ups (each grants gems). Must run inside tx(). */
export function grantXp(userId: number, xp: number) {
  const u = getUser(userId);
  let level = u.level;
  let total = u.xp + Math.max(0, Math.round(xp));
  let gems = 0;
  while (total >= accountXpForLevel(level, T) && level < 200) {
    total -= accountXpForLevel(level, T);
    level++;
    gems += level <= T.progression.earlyBoostUntilLevel ? 150 : 60;
  }
  run("UPDATE users SET xp = ?, level = ? WHERE id = ?", total, level, userId);
  if (gems) applyDelta(userId, { gems }, "account_level", String(level));
  return { level, leveled: level - u.level, gems };
}

export function rollStat(rarity: Rarity) {
  const [lo, hi] = T.gacha.rollRanges[rarity] as [number, number];
  const a = crypto.randomInt(lo, hi + 1);
  const b = crypto.randomInt(lo, hi + 1);
  const c = crypto.randomInt(lo, hi + 1);
  return Math.round((a + b + c) / 3);
}

/** Creates an item. Characters roll Talent only; gear rolls Quality only. Must run inside tx(). */
export function createItem(ownerId: number, kind: "char" | "gear", templateId: string, origin: string) {
  const rarity = (kind === "char" ? VARIANT_BY_ID[templateId]?.rarity : GEAR_BY_ID[templateId]?.rarity) as Rarity;
  if (!rarity) throw new Error("unknown template " + templateId);
  const talent = kind === "char" ? rollStat(rarity) : 50;
  const quality = kind === "gear" ? rollStat(rarity) : 50;
  const r = run(
    "INSERT INTO items(owner_id, kind, template_id, rarity, talent, quality, level, origin, created_at) VALUES (?,?,?,?,?,?,1,?,?)",
    ownerId,
    kind,
    templateId,
    rarity,
    talent,
    quality,
    origin,
    Date.now(),
  );
  const id = Number(r.lastInsertRowid);
  applyDelta(ownerId, {}, "item_create", origin, { templateId, rarity, talent, quality }, id);
  return get<ItemRow>("SELECT * FROM items WHERE id = ?", id)!;
}

export function levelCap(rarity: Rarity) {
  return T.stats.levelCap[rarity];
}

export function gearFor(charItemId: number) {
  return all<ItemRow>("SELECT * FROM items WHERE equipped_to = ? AND kind = 'gear'", charItemId);
}

export function itemView(it: ItemRow, gear?: ItemRow[]) {
  const value = estimateValue(it.rarity, it.talent, it.quality, it.level, T, it.kind);
  const base = {
    id: it.id,
    kind: it.kind,
    templateId: it.template_id,
    rarity: it.rarity,
    talent: it.talent,
    quality: it.quality,
    grade: grade(it.talent, it.quality, it.kind),
    perfect: isPerfect(it.talent, it.quality, it.kind),
    level: it.level,
    levelCap: levelCap(it.rarity),
    locked: !!it.locked_by,
    lockedBy: it.locked_by,
    value,
    createdAt: it.created_at,
  };
  if (it.kind === "char") {
    const vd = VARIANT_BY_ID[it.template_id];
    const g = gear ?? gearFor(it.id);
    const ratings = computeRatings(
      it.template_id,
      it,
      g.map((x) => ({ templateId: x.template_id, talent: x.talent, quality: x.quality })),
      T,
    );
    return {
      ...base,
      name: `${CHARACTER_BY_ID[vd.characterId].name} (${vd.label})`,
      characterId: vd.characterId,
      variantLabel: vd.label,
      archetype: vd.archetype,
      archetypeLabel: ARCHETYPE_INFO[vd.archetype].label,
      skill: SKILLS[vd.skill],
      ratings,
      ovr: overall(ratings),
      gear: g.map((x) => ({ id: x.id, slot: x.equip_slot, templateId: x.template_id, rarity: x.rarity })),
    };
  }
  const gd = GEAR_BY_ID[it.template_id];
  return { ...base, name: gd.name, slot: gd.slot, named: gd.named, equippedTo: it.equipped_to };
}

export type ItemView = ReturnType<typeof itemView>;

export function ownedItem(userId: number, itemId: number, opts: { unlocked?: boolean; kind?: "char" | "gear" } = {}) {
  const it = get<ItemRow>("SELECT * FROM items WHERE id = ?", itemId);
  if (!it || it.owner_id !== userId) throw new HttpError(404, "You don't own that item");
  if (opts.kind && it.kind !== opts.kind) throw new HttpError(400, "Wrong item type");
  if (opts.unlocked && it.locked_by) throw new HttpError(409, "That item is locked in a trade or market listing");
  return it;
}

/** Moves an item to a new owner, clearing locks and equipment links. Must run inside tx(). */
export function transferItem(itemId: number, fromId: number, toId: number, ref: string) {
  const r = run(
    "UPDATE items SET owner_id = ?, locked_by = NULL, equipped_to = NULL, equip_slot = NULL WHERE id = ? AND owner_id = ?",
    toId,
    itemId,
    fromId,
  );
  if (Number(r.changes) !== 1) throw new HttpError(409, "Item ownership changed, transaction cancelled");
  run("UPDATE items SET equipped_to = NULL, equip_slot = NULL WHERE equipped_to = ?", itemId);
  removeFromTeams(fromId, itemId);
  applyDelta(fromId, {}, "item_out", ref, { to: toId }, itemId);
  applyDelta(toId, {}, "item_in", ref, { from: fromId }, itemId);
}

export function removeFromTeams(userId: number, itemId: number) {
  const teams = all<{ id: number; slots: string }>("SELECT id, slots FROM teams WHERE user_id = ?", userId);
  for (const t of teams) {
    const slots = JSON.parse(t.slots) as (number | null)[];
    if (slots.includes(itemId)) {
      run("UPDATE teams SET slots = ? WHERE id = ?", JSON.stringify(slots.map((s) => (s === itemId ? null : s))), t.id);
    }
  }
}

export function bumpCounter(userId: number, key: string, by = 1) {
  run(
    "INSERT INTO daily_counters(user_id, day, key, count) VALUES (?,?,?,?) ON CONFLICT(user_id, day, key) DO UPDATE SET count = count + excluded.count",
    userId,
    today(),
    key,
    by,
  );
  return get<{ count: number }>("SELECT count FROM daily_counters WHERE user_id = ? AND day = ? AND key = ?", userId, today(), key)!.count;
}

export function getCounter(userId: number, key: string) {
  return get<{ count: number }>("SELECT count FROM daily_counters WHERE user_id = ? AND day = ? AND key = ?", userId, today(), key)?.count ?? 0;
}

/** Records verified progress toward any quest that tracks this metric. */
export function questEvent(userId: number, metric: QuestMetric, amount = 1) {
  if (amount <= 0) return;
  for (const q of QUESTS) {
    if (q.metric !== metric) continue;
    const period = q.period === "daily" ? today() : "life";
    run(
      `INSERT INTO quest_progress(user_id, quest_id, period, progress, claimed) VALUES (?,?,?,?,0)
       ON CONFLICT(user_id, quest_id, period) DO UPDATE SET progress = MIN(?, progress + excluded.progress)`,
      userId,
      q.id,
      period,
      Math.min(q.target, amount),
      q.target,
    );
  }
}

export function flag(userId: number, reason: string, meta?: unknown) {
  run("INSERT INTO flags(user_id, reason, meta, created_at) VALUES (?,?,?,?)", userId, reason, meta ? JSON.stringify(meta) : null, Date.now());
  run("UPDATE users SET flagged = flagged + 1 WHERE id = ?", userId);
}

export function publicProfile(u: UserRow) {
  return {
    id: u.id,
    username: u.username,
    coins: u.coins,
    gems: u.gems,
    shards: u.shards,
    xp: u.xp,
    xpNext: accountXpForLevel(u.level, T),
    level: u.level,
    rating: u.rating,
    wins: u.wins,
    losses: u.losses,
    draws: u.draws,
    goals: u.goals,
    storyStars: u.story_stars,
    earlyBoost: u.level <= T.progression.earlyBoostUntilLevel,
  };
}

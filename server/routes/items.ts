import crypto from "node:crypto";
import { z } from "zod";
import { route, fail } from "../http";
import { all, get, run, tx } from "../db";
import {
  T,
  applyDelta,
  createItem,
  getUser,
  gearFor,
  itemView,
  levelCap,
  ownedItem,
  publicProfile,
  questEvent,
  removeFromTeams,
  type ItemRow,
} from "../economy";
import { BANNERS, BANNER_BY_ID } from "@/shared/banners";
import { GEAR, GEAR_BY_ID, VARIANTS, type GearSlot } from "@/shared/catalog";
import { RARITIES, rarityIndex, type Rarity } from "@/shared/rarity";
import { levelUpCost } from "@/shared/stats";
import type { RosterEntry } from "@/game/setup";

function rand01() {
  return crypto.randomInt(0, 1_000_000_000) / 1_000_000_000;
}

function rollRarity(minIdx: number): Rarity {
  const pool = RARITIES.filter((r) => rarityIndex(r) >= minIdx);
  const total = pool.reduce((s, r) => s + T.gacha.rates[r], 0);
  let x = rand01() * total;
  for (const r of pool) {
    x -= T.gacha.rates[r];
    if (x < 0) return r;
  }
  return pool[pool.length - 1];
}

function pickTemplate(bannerId: string, rarity: Rarity) {
  const b = BANNER_BY_ID[bannerId];
  if (b.kind === "gear") {
    const opts = GEAR.filter((g) => g.rarity === rarity);
    return opts[crypto.randomInt(0, opts.length)].id;
  }
  const featured = VARIANTS.filter((v) => v.rarity === rarity && b.featured.includes(v.id));
  if (featured.length && rand01() < T.gacha.featuredShare) return featured[crypto.randomInt(0, featured.length)].id;
  const opts = VARIANTS.filter((v) => v.rarity === rarity);
  return opts[crypto.randomInt(0, opts.length)].id;
}

route("GET", "/gacha", {}, ({ user }) => {
  const pity = all<{ banner_id: string; since_l: number; since_n1: number; total: number }>(
    "SELECT banner_id, since_l, since_n1, total FROM pity WHERE user_id = ?",
    user.id,
  );
  return {
    banners: BANNERS.map((b) => {
      const p = pity.find((x) => x.banner_id === b.id);
      return {
        ...b,
        pity: {
          sinceL: p?.since_l ?? 0,
          sinceN1: p?.since_n1 ?? 0,
          total: p?.total ?? 0,
          hardL: T.gacha.pityLegendaryPlus,
          hardN1: T.gacha.pityN1,
        },
      };
    }),
  };
});

route(
  "POST",
  "/gacha/pull",
  { body: z.object({ bannerId: z.string().max(32), count: z.union([z.literal(1), z.literal(10)]) }), rate: [12, 10_000], idempotent: true },
  ({ user, body }) => {
    const banner = BANNER_BY_ID[body.bannerId];
    if (!banner) fail(404, "Banner not found");
    const cost = body.count === 10 ? T.gacha.tenPullCostGems : T.gacha.pullCostGems * body.count;
    const pullId = crypto.randomUUID();
    const items = tx(() => {
      const me = getUser(user.id);
      if (me.gems < cost) fail(400, "Not enough gems");
      applyDelta(user.id, { gems: -cost }, "gacha_pull", pullId, { banner: banner.id, count: body.count });
      run("INSERT OR IGNORE INTO pity(user_id, banner_id) VALUES (?,?)", user.id, banner.id);
      const p = get<{ since_l: number; since_n1: number }>(
        "SELECT since_l, since_n1 FROM pity WHERE user_id = ? AND banner_id = ?",
        user.id,
        banner.id,
      )!;
      let sinceL = p.since_l;
      let sinceN1 = p.since_n1;
      const out: ItemRow[] = [];
      for (let i = 0; i < body.count; i++) {
        sinceL++;
        sinceN1++;
        let rarity: Rarity;
        if (sinceN1 >= T.gacha.pityN1) rarity = "N1";
        else if (sinceL >= T.gacha.pityLegendaryPlus) rarity = rollRarity(rarityIndex("L"));
        else if (body.count === 10 && i === 9 && out.every((x) => rarityIndex(x.rarity) < rarityIndex("R"))) rarity = rollRarity(rarityIndex("R"));
        else rarity = rollRarity(0);
        if (rarityIndex(rarity) >= rarityIndex("L")) sinceL = 0;
        if (rarity === "N1") sinceN1 = 0;
        const tpl = pickTemplate(banner.id, rarity);
        out.push(createItem(user.id, banner.kind, tpl, `gacha:${banner.id}`));
      }
      run(
        "UPDATE pity SET since_l = ?, since_n1 = ?, total = total + ? WHERE user_id = ? AND banner_id = ?",
        sinceL,
        sinceN1,
        body.count,
        user.id,
        banner.id,
      );
      questEvent(user.id, "pulls", body.count);
      return out;
    });
    return { items: items.map((it) => itemView(it, [])), user: publicProfile(getUser(user.id)) };
  },
);

route("GET", "/collection", {}, ({ user }) => {
  const rows = all<ItemRow>("SELECT * FROM items WHERE owner_id = ? ORDER BY id DESC", user.id);
  const gearByChar = new Map<number, ItemRow[]>();
  for (const r of rows) {
    if (r.kind === "gear" && r.equipped_to != null) {
      const arr = gearByChar.get(r.equipped_to) ?? [];
      arr.push(r);
      gearByChar.set(r.equipped_to, arr);
    }
  }
  return { items: rows.map((r) => itemView(r, r.kind === "char" ? (gearByChar.get(r.id) ?? []) : undefined)) };
});

const idParam = (s: string) => {
  const n = Number(s);
  if (!Number.isSafeInteger(n) || n <= 0) fail(400, "Bad id");
  return n;
};

route("POST", "/items/:id/levelup", { rate: [30, 10_000], idempotent: true }, ({ user, params }) => {
  const id = idParam(params.id);
  const result = tx(() => {
    const it = ownedItem(user.id, id, { unlocked: true });
    if (it.level >= levelCap(it.rarity)) fail(400, "Already at max level for this rarity");
    const cost = levelUpCost(it.level, it.rarity, T);
    const me = getUser(user.id);
    if (me.gems < cost.gems) fail(400, `Need ${cost.gems} gems`);
    applyDelta(user.id, { gems: -cost.gems }, "level_up", String(it.level + 1), null, it.id);
    run("UPDATE items SET level = level + 1 WHERE id = ? AND owner_id = ?", it.id, user.id);
    questEvent(user.id, "levelups", 1);
    return get<ItemRow>("SELECT * FROM items WHERE id = ?", it.id)!;
  });
  return { item: itemView(result), user: publicProfile(getUser(user.id)) };
});

route("GET", "/items/:id/cost", {}, ({ user, params }) => {
  const it = ownedItem(user.id, idParam(params.id));
  const value = estimateMarket(it);
  return {
    cost: levelUpCost(it.level, it.rarity, T),
    maxed: it.level >= levelCap(it.rarity),
    gemsOnDismantle: dismantleValue(it),
    instantSell: Math.max(1, Math.floor((value * T.economy.instantSellPct) / 100)),
    marketValue: value,
  };
});

function dismantleValue(it: ItemRow) {
  return Math.round(T.progression.gemsFromRarity[it.rarity] * (1 + (it.level - 1) * 0.15));
}

function estimateMarket(it: ItemRow) {
  return itemView(it).value;
}

route("POST", "/items/:id/dismantle", { rate: [30, 10_000], idempotent: true }, ({ user, params }) => {
  const id = idParam(params.id);
  const gems = tx(() => {
    const it = ownedItem(user.id, id, { unlocked: true });
    const count = get<{ n: number }>("SELECT COUNT(*) AS n FROM items WHERE owner_id = ? AND kind = 'char'", user.id)!.n;
    if (it.kind === "char" && count <= 1) fail(400, "You need at least one player");
    const g = dismantleValue(it);
    run("UPDATE items SET equipped_to = NULL, equip_slot = NULL WHERE equipped_to = ?", it.id);
    removeFromTeams(user.id, it.id);
    applyDelta(user.id, { gems: g }, "dismantle", it.template_id, { rarity: it.rarity, talent: it.talent, quality: it.quality }, it.id);
    run("DELETE FROM items WHERE id = ? AND owner_id = ?", it.id, user.id);
    return g;
  });
  return { gems, user: publicProfile(getUser(user.id)) };
});

/** Instant sell for 50% of estimated market value in gems. */
route("POST", "/items/:id/sell", { rate: [30, 10_000], idempotent: true }, ({ user, params }) => {
  const id = idParam(params.id);
  const out = tx(() => {
    const it = ownedItem(user.id, id, { unlocked: true });
    if (it.kind === "char") {
      const count = get<{ n: number }>("SELECT COUNT(*) AS n FROM items WHERE owner_id = ? AND kind = 'char'", user.id)!.n;
      if (count <= 1) fail(400, "Keep at least one player");
    }
    const value = estimateMarket(it);
    const gems = Math.max(1, Math.floor((value * T.economy.instantSellPct) / 100));
    run("UPDATE items SET equipped_to = NULL, equip_slot = NULL WHERE equipped_to = ?", it.id);
    removeFromTeams(user.id, it.id);
    applyDelta(user.id, { gems }, "instant_sell", it.template_id, { value, pct: T.economy.instantSellPct }, it.id);
    run("DELETE FROM items WHERE id = ? AND owner_id = ?", it.id, user.id);
    questEvent(user.id, "market", 1);
    return gems;
  });
  return { gems: out, user: publicProfile(getUser(user.id)) };
});

route(
  "POST",
  "/items/:id/equip",
  { body: z.object({ slot: z.enum(["boots", "band", "jersey"]), gearId: z.number().int().positive().nullable() }), rate: [40, 10_000] },
  ({ user, params, body }) => {
    const charId = idParam(params.id);
    tx(() => {
      const ch = ownedItem(user.id, charId, { unlocked: true, kind: "char" });
      run("UPDATE items SET equipped_to = NULL, equip_slot = NULL WHERE equipped_to = ? AND equip_slot = ?", ch.id, body.slot);
      if (body.gearId != null) {
        const g = ownedItem(user.id, body.gearId, { unlocked: true, kind: "gear" });
        if (GEAR_BY_ID[g.template_id].slot !== (body.slot as GearSlot)) fail(400, "That gear doesn't fit this slot");
        run("UPDATE items SET equipped_to = ?, equip_slot = ? WHERE id = ?", ch.id, body.slot, g.id);
      }
    });
    const ch = ownedItem(user.id, charId);
    return { item: itemView(ch, gearFor(ch.id)) };
  },
);

/* Teams */

const teamBody = z.object({
  name: z.string().trim().min(1).max(24),
  formation: z.enum(["balanced", "attack", "defend"]),
  slots: z.array(z.number().int().positive().nullable()).max(5),
});

function validateSlots(userId: number, slots: (number | null)[]) {
  const ids = slots.filter((x): x is number => x != null);
  if (new Set(ids).size !== ids.length) fail(400, "A player can only appear once per team");
  const chars = new Set<string>();
  for (const id of ids) {
    const it = ownedItem(userId, id, { kind: "char" });
    if (it.locked_by) fail(409, "Locked players can't join a team");
    const ch = it.template_id.split(".")[0];
    if (chars.has(ch)) fail(400, "Only one version of each character per team");
    chars.add(ch);
  }
}

function teamView(t: { id: number; name: string; formation: string; slots: string; is_default: number }, userId: number) {
  const slots = JSON.parse(t.slots) as (number | null)[];
  const players = slots.map((id) => {
    if (id == null) return null;
    const it = get<ItemRow>("SELECT * FROM items WHERE id = ? AND owner_id = ?", id, userId);
    return it ? itemView(it) : null;
  });
  const valid = players.filter(Boolean) as ReturnType<typeof itemView>[];
  const ovr = valid.length ? Math.round(valid.reduce((s, p) => s + ("ovr" in p ? p.ovr : 0), 0) / valid.length) : 0;
  return { id: t.id, name: t.name, formation: t.formation, isDefault: !!t.is_default, slots, players, ovr };
}

route("GET", "/teams", {}, ({ user }) => {
  const rows = all<{ id: number; name: string; formation: string; slots: string; is_default: number }>(
    "SELECT * FROM teams WHERE user_id = ? ORDER BY is_default DESC, id",
    user.id,
  );
  return { teams: rows.map((t) => teamView(t, user.id)) };
});

route("POST", "/teams", { body: teamBody, rate: [20, 60_000] }, ({ user, body }) => {
  const n = get<{ n: number }>("SELECT COUNT(*) AS n FROM teams WHERE user_id = ?", user.id)!.n;
  if (n >= 8) fail(400, "You can save up to 8 teams");
  validateSlots(user.id, body.slots);
  const r = run(
    "INSERT INTO teams(user_id, name, formation, slots, is_default, created_at) VALUES (?,?,?,?,?,?)",
    user.id,
    body.name,
    body.formation,
    JSON.stringify(body.slots),
    n === 0 ? 1 : 0,
    Date.now(),
  );
  return { id: Number(r.lastInsertRowid) };
});

route("PUT", "/teams/:id", { body: teamBody }, ({ user, params, body }) => {
  const id = idParam(params.id);
  validateSlots(user.id, body.slots);
  const r = run(
    "UPDATE teams SET name = ?, formation = ?, slots = ? WHERE id = ? AND user_id = ?",
    body.name,
    body.formation,
    JSON.stringify(body.slots),
    id,
    user.id,
  );
  if (Number(r.changes) !== 1) fail(404, "Team not found");
  return { ok: true };
});

route("POST", "/teams/:id/default", {}, ({ user, params }) => {
  const id = idParam(params.id);
  tx(() => {
    if (!get("SELECT id FROM teams WHERE id = ? AND user_id = ?", id, user.id)) fail(404, "Team not found");
    run("UPDATE teams SET is_default = (id = ?) WHERE user_id = ?", id, user.id);
  });
  return { ok: true };
});

route("DELETE", "/teams/:id", {}, ({ user, params }) => {
  const id = idParam(params.id);
  const n = get<{ n: number }>("SELECT COUNT(*) AS n FROM teams WHERE user_id = ?", user.id)!.n;
  if (n <= 1) fail(400, "Keep at least one team");
  run("DELETE FROM teams WHERE id = ? AND user_id = ?", id, user.id);
  run(
    "UPDATE teams SET is_default = 1 WHERE id = (SELECT id FROM teams WHERE user_id = ? ORDER BY id LIMIT 1) AND NOT EXISTS (SELECT 1 FROM teams WHERE user_id = ? AND is_default = 1)",
    user.id,
    user.id,
  );
  return { ok: true };
});

export type { RosterEntry };

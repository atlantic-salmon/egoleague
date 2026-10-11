import { z } from "zod";
import { route, fail } from "../http";
import { all, get, run, tx, today } from "../db";
import { T, applyDelta, flag, getUser, itemView, ownedItem, publicProfile, questEvent, removeFromTeams, transferItem, type ItemRow } from "../economy";
import { grade as gradeRoll } from "@/shared/stats";
import { RARITIES, isRarity } from "@/shared/rarity";
import { onlineUsers, lobbyForUser } from "../rooms";

const idParam = (s: string) => {
  const n = Number(s);
  if (!Number.isSafeInteger(n) || n <= 0) fail(400, "Bad id");
  return n;
};

function pairKey(a: number, b: number) {
  return a < b ? `pair:${a}:${b}` : `pair:${b}:${a}`;
}

/** Counts transfers between the same two accounts per day to catch alt-account farming. */
function checkPair(a: number, b: number) {
  const key = pairKey(a, b);
  run(
    "INSERT INTO daily_counters(user_id, day, key, count) VALUES (0, ?, ?, 1) ON CONFLICT(user_id, day, key) DO UPDATE SET count = count + 1",
    today(),
    key,
  );
  const n = get<{ count: number }>("SELECT count FROM daily_counters WHERE user_id = 0 AND day = ? AND key = ?", today(), key)!.count;
  if (n > T.antiCheat.maxTradesPerPairPerDay) {
    flag(a, "pair_farming", { with: b, n });
    flag(b, "pair_farming", { with: a, n });
    fail(429, "Too many trades between the same two players today");
  }
}

/* Market */

route("GET", "/market", { auth: false }, ({ url }) => {
  const kind = url.searchParams.get("kind");
  const rarity = url.searchParams.get("rarity");
  const sort = url.searchParams.get("sort") ?? "newest";
  const minGrade = url.searchParams.get("grade");
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase().slice(0, 32);
  const page = Math.max(0, Math.min(50, Number(url.searchParams.get("page") ?? 0) | 0));
  const where: string[] = ["l.status = 'active'"];
  const params: (string | number)[] = [];
  if (kind === "char" || kind === "gear") {
    where.push("i.kind = ?");
    params.push(kind);
  }
  if (rarity && isRarity(rarity)) {
    where.push("i.rarity = ?");
    params.push(rarity);
  }
  if (minGrade && ["S", "A", "B", "C"].includes(minGrade)) {
    const th = { S: 90, A: 75, B: 55, C: 35 }[minGrade as "S"]!;
    where.push("(i.talent + i.quality) / 2.0 >= ?");
    params.push(th);
  }
  if (q && /^[a-z0-9 ._'-]+$/.test(q)) {
    where.push("i.template_id LIKE ?");
    params.push(`%${q.split(" ")[0]}%`);
  }
  const order =
    sort === "price_asc"
      ? "l.price ASC"
      : sort === "price_desc"
        ? "l.price DESC"
        : sort === "talent"
          ? "i.talent DESC"
          : sort === "quality"
            ? "i.quality DESC"
            : sort === "rarity"
              ? `CASE i.rarity ${RARITIES.map((r, i) => `WHEN '${r}' THEN ${i}`).join(" ")} END DESC`
              : "l.created_at DESC";
  const rows = all<ItemRow & { listing_id: number; price: number; seller: string; seller_id: number; listed_at: number }>(
    `SELECT i.*, l.id AS listing_id, l.price, l.created_at AS listed_at, u.username AS seller, u.id AS seller_id
     FROM listings l JOIN items i ON i.id = l.item_id JOIN users u ON u.id = l.seller_id
     WHERE ${where.join(" AND ")} ORDER BY ${order} LIMIT 30 OFFSET ?`,
    ...params,
    page * 30,
  );
  return {
    listings: rows.map((r) => ({ id: r.listing_id, price: r.price, seller: r.seller, sellerId: r.seller_id, listedAt: r.listed_at, item: itemView(r) })),
    page,
  };
});

route("GET", "/market/mine", {}, ({ user }) => {
  const rows = all<ItemRow & { listing_id: number; price: number; listed_at: number }>(
    `SELECT i.*, l.id AS listing_id, l.price, l.created_at AS listed_at FROM listings l JOIN items i ON i.id = l.item_id
     WHERE l.seller_id = ? AND l.status = 'active' ORDER BY l.created_at DESC`,
    user.id,
  );
  return { listings: rows.map((r) => ({ id: r.listing_id, price: r.price, listedAt: r.listed_at, item: itemView(r) })) };
});

route("GET", "/market/history/:templateId", { auth: false }, ({ params }) => {
  const rows = all<{ price: number; talent: number; quality: number; created_at: number }>(
    "SELECT price, talent, quality, created_at FROM sales WHERE template_id = ? ORDER BY created_at DESC LIMIT 30",
    params.templateId.slice(0, 40),
  );
  const avg = rows.length ? Math.round(rows.reduce((s, r) => s + r.price, 0) / rows.length) : null;
  return { sales: rows.map((r) => ({ ...r, grade: gradeRoll(r.talent, r.quality) })), avg };
});

route(
  "POST",
  "/market/list",
  { body: z.object({ itemId: z.number().int().positive(), price: z.number().int().positive() }), rate: [20, 60_000], idempotent: true },
  ({ user, body }) => {
    if (body.price < T.economy.marketMinPrice || body.price > T.economy.marketMaxPrice) {
      fail(400, `Price must be between ${T.economy.marketMinPrice} and ${T.economy.marketMaxPrice}`);
    }
    const fee = Math.max(T.economy.marketListingFeeMin, Math.floor((body.price * T.economy.marketListingFeePct) / 100));
    const active = get<{ n: number }>("SELECT COUNT(*) AS n FROM listings WHERE seller_id = ? AND status = 'active'", user.id)!.n;
    if (active >= 20) fail(400, "You can have at most 20 active listings");
    const id = tx(() => {
      const it = ownedItem(user.id, body.itemId, { unlocked: true });
      if (it.kind === "char") {
        const chars = get<{ n: number }>("SELECT COUNT(*) AS n FROM items WHERE owner_id = ? AND kind = 'char' AND locked_by IS NULL", user.id)!.n;
        if (chars <= 1) fail(400, "Keep at least one player you can play with");
      }
      applyDelta(user.id, { gems: -fee }, "market_fee", String(it.id), { price: body.price }, it.id);
      const r = run(
        "INSERT INTO listings(seller_id, item_id, price, fee, status, created_at) VALUES (?,?,?,?, 'active', ?)",
        user.id,
        it.id,
        body.price,
        fee,
        Date.now(),
      );
      const lid = Number(r.lastInsertRowid);
      run("UPDATE items SET equipped_to = NULL, equip_slot = NULL WHERE equipped_to = ?", it.id);
      run("UPDATE items SET locked_by = ?, equipped_to = NULL, equip_slot = NULL WHERE id = ?", `listing:${lid}`, it.id);
      removeFromTeams(user.id, it.id);
      return lid;
    });
    return { id, fee, user: publicProfile(getUser(user.id)) };
  },
);

route("POST", "/market/:id/buy", { rate: [20, 10_000], idempotent: true }, ({ user, params }) => {
  const lid = idParam(params.id);
  const out = tx(() => {
    const l = get<{ id: number; seller_id: number; item_id: number; price: number; status: string }>("SELECT * FROM listings WHERE id = ?", lid);
    if (!l || l.status !== "active") fail(410, "That listing is no longer available");
    if (l!.seller_id === user.id) fail(400, "You can't buy your own listing");
    const buyer = getUser(user.id);
    if (buyer.gems < l!.price) fail(400, "Not enough gems");
    const it = get<ItemRow>("SELECT * FROM items WHERE id = ?", l!.item_id);
    if (!it || it.owner_id !== l!.seller_id || it.locked_by !== `listing:${l!.id}`) fail(409, "Listing is invalid");
    checkPair(user.id, l!.seller_id);
    const tax = Math.floor((l!.price * T.economy.marketTaxPct) / 100);
    applyDelta(user.id, { gems: -l!.price }, "market_buy", `listing:${l!.id}`, null, it!.id);
    applyDelta(l!.seller_id, { gems: l!.price - tax }, "market_sale", `listing:${l!.id}`, { tax }, it!.id);
    transferItem(it!.id, l!.seller_id, user.id, `listing:${l!.id}`);
    const r = run("UPDATE listings SET status = 'sold', buyer_id = ?, closed_at = ? WHERE id = ? AND status = 'active'", user.id, Date.now(), l!.id);
    if (Number(r.changes) !== 1) fail(409, "Listing changed, try again");
    run(
      "INSERT INTO sales(item_id, template_id, rarity, talent, quality, price, seller_id, buyer_id, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
      it!.id,
      it!.template_id,
      it!.rarity,
      it!.talent,
      it!.quality,
      l!.price,
      l!.seller_id,
      user.id,
      Date.now(),
    );
    questEvent(user.id, "market", 1);
    questEvent(l!.seller_id, "market", 1);
    return get<ItemRow>("SELECT * FROM items WHERE id = ?", it!.id)!;
  });
  return { item: itemView(out), user: publicProfile(getUser(user.id)) };
});

route("POST", "/market/:id/cancel", { rate: [20, 10_000] }, ({ user, params }) => {
  const lid = idParam(params.id);
  tx(() => {
    const l = get<{ id: number; seller_id: number; item_id: number; status: string }>("SELECT * FROM listings WHERE id = ?", lid);
    if (!l || l.seller_id !== user.id) fail(404, "Listing not found");
    if (l!.status !== "active") fail(410, "Listing already closed");
    run("UPDATE listings SET status = 'cancelled', closed_at = ? WHERE id = ?", Date.now(), l!.id);
    run("UPDATE items SET locked_by = NULL WHERE id = ? AND locked_by = ?", l!.item_id, `listing:${l!.id}`);
  });
  return { ok: true };
});

/* Trades */

const ids = z.array(z.number().int().positive()).max(6);

route(
  "POST",
  "/trades",
  {
    body: z.object({
      to: z.string().trim().min(3).max(16),
      offerItems: ids,
      offerCoins: z.number().int().min(0).max(0).optional().default(0),
      requestItems: ids,
      requestCoins: z.number().int().min(0).max(0).optional().default(0),
    }),
    rate: [10, 60_000],
    idempotent: true,
  },
  ({ user, body }) => {
    const to = get<{ id: number }>("SELECT id FROM users WHERE username = ?", body.to);
    if (!to) fail(404, "No player with that username");
    if (to!.id === user.id) fail(400, "You can't trade with yourself");
    if (!body.offerItems.length && !body.requestItems.length) fail(400, "A trade needs at least one item");
    if (new Set(body.offerItems).size !== body.offerItems.length || new Set(body.requestItems).size !== body.requestItems.length) fail(400, "Duplicate items");
    const pending = get<{ n: number }>("SELECT COUNT(*) AS n FROM trades WHERE from_id = ? AND status = 'pending'", user.id)!.n;
    if (pending >= 10) fail(400, "You have too many pending trades");
    const id = tx(() => {
      for (const iid of body.offerItems) ownedItem(user.id, iid, { unlocked: true });
      for (const iid of body.requestItems) ownedItem(to!.id, iid, { unlocked: true });
      const r = run(
        "INSERT INTO trades(from_id, to_id, offer_items, offer_coins, request_items, request_coins, status, created_at) VALUES (?,?,?,?,?,?, 'pending', ?)",
        user.id,
        to!.id,
        JSON.stringify(body.offerItems),
        0,
        JSON.stringify(body.requestItems),
        0,
        Date.now(),
      );
      const tid = Number(r.lastInsertRowid);
      for (const iid of body.offerItems) {
        run("UPDATE items SET equipped_to = NULL, equip_slot = NULL WHERE equipped_to = ?", iid);
        run("UPDATE items SET locked_by = ?, equipped_to = NULL, equip_slot = NULL WHERE id = ?", `trade:${tid}`, iid);
        removeFromTeams(user.id, iid);
      }
      return tid;
    });
    return { id };
  },
);

interface TradeRow {
  id: number;
  from_id: number;
  to_id: number;
  offer_items: string;
  offer_coins: number;
  request_items: string;
  request_coins: number;
  status: string;
  created_at: number;
  closed_at: number | null;
}

function releaseTrade(t: TradeRow, status: "declined" | "cancelled" | "failed") {
  run("UPDATE trades SET status = ?, closed_at = ? WHERE id = ? AND status = 'pending'", status, Date.now(), t.id);
  run("UPDATE items SET locked_by = NULL WHERE locked_by = ?", `trade:${t.id}`);
  void t.offer_coins;
}

function tradeView(t: TradeRow) {
  const load = (list: string) =>
    (JSON.parse(list) as number[]).map((id) => {
      const it = get<ItemRow>("SELECT * FROM items WHERE id = ?", id);
      return it ? itemView(it) : null;
    });
  return {
    id: t.id,
    from: get<{ username: string }>("SELECT username FROM users WHERE id = ?", t.from_id)?.username,
    to: get<{ username: string }>("SELECT username FROM users WHERE id = ?", t.to_id)?.username,
    fromId: t.from_id,
    toId: t.to_id,
    offerItems: load(t.offer_items),
    offerCoins: t.offer_coins,
    requestItems: load(t.request_items),
    requestCoins: t.request_coins,
    status: t.status,
    createdAt: t.created_at,
  };
}

route("GET", "/trades", {}, ({ user }) => {
  const rows = all<TradeRow>("SELECT * FROM trades WHERE (from_id = ? OR to_id = ?) ORDER BY created_at DESC LIMIT 50", user.id, user.id);
  return { trades: rows.map(tradeView) };
});

route("POST", "/trades/:id/accept", { rate: [10, 10_000], idempotent: true }, ({ user, params }) => {
  const tid = idParam(params.id);
  tx(() => {
    const t = get<TradeRow>("SELECT * FROM trades WHERE id = ?", tid);
    if (!t || t.to_id !== user.id) fail(404, "Trade not found");
    if (t!.status !== "pending") fail(410, "Trade is no longer pending");
    const offer = JSON.parse(t!.offer_items) as number[];
    const request = JSON.parse(t!.request_items) as number[];
    for (const iid of offer) {
      const it = get<ItemRow>("SELECT * FROM items WHERE id = ?", iid);
      if (!it || it.owner_id !== t!.from_id || it.locked_by !== `trade:${t!.id}`) fail(409, "Offered items are no longer available");
    }
    for (const iid of request) ownedItem(user.id, iid, { unlocked: true });
    const isChar = (iid: number) => get<{ kind: string }>("SELECT kind FROM items WHERE id = ?", iid)?.kind === "char";
    const myChars = get<{ n: number }>("SELECT COUNT(*) AS n FROM items WHERE owner_id = ? AND kind = 'char' AND locked_by IS NULL", user.id)!.n;
    if (myChars - request.filter(isChar).length + offer.filter(isChar).length < 1) fail(400, "You'd be left with no players");
    const theirChars = get<{ n: number }>("SELECT COUNT(*) AS n FROM items WHERE owner_id = ? AND kind = 'char' AND locked_by IS NULL", t!.from_id)!.n;
    if (theirChars + request.filter(isChar).length < 1) fail(400, "The other player would be left with no players");
    checkPair(t!.from_id, t!.to_id);
    for (const iid of offer) transferItem(iid, t!.from_id, user.id, `trade:${t!.id}`);
    for (const iid of request) transferItem(iid, user.id, t!.from_id, `trade:${t!.id}`);
    run("UPDATE trades SET status = 'accepted', closed_at = ? WHERE id = ?", Date.now(), t!.id);
  });
  return { ok: true, user: publicProfile(getUser(user.id)) };
});

route("POST", "/trades/:id/decline", {}, ({ user, params }) => {
  const tid = idParam(params.id);
  tx(() => {
    const t = get<TradeRow>("SELECT * FROM trades WHERE id = ?", tid);
    if (!t || (t.to_id !== user.id && t.from_id !== user.id)) fail(404, "Trade not found");
    if (t!.status !== "pending") fail(410, "Trade is no longer pending");
    releaseTrade(t!, t!.from_id === user.id ? "cancelled" : "declined");
  });
  return { ok: true };
});

route("GET", "/users/:username/items", { rate: [30, 60_000] }, ({ params }) => {
  const u = get<{ id: number; username: string }>("SELECT id, username FROM users WHERE username = ?", params.username.slice(0, 16));
  if (!u) fail(404, "No player with that username");
  const rows = all<ItemRow>("SELECT * FROM items WHERE owner_id = ? AND locked_by IS NULL ORDER BY rarity DESC, id DESC LIMIT 200", u!.id);
  return { username: u!.username, items: rows.map((r) => itemView(r)) };
});

/* Friends */

route("GET", "/friends", {}, ({ user }) => {
  const online = onlineUsers();
  const accepted = all<{ id: number; username: string; level: number; rating: number }>(
    `SELECT u.id, u.username, u.level, u.rating FROM friends f JOIN users u ON u.id = f.friend_id
     WHERE f.user_id = ? AND f.status = 'accepted' ORDER BY u.username`,
    user.id,
  );
  const incoming = all<{ id: number; username: string }>(
    `SELECT u.id, u.username FROM friends f JOIN users u ON u.id = f.user_id WHERE f.friend_id = ? AND f.status = 'pending'`,
    user.id,
  );
  const outgoing = all<{ id: number; username: string }>(
    `SELECT u.id, u.username FROM friends f JOIN users u ON u.id = f.friend_id WHERE f.user_id = ? AND f.status = 'pending'`,
    user.id,
  );
  return {
    friends: accepted.map((f) => ({ ...f, online: online.has(f.id), lobby: lobbyForUser(f.id) })),
    incoming,
    outgoing,
  };
});

route("POST", "/friends/request", { body: z.object({ username: z.string().trim().min(3).max(16) }), rate: [20, 60_000] }, ({ user, body }) => {
  const other = get<{ id: number }>("SELECT id FROM users WHERE username = ?", body.username);
  if (!other) fail(404, "No player with that username");
  if (other!.id === user.id) fail(400, "That's you");
  tx(() => {
    const reverse = get<{ status: string }>("SELECT status FROM friends WHERE user_id = ? AND friend_id = ?", other!.id, user.id);
    if (reverse) {
      run("UPDATE friends SET status = 'accepted' WHERE user_id = ? AND friend_id = ?", other!.id, user.id);
      run(
        "INSERT INTO friends(user_id, friend_id, status, created_at) VALUES (?,?, 'accepted', ?) ON CONFLICT(user_id, friend_id) DO UPDATE SET status = 'accepted'",
        user.id,
        other!.id,
        Date.now(),
      );
    } else {
      run("INSERT OR IGNORE INTO friends(user_id, friend_id, status, created_at) VALUES (?,?, 'pending', ?)", user.id, other!.id, Date.now());
    }
  });
  return { ok: true };
});

route("POST", "/friends/:id/accept", {}, ({ user, params }) => {
  const fid = idParam(params.id);
  tx(() => {
    const r = run("UPDATE friends SET status = 'accepted' WHERE user_id = ? AND friend_id = ? AND status = 'pending'", fid, user.id);
    if (Number(r.changes) !== 1) fail(404, "No pending request");
    run(
      "INSERT INTO friends(user_id, friend_id, status, created_at) VALUES (?,?, 'accepted', ?) ON CONFLICT(user_id, friend_id) DO UPDATE SET status = 'accepted'",
      user.id,
      fid,
      Date.now(),
    );
  });
  return { ok: true };
});

route("DELETE", "/friends/:id", {}, ({ user, params }) => {
  const fid = idParam(params.id);
  run("DELETE FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)", user.id, fid, fid, user.id);
  return { ok: true };
});

route("GET", "/friends/:id/team", {}, ({ user, params }) => {
  const fid = idParam(params.id);
  if (!get("SELECT 1 FROM friends WHERE user_id = ? AND friend_id = ? AND status = 'accepted'", user.id, fid)) fail(403, "Not friends");
  const t = get<{ name: string; slots: string; formation: string }>("SELECT * FROM teams WHERE user_id = ? ORDER BY is_default DESC, id LIMIT 1", fid);
  if (!t) return { team: null };
  const players = (JSON.parse(t.slots) as (number | null)[])
    .slice(0, 3)
    .map((id) => (id ? get<ItemRow>("SELECT * FROM items WHERE id = ? AND owner_id = ?", id, fid) : undefined))
    .filter(Boolean)
    .map((it) => itemView(it!));
  return { team: { name: t.name, formation: t.formation, players } };
});

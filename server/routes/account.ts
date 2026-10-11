import { z } from "zod";
import { route, fail } from "../http";
import { get, run, tx } from "../db";
import { createSession, destroySession, hashPassword, issueWsTicket, parseCookies, sessionCookie, verifyPassword, COOKIE } from "../auth";
import { T, applyDelta, createItem, getUser, publicProfile } from "../economy";
import { STARTER_VARIANTS } from "@/shared/catalog";
import { BANNERS } from "@/shared/banners";

const creds = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(16, "Username must be at most 16 characters")
    .regex(/^[A-Za-z0-9_]+$/, "Username may only use letters, numbers and _"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

route("POST", "/auth/register", { auth: false, body: creds, rate: [5, 60_000] }, ({ req, res, body }) => {
  if (get("SELECT id FROM users WHERE username = ?", body.username)) fail(409, "That username is taken");
  const hash = hashPassword(body.password);
  const userId = tx(() => {
    const r = run(
      "INSERT INTO users(username, pass_hash, created_at, rating) VALUES (?,?,?,?)",
      body.username,
      hash,
      Date.now(),
      T.match.startRating,
    );
    const id = Number(r.lastInsertRowid);
    applyDelta(id, { gems: T.economy.startingGems }, "starter_pack");
    const chars = STARTER_VARIANTS.map((v) => createItem(id, "char", v, "starter"));
    run(
      "INSERT INTO teams(user_id, name, formation, slots, is_default, created_at) VALUES (?,?,?,?,1,?)",
      id,
      "Team Z",
      "balanced",
      JSON.stringify(chars.map((c) => c.id)),
      Date.now(),
    );
    return id;
  });
  res.setHeader("Set-Cookie", sessionCookie(req, createSession(userId)));
  return { user: publicProfile(getUser(userId)) };
});

route("POST", "/auth/login", { auth: false, body: creds, rate: [10, 60_000] }, ({ req, res, body }) => {
  const row = get<{ id: number; pass_hash: string }>("SELECT id, pass_hash FROM users WHERE username = ?", body.username);
  if (!row || !verifyPassword(body.password, row.pass_hash)) fail(401, "Wrong username or password");
  res.setHeader("Set-Cookie", sessionCookie(req, createSession(row!.id)));
  return { user: publicProfile(getUser(row!.id)) };
});

route("POST", "/auth/logout", { auth: false }, ({ req, res }) => {
  const tok = parseCookies(req)[COOKIE];
  if (tok) destroySession(tok);
  res.setHeader("Set-Cookie", sessionCookie(req, null));
  return { ok: true };
});

route("GET", "/me", { auth: false }, ({ user }) => {
  if (!user) return { user: null };
  return { user: publicProfile(getUser(user.id)) };
});

route("GET", "/ws-ticket", { rate: [20, 60_000] }, ({ user }) => ({ ticket: issueWsTicket(user) }));

route("GET", "/config", { auth: false }, () => ({
  gacha: {
    pullCost: T.gacha.pullCostGems,
    tenPullCost: T.gacha.tenPullCostGems,
    rates: T.gacha.rates,
    pityLegendaryPlus: T.gacha.pityLegendaryPlus,
    pityN1: T.gacha.pityN1,
    rollRanges: T.gacha.rollRanges,
    featuredShare: T.gacha.featuredShare,
  },
  banners: BANNERS,
  economy: {
    listingFeePct: T.economy.marketListingFeePct,
    listingFeeMin: T.economy.marketListingFeeMin,
    taxPct: T.economy.marketTaxPct,
    minPrice: T.economy.marketMinPrice,
    maxPrice: T.economy.marketMaxPrice,
  },
  levelCap: T.stats.levelCap,
}));

import crypto from "node:crypto";
import type { IncomingMessage } from "node:http";
import { get, run } from "./db";

export interface SessionUser {
  id: number;
  username: string;
}

const SESSION_DAYS = 30;
export const COOKIE = "bl_sid";

export function hashPassword(pw: string) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(pw, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export function verifyPassword(pw: string, stored: string) {
  const [alg, saltB64, hashB64] = stored.split("$");
  if (alg !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const actual = crypto.scryptSync(pw, Buffer.from(saltB64, "base64"), expected.length, { N: 16384, r: 8, p: 1 });
  return crypto.timingSafeEqual(expected, actual);
}

const sha = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

export function createSession(userId: number) {
  const token = crypto.randomBytes(32).toString("base64url");
  run(
    "INSERT INTO sessions(token_hash, user_id, expires_at) VALUES (?,?,?)",
    sha(token),
    userId,
    Date.now() + SESSION_DAYS * 86400_000,
  );
  return token;
}

export function destroySession(token: string) {
  run("DELETE FROM sessions WHERE token_hash = ?", sha(token));
}

export function parseCookies(req: IncomingMessage) {
  const out: Record<string, string> = {};
  const h = req.headers.cookie;
  if (!h) return out;
  for (const part of h.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function sessionCookie(req: IncomingMessage, token: string | null) {
  const secure = req.headers["x-forwarded-proto"] === "https" || process.env.COOKIE_SECURE === "1";
  const base = `${COOKIE}=${token ?? ""}; Path=/; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
  return token ? `${base}; Max-Age=${SESSION_DAYS * 86400}` : `${base}; Max-Age=0`;
}

export function userFromToken(token: string | undefined): SessionUser | null {
  if (!token || token.length > 100) return null;
  const row = get<{ id: number; username: string; expires_at: number }>(
    "SELECT u.id, u.username, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?",
    sha(token),
  );
  if (!row) return null;
  if (row.expires_at < Date.now()) {
    destroySession(token);
    return null;
  }
  return { id: row.id, username: row.username };
}

export function userFromRequest(req: IncomingMessage) {
  return userFromToken(parseCookies(req)[COOKIE]);
}

/** Short-lived, single-use tickets so WebSocket upgrades are bound to a session. */
const wsTickets = new Map<string, { user: SessionUser; exp: number }>();

export function issueWsTicket(user: SessionUser) {
  const t = crypto.randomBytes(24).toString("base64url");
  wsTickets.set(t, { user, exp: Date.now() + 60_000 });
  return t;
}

export function redeemWsTicket(t: string | null): SessionUser | null {
  if (!t) return null;
  const v = wsTickets.get(t);
  wsTickets.delete(t);
  if (!v || v.exp < Date.now()) return null;
  return v.user;
}

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of wsTickets) if (v.exp < now) wsTickets.delete(k);
  run("DELETE FROM sessions WHERE expires_at < ?", now);
}, 60_000).unref();

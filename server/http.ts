import type { IncomingMessage, ServerResponse } from "node:http";
import { z } from "zod";
import { get, run } from "./db";
import { userFromRequest, type SessionUser } from "./auth";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const fail = (status: number, msg: string): never => {
  throw new HttpError(status, msg);
};

export interface Ctx<B = unknown> {
  req: IncomingMessage;
  res: ServerResponse;
  url: URL;
  ip: string;
  params: Record<string, string>;
  user: SessionUser;
  body: B;
}

interface RouteOpts<S extends z.ZodTypeAny> {
  auth?: boolean;
  body?: S;
  /** [requests, windowMs] per user (or IP when anonymous). */
  rate?: [number, number];
  idempotent?: boolean;
  maxBody?: number;
}

type Handler<B> = (ctx: Ctx<B>) => unknown | Promise<unknown>;

interface Route {
  method: string;
  parts: string[];
  opts: RouteOpts<z.ZodTypeAny>;
  handler: Handler<unknown>;
}

const routes: Route[] = [];

export function route<S extends z.ZodTypeAny = z.ZodUndefined>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  opts: RouteOpts<S>,
  handler: Handler<z.infer<S>>,
) {
  routes.push({ method, parts: path.split("/").filter(Boolean), opts, handler: handler as Handler<unknown> });
}

const buckets = new Map<string, { n: number; reset: number }>();
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) if (b.reset < now) buckets.delete(k);
}, 60_000).unref();

export function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { n: 1, reset: now + windowMs });
    return true;
  }
  b.n++;
  return b.n <= max;
}

function match(r: Route, method: string, parts: string[]) {
  if (r.method !== method || r.parts.length !== parts.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < parts.length; i++) {
    const rp = r.parts[i];
    if (rp.startsWith(":")) params[rp.slice(1)] = decodeURIComponent(parts[i]);
    else if (rp !== parts[i]) return null;
  }
  return params;
}

async function readBody(req: IncomingMessage, max: number): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => {
      size += c.length;
      if (size > max) {
        reject(new HttpError(413, "Request body too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      if (!chunks.length) return resolve(undefined);
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new HttpError(400, "Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

export function clientIp(req: IncomingMessage) {
  return req.socket.remoteAddress ?? "unknown";
}

function send(res: ServerResponse, status: number, data: unknown) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(body);
}

/** Returns true if the request was an API request and has been handled. */
export async function handleApi(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (!url.pathname.startsWith("/api/")) return false;
  const method = (req.method ?? "GET").toUpperCase();
  const parts = url.pathname.split("/").filter(Boolean).slice(1);
  const ip = clientIp(req);
  try {
    let found: { r: Route; params: Record<string, string> } | null = null;
    for (const r of routes) {
      const params = match(r, method, parts);
      if (params) {
        found = { r, params };
        break;
      }
    }
    if (!found) fail(404, "Not found");
    const { r, params } = found!;

    if (method !== "GET") {
      // CSRF: mutating requests must be same-origin JSON with our custom header.
      if (req.headers["x-requested-with"] !== "bluelock") fail(403, "Missing request header");
      const origin = req.headers.origin;
      if (origin) {
        const host = req.headers.host;
        try {
          if (new URL(origin).host !== host) fail(403, "Cross-origin request rejected");
        } catch {
          fail(403, "Bad origin");
        }
      }
    }

    const user = userFromRequest(req);
    if (r.opts.auth !== false && !user) fail(401, "Please log in first");

    const [max, win] = r.opts.rate ?? [90, 10_000];
    const rk = `${r.method}:${r.parts.join("/")}:${user?.id ?? ip}`;
    if (!rateLimit(rk, max, win) || !rateLimit(`global:${user?.id ?? ip}`, 400, 10_000)) {
      fail(429, "Slow down, egoist. Too many requests.");
    }

    let body: unknown = undefined;
    if (method !== "GET") {
      body = await readBody(req, r.opts.maxBody ?? 32 * 1024);
      if (r.opts.body) {
        const parsed = r.opts.body.safeParse(body ?? {});
        if (!parsed.success) fail(400, "Invalid request: " + parsed.error.issues.map((i) => i.message).join(", "));
        body = parsed.data;
      }
    }

    let idemKey: string | null = null;
    if (r.opts.idempotent && user) {
      const k = req.headers["idempotency-key"];
      if (typeof k !== "string" || !/^[A-Za-z0-9_-]{8,64}$/.test(k)) fail(400, "Missing Idempotency-Key");
      idemKey = k as string;
      const prev = get<{ response: string; route: string }>(
        "SELECT response, route FROM idempotency WHERE user_id = ? AND key = ?",
        user.id,
        idemKey,
      );
      if (prev) {
        send(res, 200, JSON.parse(prev.response));
        return true;
      }
    }

    const out = await r.handler({ req, res, url, ip, params, user: user as SessionUser, body });
    if (idemKey && user) {
      run(
        "INSERT OR IGNORE INTO idempotency(user_id, key, route, response, created_at) VALUES (?,?,?,?,?)",
        user.id,
        idemKey,
        r.parts.join("/"),
        JSON.stringify(out ?? {}),
        Date.now(),
      );
    }
    if (!res.headersSent) send(res, 200, out ?? { ok: true });
  } catch (e) {
    if (e instanceof HttpError) send(res, e.status, { error: e.message });
    else {
      const msg = e instanceof Error ? e.message : String(e);
      if (/CHECK constraint failed/.test(msg)) send(res, 400, { error: "Not enough resources for that action" });
      else if (/immutable|append-only/.test(msg)) send(res, 403, { error: "That record cannot be modified" });
      else {
        console.error("[api]", method, url.pathname, e);
        send(res, 500, { error: "Something went wrong" });
      }
    }
  }
  return true;
}

/* End-to-end smoke test against a running dev server: accounts, friends, lobby match, market and trade. */
import WebSocket from "ws";

const BASE = process.env.BASE ?? "http://localhost:4517";
const H = { "Content-Type": "application/json", "X-Requested-With": "bluelock", Origin: BASE };

class Client {
  cookie = "";
  constructor(public name: string) {}
  async req<T = Record<string, unknown>>(method: string, path: string, body?: unknown, idem = false): Promise<T> {
    const headers: Record<string, string> = { ...H, Cookie: this.cookie };
    if (idem) headers["Idempotency-Key"] = crypto.randomUUID().replace(/-/g, "");
    const r = await fetch(BASE + "/api" + path, { method, headers, body: body === undefined ? (method === "GET" ? undefined : "{}") : JSON.stringify(body) });
    const sc = r.headers.get("set-cookie");
    if (sc) this.cookie = sc.split(";")[0];
    const j = (await r.json()) as T & { error?: string };
    if (!r.ok) throw new Error(`${this.name} ${method} ${path} -> ${r.status} ${j.error}`);
    return j;
  }
  async ws() {
    const { ticket } = await this.req<{ ticket: string }>("GET", "/ws-ticket");
    const ws = new WebSocket(`${BASE.replace("http", "ws")}/ws?ticket=${ticket}`, { headers: { Origin: BASE } });
    const msgs: { t: string; [k: string]: unknown }[] = [];
    ws.on("message", (d) => msgs.push(JSON.parse(String(d))));
    await new Promise((res, rej) => (ws.once("open", res), ws.once("error", rej)));
    return {
      ws,
      msgs,
      send: (m: unknown) => ws.send(JSON.stringify(m)),
      wait: async (t: string, ms = 8000) => {
        const end = Date.now() + ms;
        while (Date.now() < end) {
          const i = msgs.findIndex((m) => m.t === t);
          if (i >= 0) return msgs.splice(i, 1)[0];
          await new Promise((r) => setTimeout(r, 30));
        }
        throw new Error(`timeout waiting for ${t}`);
      },
    };
  }
}

function ok(cond: unknown, msg: string) {
  if (!cond) throw new Error("FAIL: " + msg);
  console.log("  ok -", msg);
}

async function main() {
  const tag = Math.random().toString(36).slice(2, 7);
  const a = new Client("a");
  const b = new Client("b");
  await a.req("POST", "/auth/register", { username: `ego_${tag}`, password: "hunter2hunter2" });
  await b.req("POST", "/auth/register", { username: `rin_${tag}`, password: "hunter2hunter2" });
  ok(true, "registered two players");

  await a.req("POST", "/friends/request", { username: `rin_${tag}` });
  await b.req("POST", "/friends/request", { username: `ego_${tag}` });
  const fr = await a.req<{ friends: { username: string }[] }>("GET", "/friends");
  ok(fr.friends.some((f) => f.username === `rin_${tag}`), "friend requests auto-accept when mutual");

  const wa = await a.ws();
  const wb = await b.ws();
  wa.send({ t: "lobby.create" });
  const lob = (await wa.wait("lobby")).lobby as { code: string };
  ok(/^[A-Z0-9]{6}$/.test(lob.code), `lobby created ${lob.code}`);
  wb.send({ t: "lobby.join", code: lob.code });
  const joined = (await wb.wait("lobby")).lobby as { sides: { kind: string }[][] };
  ok(joined.sides.flat().filter((s) => s.kind === "human").length === 2, "second player joined from another client");
  wa.send({ t: "lobby.settings", durationSec: 60 });
  wa.send({ t: "lobby.start" });
  const sa = await wa.wait("match.start");
  const sb = await wb.wait("match.start");
  ok(sa.you !== sb.you, "both humans got distinct control slots");
  await wa.wait("snap");
  wa.send({ t: "in", b: 1 | 8 });
  await new Promise((r) => setTimeout(r, 4500));
  const snaps = wa.msgs.filter((m) => m.t === "snap").length;
  ok(snaps > 20, `receiving server snapshots (${snaps})`);
  wb.send({ t: "match.leave" });
  wa.send({ t: "match.leave" });
  await new Promise((r) => setTimeout(r, 300));
  wa.ws.close();
  wb.ws.close();

  const coll = await b.req<{ items: { id: number; kind: string }[] }>("GET", "/collection");
  const gear = coll.items.find((i) => i.kind === "gear")!;
  const listed = await b.req<{ id: number }>("POST", "/market/list", { itemId: gear.id, price: 50 }, true);
  ok(listed.id > 0, "listed gear on the market");
  const mkt = await a.req<{ listings: { id: number }[] }>("GET", "/market?sort=newest");
  ok(mkt.listings.some((l) => l.id === listed.id), "listing visible to other player");
  await a.req("POST", `/market/${listed.id}/buy`, undefined, true);
  const aColl = await a.req<{ items: { id: number }[] }>("GET", "/collection");
  ok(aColl.items.some((i) => i.id === gear.id), "buyer owns the purchased item");
  try {
    await a.req("POST", `/market/${listed.id}/buy`, undefined, true);
    ok(false, "double buy should fail");
  } catch (e) {
    ok(String(e).includes("410"), "second purchase of the same listing rejected");
  }

  const aChars = (await a.req<{ items: { id: number; kind: string }[] }>("GET", "/collection")).items.filter((i) => i.kind === "char");
  const tr = await a.req<{ id: number }>("POST", "/trades", { to: `rin_${tag}`, offerItems: [aChars[0].id], offerCoins: 10, requestItems: [], requestCoins: 0 }, true);
  const locked = (await a.req<{ items: { id: number; locked: boolean }[] }>("GET", "/collection")).items.find((i) => i.id === aChars[0].id)!;
  ok(locked.locked, "offered item is locked in escrow");
  await b.req("POST", `/trades/${tr.id}/accept`, undefined, true);
  const bColl = await b.req<{ items: { id: number }[] }>("GET", "/collection");
  ok(bColl.items.some((i) => i.id === aChars[0].id), "trade transferred the item");

  const lb = await a.req<{ rows: unknown[] }>("GET", "/leaderboard?board=goals");
  ok(Array.isArray(lb.rows), "leaderboard responds");
  console.log("\nAll online e2e checks passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

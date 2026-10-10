import crypto from "node:crypto";
import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocketServer, WebSocket } from "ws";
import { z } from "zod";
import { redeemWsTicket, type SessionUser } from "./auth";
import { get, run, tx, today } from "./db";
import { HttpError } from "./http";
import { T, applyDelta, bumpCounter, flag, getCounter, getUser, grantXp, questEvent, rewardMult } from "./economy";
import { buildRoster } from "./roster";
import { botRoster, makePlayerDef, type RosterEntry } from "@/game/setup";
import { createMatch, snapshot, step, TICK_RATE } from "@/game/engine";
import type { MatchConfig, MatchEvent, MatchPlayerDef, MatchState } from "@/game/types";
import type { Rarity } from "@/shared/rarity";
import type { ClientMsg, Difficulty, LobbySlotView, LobbyView, MatchRewardView, ServerMsg } from "@/shared/protocol";

interface Conn {
  ws: WebSocket;
  user: SessionUser;
  lobby: Lobby | null;
  room: Room | null;
  msgCount: number;
  msgReset: number;
}

type Slot = { kind: "human"; userId: number; name: string; teamId: number | null } | { kind: "bot"; id: string };

interface Lobby {
  code: string;
  hostId: number;
  sides: [Slot[], Slot[]];
  settings: { durationSec: number; difficulty: Difficulty };
  status: "open" | "playing";
  room: Room | null;
}

interface Room {
  id: string;
  mode: "friendly" | "ranked";
  cfg: MatchConfig;
  state: MatchState;
  inputs: number[];
  humans: Map<number, { slot: number; player: number; side: 0 | 1 }>;
  events: MatchEvent[];
  timer: NodeJS.Timeout | null;
  last: number;
  acc: number;
  lobby: Lobby | null;
  done: boolean;
}

const conns = new Map<number, Conn>();
const lobbies = new Map<string, Lobby>();
const queue: { userId: number; teamId: number | null }[] = [];

const DIFF: Record<Difficulty, { rarities: Rarity[]; level: number; roll: number; skill: number; goalie: number }> = {
  easy: { rarities: ["C", "UC"], level: 3, roll: 30, skill: 0.35, goalie: 0.3 },
  normal: { rarities: ["R", "E"], level: 12, roll: 50, skill: 0.55, goalie: 0.5 },
  hard: { rarities: ["E", "M", "L"], level: 25, roll: 65, skill: 0.75, goalie: 0.68 },
  ego: { rarities: ["L", "WC", "N1"], level: 45, roll: 85, skill: 0.92, goalie: 0.88 },
};

export function onlineUsers() {
  return new Set(conns.keys());
}

export function lobbyForUser(userId: number) {
  const c = conns.get(userId);
  const l = c?.lobby;
  if (!l) return null;
  return { code: l.code, status: l.status, players: l.sides[0].length + l.sides[1].length };
}

function send(c: Conn | undefined, m: ServerMsg) {
  if (c && c.ws.readyState === WebSocket.OPEN) c.ws.send(JSON.stringify(m));
}

function lobbyView(l: Lobby): LobbyView {
  const sv = (s: Slot): LobbySlotView => (s.kind === "human" ? { ...s, online: conns.get(s.userId)?.ws.readyState === WebSocket.OPEN } : s);
  return { code: l.code, hostId: l.hostId, sides: [l.sides[0].map(sv), l.sides[1].map(sv)], settings: l.settings, status: l.status };
}

function broadcastLobby(l: Lobby) {
  const v = lobbyView(l);
  for (const side of l.sides) for (const s of side) if (s.kind === "human") send(conns.get(s.userId), { t: "lobby", lobby: v });
}

function newCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (;;) {
    let c = "";
    for (let i = 0; i < 6; i++) c += alphabet[crypto.randomInt(0, alphabet.length)];
    if (!lobbies.has(c)) return c;
  }
}

function leaveLobby(c: Conn) {
  const l = c.lobby;
  if (!l) return;
  c.lobby = null;
  l.sides = l.sides.map((side) => side.filter((s) => !(s.kind === "human" && s.userId === c.user.id))) as [Slot[], Slot[]];
  const humans = l.sides.flat().filter((s): s is Extract<Slot, { kind: "human" }> => s.kind === "human");
  if (humans.length === 0) {
    lobbies.delete(l.code);
    return;
  }
  if (l.hostId === c.user.id) l.hostId = humans[0].userId;
  broadcastLobby(l);
}

function rosterFor(entries: RosterEntry[], side: 0 | 1, prefix: string, humanOf: (i: number) => number): MatchPlayerDef[] {
  return entries.map((e, i) => makePlayerDef(`${prefix}${i}`, e, side, humanOf(i), T));
}

function startLobbyMatch(l: Lobby) {
  const d = DIFF[l.settings.difficulty];
  const players: MatchPlayerDef[] = [];
  const humans = new Map<number, { slot: number; player: number; side: 0 | 1 }>();
  const formations: MatchConfig["formations"] = ["balanced", "balanced"];
  let slot = 0;
  for (const side of [0, 1] as const) {
    const slots = l.sides[side];
    const hs = slots.filter((s): s is Extract<Slot, { kind: "human" }> => s.kind === "human");
    const botCount = slots.length - hs.length;
    const used = new Set<string>();
    let teamFill: RosterEntry[] = [];
    hs.forEach((h, idx) => {
      const r = buildRoster(h.userId, h.teamId, 1 + (idx === 0 ? botCount : 0));
      if (idx === 0) {
        formations[side] = r.formation;
        teamFill = r.entries.slice(1);
      }
      const captain = r.entries[0];
      used.add(captain.variantId.split(".")[0]);
      const def = makePlayerDef(`h${h.userId}`, captain, side, slot, T, h.name);
      humans.set(h.userId, { slot, player: players.length, side });
      players.push(def);
      slot++;
    });
    const fill = teamFill.filter((e) => !used.has(e.variantId.split(".")[0]));
    if (fill.length < botCount) {
      fill.push(...botRoster(crypto.randomInt(1, 1 << 30), botCount - fill.length, d.rarities, d.level, d.roll, [...used]));
    }
    players.push(...rosterFor(fill.slice(0, botCount), side, `b${side}`, () => -1));
  }
  const cfg: MatchConfig = {
    seed: crypto.randomInt(1, 2 ** 31 - 1),
    durationSec: l.settings.durationSec,
    tempo: 1.06,
    teams: [
      { name: "Blue Team", color: "#2563eb", accent: "#dbeafe" },
      { name: "Red Team", color: "#dc2626", accent: "#fee2e2" },
    ],
    players,
    botSkill: [d.skill, d.skill],
    goalieSkill: [d.goalie, d.goalie],
    humanCount: slot,
    formations,
  };
  l.status = "playing";
  const room = createRoom("friendly", cfg, humans, l);
  l.room = room;
  broadcastLobby(l);
}

function createRoom(mode: Room["mode"], cfg: MatchConfig, humans: Room["humans"], lobby: Lobby | null) {
  const room: Room = {
    id: crypto.randomBytes(8).toString("hex"),
    mode,
    cfg,
    state: createMatch(cfg),
    inputs: new Array(cfg.humanCount).fill(0),
    humans,
    events: [],
    timer: null,
    last: performance.now(),
    acc: -3000,
    lobby,
    done: false,
  };
  for (const [uid, h] of humans) {
    const c = conns.get(uid);
    if (c) c.room = room;
    send(c, { t: "match.start", matchId: room.id, config: cfg, you: h.slot, mode });
  }
  const stepMs = 1000 / TICK_RATE;
  let ticksSinceSnap = 0;
  room.timer = setInterval(() => {
    const now = performance.now();
    room.acc += Math.min(250, now - room.last);
    room.last = now;
    if (room.acc < 0) {
      if (++ticksSinceSnap >= 30) {
        ticksSinceSnap = 0;
        broadcastSnap(room);
      }
      return;
    }
    while (room.acc >= stepMs && !room.done) {
      room.acc -= stepMs;
      step(room.state, room.cfg, room.inputs);
      if (room.state.events.length) room.events.push(...room.state.events);
      ticksSinceSnap++;
      if (room.state.phase === 3) {
        broadcastSnap(room);
        finishRoom(room, null);
        return;
      }
    }
    if (ticksSinceSnap >= 3) {
      ticksSinceSnap = 0;
      broadcastSnap(room);
    }
  }, 8);
  return room;
}

function broadcastSnap(room: Room) {
  const msg: ServerMsg = { t: "snap", s: snapshot(room.state), ev: room.events };
  room.events = [];
  const data = JSON.stringify(msg);
  for (const uid of room.humans.keys()) {
    const c = conns.get(uid);
    if (c && c.room === room && c.ws.readyState === WebSocket.OPEN) c.ws.send(data);
  }
}

function pairCount(kind: string, a: number, b: number) {
  const key = `${kind}:${Math.min(a, b)}:${Math.max(a, b)}`;
  run(
    "INSERT INTO daily_counters(user_id, day, key, count) VALUES (0, ?, ?, 1) ON CONFLICT(user_id, day, key) DO UPDATE SET count = count + 1",
    today(),
    key,
  );
  return get<{ count: number }>("SELECT count FROM daily_counters WHERE user_id = 0 AND day = ? AND key = ?", today(), key)!.count;
}

function finishRoom(room: Room, forfeitBy: number | null) {
  if (room.done) return;
  room.done = true;
  if (room.timer) clearInterval(room.timer);
  const s = room.state;
  const score: [number, number] = [s.score[0], s.score[1]];
  const rewards = new Map<number, MatchRewardView>();
  try {
    tx(() => {
      const entries = [...room.humans.entries()];
      if (room.mode === "friendly") {
        for (const [uid, h] of entries) {
          const goals = s.stats[h.player]?.goals ?? 0;
          const myScore = score[h.side];
          const their = score[1 - h.side];
          const r: MatchRewardView = { coins: 0, gems: 0, xp: 0 };
          if (s.phase === 3 && getCounter(uid, "social_rewarded") < T.economy.friendlyDailyRewardedMatches) {
            bumpCounter(uid, "social_rewarded");
            const mult = rewardMult(uid);
            r.coins = Math.round((T.economy.friendlyCoinsPerMatch + goals * T.economy.friendlyCoinsPerGoal) * mult);
            r.xp = Math.round(30 * mult);
            applyDelta(uid, { coins: r.coins }, "match_friendly", room.id, { score });
            grantXp(uid, r.xp);
          } else {
            r.note = s.phase === 3 ? "Daily friendly reward limit reached" : "Match abandoned";
          }
          if (s.phase === 3) {
            questEvent(uid, "friendly", 1);
            if (myScore > 0) questEvent(uid, "goals", myScore);
            if (myScore > their) questEvent(uid, "wins", 1);
            run("UPDATE users SET goals = goals + ? WHERE id = ?", goals, uid);
          }
          rewards.set(uid, r);
        }
        run(
          "INSERT INTO matches(mode, user_a, user_b, score_a, score_b, meta, created_at) VALUES ('friendly', ?, ?, ?, ?, ?, ?)",
          entries[0]?.[0] ?? null,
          entries[1]?.[0] ?? null,
          score[0],
          score[1],
          JSON.stringify({ humans: entries.map(([u]) => u) }),
          Date.now(),
        );
      } else {
        const [[ua, ha], [ub, hb]] = entries as unknown as [[number, { side: 0 | 1; player: number }], [number, { side: 0 | 1; player: number }]];
        let resA = score[ha.side] > score[hb.side] ? 1 : score[ha.side] < score[hb.side] ? 0 : 0.5;
        if (forfeitBy === ua) resA = 0;
        if (forfeitBy === ub) resA = 1;
        const a = getUser(ua);
        const b = getUser(ub);
        const n = pairCount("ranked", ua, ub);
        const rated = n <= T.antiCheat.maxTradesPerPairPerDay;
        if (!rated) {
          flag(ua, "ranked_pair_farming", { with: ub, n });
          flag(ub, "ranked_pair_farming", { with: ua, n });
        }
        const ea = 1 / (1 + Math.pow(10, (b.rating - a.rating) / 400));
        const da = rated ? Math.round(T.match.eloK * (resA - ea)) : 0;
        for (const [uid, res, delta, h] of [
          [ua, resA, da, ha],
          [ub, 1 - resA, -da, hb],
        ] as const) {
          const win = res === 1;
          const loss = res === 0;
          const mult = rewardMult(uid);
          const r: MatchRewardView = {
            coins: rated ? Math.round((win ? T.economy.rankedWinCoins : T.economy.rankedLossCoins) * mult) : 0,
            gems: rated && win ? T.economy.rankedWinGems : 0,
            xp: Math.round((win ? 80 : 30) * mult),
            ratingDelta: delta,
            note: rated ? undefined : "Unrated: too many matches against the same player today",
          };
          const goals = s.stats[h.player]?.goals ?? 0;
          run(
            `UPDATE users SET rating = MAX(0, rating + ?), wins = wins + ?, losses = losses + ?, draws = draws + ?,
             win_streak = CASE WHEN ? THEN win_streak + 1 ELSE 0 END, goals = goals + ? WHERE id = ?`,
            delta,
            win ? 1 : 0,
            loss ? 1 : 0,
            !win && !loss ? 1 : 0,
            win ? 1 : 0,
            goals,
            uid,
          );
          if (r.coins || r.gems) applyDelta(uid, { coins: r.coins, gems: r.gems }, "match_ranked", room.id, { score });
          grantXp(uid, r.xp);
          if (win) {
            questEvent(uid, "ranked_win", 1);
            questEvent(uid, "wins", 1);
          }
          const myScore = score[h.side];
          if (myScore > 0) questEvent(uid, "goals", myScore);
          if (getUser(uid).win_streak >= T.antiCheat.winStreakFlag) flag(uid, "win_streak", { streak: getUser(uid).win_streak });
          rewards.set(uid, r);
        }
        run(
          "INSERT INTO matches(mode, user_a, user_b, score_a, score_b, meta, created_at) VALUES ('ranked', ?, ?, ?, ?, ?, ?)",
          ua,
          ub,
          score[ha.side],
          score[hb.side],
          JSON.stringify({ forfeitBy, rated }),
          Date.now(),
        );
      }
    });
  } catch (e) {
    console.error("[rooms] reward error", e);
  }
  for (const [uid, h] of room.humans) {
    const c = conns.get(uid);
    send(c, { t: "match.end", score, side: h.side, reward: rewards.get(uid) ?? { coins: 0, gems: 0, xp: 0 }, mode: room.mode });
    if (c && c.room === room) c.room = null;
  }
  if (room.lobby) {
    room.lobby.status = "open";
    room.lobby.room = null;
    broadcastLobby(room.lobby);
  }
}

function leaveRoom(c: Conn) {
  const room = c.room;
  if (!room) return;
  c.room = null;
  const h = room.humans.get(c.user.id);
  if (!h || room.done) return;
  if (room.mode === "ranked") {
    finishRoom(room, c.user.id);
    return;
  }
  room.cfg.players[h.player].human = -1;
  room.inputs[h.slot] = 0;
  const anyone = [...room.humans.keys()].some((uid) => conns.get(uid)?.room === room);
  if (!anyone) {
    room.done = true;
    if (room.timer) clearInterval(room.timer);
    if (room.lobby) {
      room.lobby.status = "open";
      room.lobby.room = null;
    }
  }
}

function tryMatchmake() {
  while (queue.length >= 2) {
    const a = queue.shift()!;
    const b = queue.shift()!;
    const ca = conns.get(a.userId);
    const cb = conns.get(b.userId);
    if (!ca || !cb) {
      if (ca) queue.unshift(a);
      if (cb) queue.unshift(b);
      continue;
    }
    try {
      const ra = buildRoster(a.userId, a.teamId, 3);
      const rb = buildRoster(b.userId, b.teamId, 3);
      const players = [
        ...ra.entries.map((e, i) => makePlayerDef(`a${i}`, e, 0, i === 0 ? 0 : -1, T, i === 0 ? ca.user.username : undefined)),
        ...rb.entries.map((e, i) => makePlayerDef(`b${i}`, e, 1, i === 0 ? 1 : -1, T, i === 0 ? cb.user.username : undefined)),
      ];
      const cfg: MatchConfig = {
        seed: crypto.randomInt(1, 2 ** 31 - 1),
        durationSec: T.match.rankedDurationSec,
        tempo: 1.04,
        teams: [
          { name: ra.team?.name ?? ca.user.username, color: "#2563eb", accent: "#dbeafe" },
          { name: rb.team?.name ?? cb.user.username, color: "#dc2626", accent: "#fee2e2" },
        ],
        players,
        botSkill: [0.62, 0.62],
        goalieSkill: [0.58, 0.58],
        humanCount: 2,
        formations: [ra.formation, rb.formation],
      };
      const humans = new Map<number, { slot: number; player: number; side: 0 | 1 }>([
        [a.userId, { slot: 0, player: 0, side: 0 }],
        [b.userId, { slot: 1, player: ra.entries.length, side: 1 }],
      ]);
      createRoom("ranked", cfg, humans, null);
    } catch (e) {
      const msg = e instanceof HttpError ? e.message : "Couldn't start the ranked match";
      send(ca, { t: "error", msg });
      send(cb, { t: "error", msg });
    }
  }
  for (const q of queue) send(conns.get(q.userId), { t: "queue", status: "searching", waiting: queue.length });
}

const msgSchema = z.discriminatedUnion("t", [
  z.object({ t: z.literal("lobby.create") }),
  z.object({ t: z.literal("lobby.join"), code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{6}$/) }),
  z.object({ t: z.literal("lobby.leave") }),
  z.object({
    t: z.literal("lobby.settings"),
    durationSec: z.number().int().min(60).max(300).optional(),
    difficulty: z.enum(["easy", "normal", "hard", "ego"]).optional(),
  }),
  z.object({ t: z.literal("lobby.bot"), side: z.union([z.literal(0), z.literal(1)]), action: z.enum(["add", "remove"]) }),
  z.object({ t: z.literal("lobby.move"), side: z.union([z.literal(0), z.literal(1)]), userId: z.number().int().positive().optional() }),
  z.object({ t: z.literal("lobby.team"), teamId: z.number().int().positive().nullable() }),
  z.object({ t: z.literal("lobby.start") }),
  z.object({ t: z.literal("queue.join"), teamId: z.number().int().positive().nullable() }),
  z.object({ t: z.literal("queue.leave") }),
  z.object({ t: z.literal("in"), b: z.number().int().min(0).max(63) }),
  z.object({ t: z.literal("match.leave") }),
]);

function handle(c: Conn, m: ClientMsg) {
  const l = c.lobby;
  switch (m.t) {
    case "in": {
      const h = c.room?.humans.get(c.user.id);
      if (h && c.room && c.room.cfg.players[h.player].human === h.slot) c.room.inputs[h.slot] = m.b;
      return;
    }
    case "lobby.create": {
      if (c.room) return send(c, { t: "error", msg: "Finish your match first" });
      leaveLobby(c);
      dequeue(c.user.id);
      const lobby: Lobby = {
        code: newCode(),
        hostId: c.user.id,
        sides: [[{ kind: "human", userId: c.user.id, name: c.user.username, teamId: null }, { kind: "bot", id: crypto.randomUUID() }], [
          { kind: "bot", id: crypto.randomUUID() },
          { kind: "bot", id: crypto.randomUUID() },
        ]],
        settings: { durationSec: T.match.friendlyDurationSec, difficulty: "normal" },
        status: "open",
        room: null,
      };
      lobbies.set(lobby.code, lobby);
      c.lobby = lobby;
      return broadcastLobby(lobby);
    }
    case "lobby.join": {
      const target = lobbies.get(m.code);
      if (!target) return send(c, { t: "error", msg: "No lobby with that code" });
      if (target === l) return broadcastLobby(target);
      if (target.status !== "open") return send(c, { t: "error", msg: "That lobby is mid-match. Try again when it ends." });
      const total = target.sides[0].length + target.sides[1].length;
      const side = target.sides[0].length <= target.sides[1].length ? 0 : 1;
      const botIdx = target.sides[side].findIndex((s) => s.kind === "bot");
      if (botIdx < 0 && (target.sides[side].length >= 5 || total >= 10)) return send(c, { t: "error", msg: "Lobby is full" });
      leaveLobby(c);
      dequeue(c.user.id);
      const slot: Slot = { kind: "human", userId: c.user.id, name: c.user.username, teamId: null };
      if (botIdx >= 0) target.sides[side][botIdx] = slot;
      else target.sides[side].push(slot);
      c.lobby = target;
      return broadcastLobby(target);
    }
    case "lobby.leave":
      leaveLobby(c);
      return;
    case "lobby.team": {
      if (!l || l.status !== "open") return;
      if (m.teamId != null && !get("SELECT 1 FROM teams WHERE id = ? AND user_id = ?", m.teamId, c.user.id)) return send(c, { t: "error", msg: "Team not found" });
      for (const side of l.sides) for (const s of side) if (s.kind === "human" && s.userId === c.user.id) s.teamId = m.teamId;
      return broadcastLobby(l);
    }
    case "lobby.settings": {
      if (!l || l.hostId !== c.user.id || l.status !== "open") return;
      if (m.durationSec) l.settings.durationSec = m.durationSec;
      if (m.difficulty) l.settings.difficulty = m.difficulty;
      return broadcastLobby(l);
    }
    case "lobby.bot": {
      if (!l || l.hostId !== c.user.id || l.status !== "open") return;
      const side = l.sides[m.side];
      if (m.action === "add") {
        if (side.length >= 5) return send(c, { t: "error", msg: "Max 5 players per side" });
        side.push({ kind: "bot", id: crypto.randomUUID() });
      } else {
        const idx = side.map((s) => s.kind).lastIndexOf("bot");
        if (idx < 0) return;
        if (side.length <= 1 && l.sides[1 - m.side].length === 0) return;
        side.splice(idx, 1);
      }
      return broadcastLobby(l);
    }
    case "lobby.move": {
      if (!l || l.status !== "open") return;
      const uid = m.userId ?? c.user.id;
      if (uid !== c.user.id && l.hostId !== c.user.id) return;
      const from = l.sides.findIndex((side) => side.some((s) => s.kind === "human" && s.userId === uid));
      if (from < 0 || from === m.side) return;
      const target = l.sides[m.side];
      if (target.length >= 5 && !target.some((s) => s.kind === "bot")) return send(c, { t: "error", msg: "That side is full" });
      const idx = l.sides[from].findIndex((s) => s.kind === "human" && s.userId === uid);
      const [slot] = l.sides[from].splice(idx, 1);
      const botIdx = target.findIndex((s) => s.kind === "bot");
      if (botIdx >= 0 && target.length >= 5) target[botIdx] = slot;
      else target.push(slot);
      return broadcastLobby(l);
    }
    case "lobby.start": {
      if (!l || l.hostId !== c.user.id || l.status !== "open") return;
      if (l.sides[0].length === 0 && l.sides[1].length === 0) return;
      const offline = l.sides.flat().some((s) => s.kind === "human" && !conns.has(s.userId));
      if (offline) return send(c, { t: "error", msg: "Everyone in the lobby must be online" });
      try {
        startLobbyMatch(l);
      } catch (e) {
        l.status = "open";
        const msg = e instanceof HttpError ? e.message : "Couldn't start the match";
        for (const s of l.sides.flat()) if (s.kind === "human") send(conns.get(s.userId), { t: "error", msg });
      }
      return;
    }
    case "queue.join": {
      if (c.room) return send(c, { t: "error", msg: "Finish your match first" });
      try {
        buildRoster(c.user.id, m.teamId, 3);
      } catch (e) {
        return send(c, { t: "error", msg: e instanceof HttpError ? e.message : "Team invalid" });
      }
      leaveLobby(c);
      dequeue(c.user.id);
      queue.push({ userId: c.user.id, teamId: m.teamId });
      send(c, { t: "queue", status: "searching", waiting: queue.length });
      tryMatchmake();
      return;
    }
    case "queue.leave":
      dequeue(c.user.id);
      send(c, { t: "queue", status: "idle", waiting: queue.length });
      return;
    case "match.leave":
      leaveRoom(c);
      return;
  }
}

function dequeue(userId: number) {
  const i = queue.findIndex((q) => q.userId === userId);
  if (i >= 0) queue.splice(i, 1);
}

const wss = new WebSocketServer({ noServer: true, maxPayload: 4096 });
const RECONNECT_GRACE_MS = 10_000;

export function handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer) {
  const url = new URL(req.url ?? "/", "http://localhost");
  const origin = req.headers.origin;
  if (origin) {
    try {
      if (new URL(origin).host !== req.headers.host) {
        socket.destroy();
        return;
      }
    } catch {
      socket.destroy();
      return;
    }
  }
  const user = redeemWsTicket(url.searchParams.get("ticket"));
  if (!user) {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => {
    const prev = conns.get(user.id);
    const c: Conn = { ws, user, lobby: prev?.lobby ?? null, room: prev?.room ?? null, msgCount: 0, msgReset: Date.now() + 1000 };
    if (prev) {
      prev.lobby = null;
      prev.room = null;
      prev.ws.close(4000, "Connected elsewhere");
    }
    conns.set(user.id, c);
    send(c, { t: "hello", userId: user.id, username: user.username });
    if (c.lobby) broadcastLobby(c.lobby);
    const h = c.room && !c.room.done ? c.room.humans.get(user.id) : null;
    if (c.room && h) send(c, { t: "match.start", matchId: c.room.id, config: c.room.cfg, you: h.slot, mode: c.room.mode });
    ws.on("message", (data) => {
      const now = Date.now();
      if (now > c.msgReset) {
        c.msgReset = now + 1000;
        c.msgCount = 0;
      }
      if (++c.msgCount > 150) return;
      let parsed: unknown;
      try {
        parsed = JSON.parse(String(data));
      } catch {
        return;
      }
      const r = msgSchema.safeParse(parsed);
      if (!r.success) return send(c, { t: "error", msg: "Invalid message" });
      try {
        handle(c, r.data as ClientMsg);
      } catch (e) {
        console.error("[ws]", e);
        send(c, { t: "error", msg: "Server error" });
      }
    });
    ws.on("close", () => {
      if (conns.get(user.id) !== c) return;
      dequeue(user.id);
      const h = c.room?.humans.get(user.id);
      if (c.room && h) c.room.inputs[h.slot] = 0;
      setTimeout(() => {
        if (conns.get(user.id) !== c) return;
        conns.delete(user.id);
        leaveRoom(c);
        leaveLobby(c);
      }, RECONNECT_GRACE_MS);
    });
  });
}

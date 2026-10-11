import crypto from "node:crypto";
import { z } from "zod";
import { route, fail } from "../http";
import { all, get, run, tx } from "../db";
import {
  T,
  applyDelta,
  bumpCounter,
  createItem,
  flag,
  getCounter,
  getUser,
  grantXp,
  itemView,
  publicProfile,
  questEvent,
  rewardMult,
} from "../economy";
import { buildRoster } from "../roster";
import { STAGES, STAGE_BY_ID, starsFor, type StageDef } from "@/shared/story";
import { LEAGUE_TEAMS, LEAGUE_BY_ID, type LeagueTeam } from "@/shared/league";
import { QUESTS, QUEST_BY_ID, type QuestDef } from "@/shared/quests";
import { makePlayerDef, type RosterEntry } from "@/game/setup";
import { maxMatchTicks, replay, TICK_RATE } from "@/game/engine";
import type { MatchConfig, MatchPlayerDef } from "@/game/types";
import { today } from "../db";
import { VARIANT_BY_ID } from "@/shared/catalog";

const clearedStages = (userId: number) =>
  new Map(all<{ stage_id: string; stars: number }>("SELECT stage_id, stars FROM story_progress WHERE user_id = ?", userId).map((r) => [r.stage_id, r.stars]));

function isUnlocked(stage: StageDef, cleared: Map<string, number>) {
  return !stage.requires || cleared.has(stage.requires);
}

route("GET", "/story", {}, ({ user }) => {
  const cleared = clearedStages(user.id);
  return {
    stages: STAGES.map((s) => ({ id: s.id, stars: cleared.get(s.id) ?? 0, unlocked: isUnlocked(s, cleared), cleared: cleared.has(s.id) })),
  };
});

function newSeed() {
  return crypto.randomInt(1, 2 ** 31 - 1);
}

function saveTicket(userId: number, mode: string, ref: string, cfg: MatchConfig) {
  const id = crypto.randomBytes(16).toString("base64url");
  run("DELETE FROM match_tickets WHERE user_id = ? AND used = 0 AND created_at < ?", userId, Date.now() - T.antiCheat.ticketTtlSec * 1000);
  run("INSERT INTO match_tickets(id, user_id, mode, ref, config, created_at) VALUES (?,?,?,?,?,?)", id, userId, mode, ref, JSON.stringify(cfg), Date.now());
  return id;
}

function rosterDefs(entries: RosterEntry[], side: 0 | 1, humanFirst: boolean, prefix: string): MatchPlayerDef[] {
  return entries.map((e, i) => makePlayerDef(`${prefix}${i}`, e, side, humanFirst && i === 0 ? 0 : -1, T));
}

/** Story / league preset lineups — fixed variants with rolls from rarity mid-band. */
function presetRoster(variants: string[], level: number, roll: number): RosterEntry[] {
  return variants.map((v, i) => {
    const rarity = VARIANT_BY_ID[v]?.rarity ?? "C";
    const base = roll || ({ C: 30, UC: 40, R: 50, E: 58, M: 66, L: 74, WC: 82, N1: 90 }[rarity] ?? 40);
    return {
      variantId: v,
      level,
      talent: Math.max(0, Math.min(100, base + ((i * 7) % 11) - 5)),
      quality: 50,
    };
  });
}

route("POST", "/story/:stageId/start", { body: z.object({}).optional(), rate: [20, 60_000] }, ({ user, params }) => {
  const stage = STAGE_BY_ID[params.stageId];
  if (!stage) fail(404, "Stage not found");
  if (!isUnlocked(stage, clearedStages(user.id))) fail(403, "Clear the previous stage first");
  const mine = presetRoster(stage.preset, Math.max(1, Math.round(stage.recommendedOvr / 4)), 45 + stage.chapter * 6);
  const opp: RosterEntry[] = stage.opp.variants.map((v, i) => ({
    variantId: v,
    level: stage.opp.level,
    talent: Math.max(0, Math.min(100, stage.opp.roll + ((i * 7) % 11) - 5)),
    quality: 50,
  }));
  const cfg: MatchConfig = {
    seed: newSeed(),
    durationSec: stage.durationSec,
    tempo: stage.tempo,
    teams: [
      { name: "Blue Lock", color: "#2563eb", accent: "#dbeafe" },
      { name: stage.opp.name, color: stage.opp.color, accent: stage.opp.accent },
    ],
    players: [...rosterDefs(mine, 0, true, "m"), ...rosterDefs(opp, 1, false, "o")],
    botSkill: [stage.myBotSkill, stage.opp.botSkill],
    goalieSkill: [stage.myGoalie, stage.opp.goalie],
    humanCount: 1,
    formations: ["balanced", "balanced"],
  };
  return { ticketId: saveTicket(user.id, "story", stage.id, cfg), config: cfg, humanSlot: 0 };
});

function leagueCleared(userId: number) {
  return new Set(all<{ team_id: string }>("SELECT team_id FROM league_progress WHERE user_id = ? AND wins > 0", userId).map((r) => r.team_id));
}

function leagueUnlocked(team: LeagueTeam, cleared: Set<string>) {
  if (team.tier === 1) return true;
  const prev = LEAGUE_TEAMS.find((t) => t.tier === team.tier - 1);
  return prev ? cleared.has(prev.id) : false;
}

route("GET", "/league", {}, ({ user }) => {
  const cleared = leagueCleared(user.id);
  const rows = all<{ team_id: string; wins: number; best_score: string | null }>(
    "SELECT team_id, wins, best_score FROM league_progress WHERE user_id = ?",
    user.id,
  );
  const byId = new Map(rows.map((r) => [r.team_id, r]));
  return {
    teams: LEAGUE_TEAMS.map((t) => {
      const st = byId.get(t.id);
      return {
        ...t,
        unlocked: leagueUnlocked(t, cleared),
        wins: st?.wins ?? 0,
        bestScore: st?.best_score ? (JSON.parse(st.best_score) as [number, number]) : null,
      };
    }),
  };
});

route(
  "POST",
  "/league/:teamId/start",
  { body: z.object({ teamId: z.number().int().positive().nullable().optional() }), rate: [20, 60_000] },
  ({ user, params, body }) => {
    const foe = LEAGUE_BY_ID[params.teamId];
    if (!foe) fail(404, "League team not found");
    if (!leagueUnlocked(foe, leagueCleared(user.id))) fail(403, "Beat the previous league team first");
    const mine = buildRoster(user.id, body.teamId ?? null, foe.mySize);
    const opp = foe.variants.map((v, i) => ({
      variantId: v,
      level: foe.level,
      talent: Math.max(0, Math.min(100, foe.roll + ((i * 7) % 11) - 5)),
      quality: 50,
    }));
    const cfg: MatchConfig = {
      seed: newSeed(),
      durationSec: foe.durationSec,
      tempo: foe.tempo,
      teams: [
        { name: mine.team?.name ?? "Your Team", color: "#2563eb", accent: "#dbeafe" },
        { name: foe.name, color: foe.color, accent: foe.accent },
      ],
      players: [...rosterDefs(mine.entries, 0, true, "m"), ...rosterDefs(opp, 1, false, "o")],
      botSkill: [0.55 + foe.tier * 0.03, foe.botSkill],
      goalieSkill: [0.5 + foe.tier * 0.03, foe.goalie],
      humanCount: 1,
      formations: [mine.formation, "balanced"],
    };
    return { ticketId: saveTicket(user.id, "league", foe.id, cfg), config: cfg, humanSlot: 0 };
  },
);

route(
  "POST",
  "/ghost/start",
  { body: z.object({ friendId: z.number().int().positive(), teamId: z.number().int().positive().nullable().optional() }), rate: [20, 60_000] },
  ({ user, body }) => {
    if (body.friendId === user.id) fail(400, "You can't challenge yourself");
    const fr = get("SELECT 1 FROM friends WHERE user_id = ? AND friend_id = ? AND status = 'accepted'", user.id, body.friendId);
    if (!fr) fail(403, "You can only challenge friends' teams");
    const friend = getUser(body.friendId);
    const mine = buildRoster(user.id, body.teamId ?? null, 3);
    let theirs;
    try {
      theirs = buildRoster(friend.id, null, 3);
    } catch {
      fail(409, `${friend.username}'s team is unavailable right now`);
    }
    const cfg: MatchConfig = {
      seed: newSeed(),
      durationSec: T.match.ghostDurationSec,
      tempo: 1.05,
      teams: [
        { name: mine.team?.name ?? "Your Team", color: "#2563eb", accent: "#dbeafe" },
        { name: `${friend.username}'s ${theirs!.team?.name ?? "Team"} (Ghost)`, color: "#b91c1c", accent: "#fecaca" },
      ],
      players: [...rosterDefs(mine.entries, 0, true, "m"), ...rosterDefs(theirs!.entries, 1, false, "g")],
      botSkill: [0.6, 0.72],
      goalieSkill: [0.55, 0.6],
      humanCount: 1,
      formations: [mine.formation, theirs!.formation],
    };
    return { ticketId: saveTicket(user.id, "ghost", String(friend.id), cfg), config: cfg, humanSlot: 0 };
  },
);

function decodeInputs(b64: string, maxTicks: number) {
  const raw = Buffer.from(b64, "base64");
  if (raw.length % 2 !== 0) fail(400, "Malformed input log");
  const out = new Uint8Array(maxTicks);
  let t = 0;
  for (let i = 0; i < raw.length; i += 2) {
    const v = raw[i];
    const n = raw[i + 1];
    if (v > 127 || n === 0) fail(400, "Malformed input log");
    if (t + n > maxTicks) fail(400, "Input log longer than the match");
    out.fill(v, t, t + n);
    t += n;
  }
  return { inputs: out, length: t };
}

route(
  "POST",
  "/match/submit",
  {
    body: z.object({
      ticketId: z.string().min(10).max(40),
      inputs: z.string().max(200_000),
      claimed: z.tuple([z.number().int(), z.number().int()]).optional(),
    }),
    rate: [10, 60_000],
    maxBody: 256 * 1024,
    idempotent: true,
  },
  ({ user, body }) => {
    const ticket = get<{ id: string; user_id: number; mode: string; ref: string; config: string; created_at: number; used: number }>(
      "SELECT * FROM match_tickets WHERE id = ?",
      body.ticketId,
    );
    if (!ticket || ticket.user_id !== user.id) fail(404, "Match not found");
    if (ticket!.used) fail(409, "This match was already submitted");
    if (Date.now() - ticket!.created_at > T.antiCheat.ticketTtlSec * 1000) fail(410, "This match expired");
    run("UPDATE match_tickets SET used = 1 WHERE id = ? AND used = 0", ticket!.id);

    const cfg = JSON.parse(ticket!.config) as MatchConfig;
    const maxTicks = maxMatchTicks(cfg);
    const { inputs } = decodeInputs(body.inputs, maxTicks);
    const s = replay(cfg, [inputs], maxTicks);
    if (s.phase !== 3) fail(400, "Match did not finish");
    const minMs = ((s.tick / TICK_RATE) * 1000) * T.antiCheat.ticketSlackRatio;
    if (Date.now() - ticket!.created_at < minMs) {
      flag(user.id, "match_too_fast", { ticket: ticket!.id, ticks: s.tick });
      fail(400, "Match submitted faster than it could be played");
    }
    if (body.claimed && (body.claimed[0] !== s.score[0] || body.claimed[1] !== s.score[1])) {
      flag(user.id, "score_mismatch", { claimed: body.claimed, verified: s.score });
    }
    const mine = s.score[0];
    const theirs = s.score[1];
    const humanGoals = s.stats[0]?.goals ?? 0;
    const mult = rewardMult(user.id);

    const result = tx(() => {
      const rewards = { coins: 0, gems: 0, xp: 0, items: [] as ReturnType<typeof itemView>[] };
      let stars = 0;
      let firstClear = false;
      let newStars = 0;
      if (ticket!.mode === "story") {
        const stage = STAGE_BY_ID[ticket!.ref];
        stars = starsFor(stage.objective, mine, theirs);
        const prev = get<{ stars: number }>("SELECT stars FROM story_progress WHERE user_id = ? AND stage_id = ?", user.id, stage.id);
        rewards.gems += Math.round(T.economy.storyGoalGems * mine * mult);
        rewards.xp += 20;
        if (stars > 0) {
          firstClear = !prev;
          newStars = Math.max(0, stars - (prev?.stars ?? 0));
          if (firstClear) {
            rewards.gems += stage.rewards.gems;
            rewards.xp += stage.rewards.xp;
            if (stage.rewards.variant) rewards.items.push(itemView(createItem(user.id, "char", stage.rewards.variant, `story:${stage.id}`), []));
          } else {
            rewards.gems += Math.round(stage.rewards.gems * 0.15 * mult);
            rewards.xp += Math.round(stage.rewards.xp * 0.3);
          }
          rewards.gems += newStars * 50;
          run(
            `INSERT INTO story_progress(user_id, stage_id, stars, cleared_at) VALUES (?,?,?,?)
             ON CONFLICT(user_id, stage_id) DO UPDATE SET stars = MAX(stars, excluded.stars)`,
            user.id,
            stage.id,
            stars,
            Date.now(),
          );
          const total = get<{ s: number }>("SELECT COALESCE(SUM(stars),0) AS s FROM story_progress WHERE user_id = ?", user.id)!.s;
          run("UPDATE users SET story_stars = ? WHERE id = ?", total, user.id);
          questEvent(user.id, "story_clear", 1);
          if (stage.id === "1-1") questEvent(user.id, "stage:1-1", 1);
        }
      } else if (ticket!.mode === "league") {
        const foe = LEAGUE_BY_ID[ticket!.ref];
        const win = mine > theirs;
        rewards.xp += win ? 40 : 15;
        if (win) {
          const prev = get<{ wins: number }>("SELECT wins FROM league_progress WHERE user_id = ? AND team_id = ?", user.id, foe.id);
          const first = !prev || prev.wins === 0;
          rewards.gems += Math.round((first ? foe.rewards.gems : T.economy.leagueReplayGems) * mult);
          rewards.xp += first ? foe.rewards.xp : Math.round(foe.rewards.xp * 0.25);
          run(
            `INSERT INTO league_progress(user_id, team_id, wins, best_score, cleared_at) VALUES (?,?,1,?,?)
             ON CONFLICT(user_id, team_id) DO UPDATE SET
               wins = wins + 1,
               best_score = CASE
                 WHEN best_score IS NULL THEN excluded.best_score
                 WHEN (CAST(json_extract(excluded.best_score,'$[0]') AS INT) - CAST(json_extract(excluded.best_score,'$[1]') AS INT))
                    > (CAST(json_extract(best_score,'$[0]') AS INT) - CAST(json_extract(best_score,'$[1]') AS INT))
                 THEN excluded.best_score ELSE best_score END,
               cleared_at = COALESCE(cleared_at, excluded.cleared_at)`,
            user.id,
            foe.id,
            JSON.stringify([mine, theirs]),
            Date.now(),
          );
          questEvent(user.id, "league_win", 1);
        } else {
          rewards.gems += Math.round(4 * mult);
        }
      } else if (ticket!.mode === "ghost") {
        const n = getCounter(user.id, "social_rewarded");
        if (n < T.economy.friendlyDailyRewardedMatches) {
          bumpCounter(user.id, "social_rewarded");
          rewards.gems += Math.round((mine > theirs ? T.economy.ghostGemsWin : T.economy.ghostGemsLoss) * mult);
          rewards.xp += mine > theirs ? 40 : 15;
        }
      }
      if (mine > 0) questEvent(user.id, "goals", mine);
      if (mine > theirs) questEvent(user.id, "wins", 1);
      run("UPDATE users SET goals = goals + ? WHERE id = ?", humanGoals, user.id);
      rewards.xp = Math.round(rewards.xp * mult);
      if (rewards.gems) applyDelta(user.id, { gems: rewards.gems }, `match_${ticket!.mode}`, ticket!.id, { score: s.score });
      const lv = grantXp(user.id, rewards.xp);
      run(
        "INSERT INTO matches(mode, user_a, user_b, score_a, score_b, meta, created_at) VALUES (?,?,?,?,?,?,?)",
        ticket!.mode,
        user.id,
        ticket!.mode === "ghost" ? Number(ticket!.ref) : null,
        mine,
        theirs,
        JSON.stringify({ ref: ticket!.ref }),
        Date.now(),
      );
      return { stars, firstClear, newStars, rewards, levelUp: lv };
    });
    return { score: s.score, stats: s.stats, ...result, user: publicProfile(getUser(user.id)) };
  },
);

/* Quests */

function questProgress(userId: number, q: QuestDef, stored?: { progress: number; claimed: number }) {
  if (q.metric === "account_level") return getUser(userId).level;
  if (q.metric === "items") return get<{ n: number }>("SELECT COUNT(*) AS n FROM items WHERE owner_id = ?", userId)!.n;
  if (q.metric.startsWith("chapter:")) {
    const ch = Number(q.metric.split(":")[1]);
    const cleared = clearedStages(userId);
    return STAGES.filter((s) => s.chapter === ch).every((s) => cleared.has(s.id)) ? 1 : 0;
  }
  return stored?.progress ?? 0;
}

route("GET", "/quests", {}, ({ user }) => {
  const rows = all<{ quest_id: string; period: string; progress: number; claimed: number }>(
    "SELECT quest_id, period, progress, claimed FROM quest_progress WHERE user_id = ? AND (period = ? OR period = 'life')",
    user.id,
    today(),
  );
  const byId = new Map(rows.map((r) => [r.quest_id, r]));
  return {
    day: today(),
    quests: QUESTS.map((q) => {
      const st = byId.get(q.id);
      const progress = Math.min(q.target, questProgress(user.id, q, st));
      return { ...q, progress, claimed: !!st?.claimed, complete: progress >= q.target };
    }),
  };
});

route("POST", "/quests/:id/claim", { rate: [20, 10_000], idempotent: true }, ({ user, params }) => {
  const q = QUEST_BY_ID[params.id];
  if (!q) fail(404, "Quest not found");
  const period = q.period === "daily" ? today() : "life";
  tx(() => {
    const st = get<{ progress: number; claimed: number }>(
      "SELECT progress, claimed FROM quest_progress WHERE user_id = ? AND quest_id = ? AND period = ?",
      user.id,
      q.id,
      period,
    );
    if (st?.claimed) fail(409, "Already claimed");
    if (questProgress(user.id, q, st) < q.target) fail(400, "Quest not complete yet");
    run(
      `INSERT INTO quest_progress(user_id, quest_id, period, progress, claimed) VALUES (?,?,?,?,1)
       ON CONFLICT(user_id, quest_id, period) DO UPDATE SET claimed = 1`,
      user.id,
      q.id,
      period,
      q.target,
    );
    applyDelta(user.id, { gems: q.reward.gems ?? 0 }, "quest", q.id);
  });
  return { user: publicProfile(getUser(user.id)) };
});

/* Leaderboard */

route("GET", "/leaderboard", { auth: false }, ({ url, user }) => {
  const board = url.searchParams.get("board") ?? "rating";
  const col = board === "stars" ? "story_stars" : board === "goals" ? "goals" : "rating";
  const where = board === "rating" ? "WHERE wins + losses + draws > 0" : "";
  const rows = all<{ id: number; username: string; v: number; level: number; wins: number; losses: number }>(
    `SELECT id, username, ${col} AS v, level, wins, losses FROM users ${where} ORDER BY ${col} DESC, id ASC LIMIT 50`,
  );
  let me: { rank: number; v: number } | null = null;
  if (user) {
    const u = getUser(user.id);
    const v = (u as unknown as Record<string, number>)[col];
    const rank = get<{ n: number }>(`SELECT COUNT(*) AS n FROM users ${where ? where + " AND" : "WHERE"} ${col} > ?`, v)!.n + 1;
    me = { rank, v };
  }
  return { board, rows: rows.map((r, i) => ({ rank: i + 1, ...r })), me };
});

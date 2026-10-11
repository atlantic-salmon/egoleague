/**
 * Deterministic match simulation shared by the browser and the server.
 * Only + - * / and Math.sqrt/min/max/abs/floor/imul are used so a replay on
 * the server produces bit-identical results to what the player saw.
 */
import { SKILLS, type AbilityEffect } from "@/shared/catalog";
import type { BallState, GState, MatchConfig, MatchEvent, MatchState, PState } from "./types";

export const TICK_RATE = 60;
export const DT = 1 / TICK_RATE;
export const W = 1680;
export const H = 980;
export const GOAL_W = 190;
export const GOAL_DEPTH = 34;
export const GOAL_TOP = H / 2 - GOAL_W / 2;
export const GOAL_BOT = H / 2 + GOAL_W / 2;
export const PR = 15;
export const BR = 7;
export const GR = 17;

export const IN = { UP: 1, DOWN: 2, LEFT: 4, RIGHT: 8, SHOOT: 16, PASS: 32, ABILITY: 64 } as const;

const FORMATIONS: [number, number][][] = [
  [],
  [[0.44, 0.5]],
  [
    [0.42, 0.34],
    [0.42, 0.66],
  ],
  [
    [0.44, 0.5],
    [0.3, 0.24],
    [0.3, 0.76],
  ],
  [
    [0.45, 0.38],
    [0.45, 0.62],
    [0.27, 0.22],
    [0.27, 0.78],
  ],
  [
    [0.46, 0.5],
    [0.38, 0.18],
    [0.38, 0.82],
    [0.24, 0.36],
    [0.24, 0.64],
  ],
];

function rnd(s: MatchState) {
  s.rng = (s.rng + 0x6d2b79f5) | 0;
  let t = s.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function len(x: number, y: number) {
  return Math.sqrt(x * x + y * y);
}

function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}

function sideIndices(cfg: MatchConfig, side: number) {
  const out: number[] = [];
  for (let i = 0; i < cfg.players.length; i++) if (cfg.players[i].side === side) out.push(i);
  return out;
}

export function homePos(cfg: MatchConfig, i: number): [number, number] {
  const p = cfg.players[i];
  const idx = sideIndices(cfg, p.side);
  const n = Math.min(5, idx.length);
  const slot = Math.min(idx.indexOf(i), 4);
  const f = (FORMATIONS[n] ?? FORMATIONS[5])[slot] ?? [0.3, 0.5];
  const form = cfg.formations?.[p.side] ?? "balanced";
  const fx = f[0] + (form === "attack" ? 0.04 : form === "defend" ? -0.06 : 0);
  const x = p.side === 0 ? fx * W : W - fx * W;
  return [x, f[1] * H];
}

/** Ticks held at full charge before the ball is fumbled. ~0.85s. */
export const OVERHOLD_LIMIT = 51;

function newPlayer(staminaMax = 100): PState {
  return {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    hx: 1,
    hy: 0,
    speed: 0,
    charge: -1,
    overhold: 0,
    kickCd: 0,
    tackleCd: 0,
    tackleT: 0,
    stun: 0,
    stamina: staminaMax,
    aiT: 0,
    aiMode: 0,
    prevShoot: false,
    prevPass: false,
    prevAbility: false,
    abilityT: 0,
    abilityCd: 0,
  };
}

function staminaFactor(p: PState, max: number) {
  const ratio = max > 0 ? p.stamina / max : 1;
  if (ratio >= 0.35) return 0.72 + 0.28 * Math.min(1, ratio / 0.85);
  return 0.42 + 0.3 * (ratio / 0.35);
}

function spendStamina(p: PState, amount: number) {
  p.stamina = Math.max(0, p.stamina - amount);
}

function fumbleBall(s: MatchState, cfg: MatchConfig, i: number) {
  const p = s.players[i];
  const b = s.ball;
  if (b.owner !== i) return;
  b.owner = -1;
  b.vx = p.hx * 90 + (rnd(s) - 0.5) * 160;
  b.vy = p.hy * 90 + (rnd(s) - 0.5) * 160;
  b.lastTouch = i;
  b.lastSide = cfg.players[i].side;
  b.shotId++;
  p.charge = -1;
  p.overhold = 0;
  p.stun = Math.max(p.stun, 54);
  p.speed *= 0.25;
  spendStamina(p, 18);
  s.events.push({ t: "fumble", p: i });
  s.events.push({ t: "kick", x: b.x, y: b.y });
}

function skillOf(cfg: MatchConfig, i: number) {
  return SKILLS[cfg.players[i].skillId] ?? SKILLS.none;
}

function activeEffect(s: MatchState, cfg: MatchConfig, i: number): AbilityEffect | null {
  if (s.players[i].abilityT <= 0) return null;
  return skillOf(cfg, i).ability.effect;
}

function activateAbility(s: MatchState, cfg: MatchConfig, i: number) {
  const p = s.players[i];
  if (p.abilityCd > 0 || p.stun > 0 || s.phase !== 0 || p.stamina < 14) return;
  const skill = skillOf(cfg, i);
  const ab = skill.ability;
  p.abilityT = Math.max(1, Math.floor(ab.durationSec * TICK_RATE));
  p.abilityCd = Math.max(p.abilityT, Math.floor(ab.cooldownSec * TICK_RATE));
  spendStamina(p, 22);
  s.events.push({ t: "ability", p: i, skillId: skill.id });

  const effect = ab.effect;
  if (effect === "shot" && s.ball.owner === i) p.charge = 1;
  if (effect === "steal") {
    const b = s.ball;
    const dx = b.x - p.x;
    const dy = b.y - p.y;
    const d = len(dx, dy);
    if (b.owner < 0 && d < 70) {
      b.owner = i;
      b.vx = b.vy = 0;
      b.lastTouch = i;
      b.lastSide = cfg.players[i].side;
    } else if (b.owner >= 0 && b.owner < 100 && cfg.players[b.owner].side !== cfg.players[i].side && d < 48) {
      b.owner = i;
      b.vx = b.vy = 0;
      b.lastTouch = i;
      b.lastSide = cfg.players[i].side;
    }
  }
  if (effect === "tank") {
    for (let j = 0; j < cfg.players.length; j++) {
      if (cfg.players[j].side === cfg.players[i].side) continue;
      const o = s.players[j];
      if (len(o.x - p.x, o.y - p.y) < 70) {
        o.stun = Math.max(o.stun, 28);
        o.speed *= 0.2;
      }
    }
  }
}

function newGoalie(side: number): GState {
  return { x: side === 0 ? GR + 4 : W - GR - 4, y: H / 2, vx: 0, vy: 0, hold: 0, dive: 0, cd: 0 };
}

export function createMatch(cfg: MatchConfig): MatchState {
  const ball: BallState = {
    x: W / 2,
    y: H / 2,
    vx: 0,
    vy: 0,
    owner: -1,
    lastTouch: -1,
    lastSide: -1,
    shotId: 0,
    checked0: -1,
    checked1: -1,
  };
  const s: MatchState = {
    tick: 0,
    clock: 0,
    phase: 0,
    phaseT: 0,
    score: [0, 0],
    players: cfg.players.map((pl) => newPlayer(pl.stats.staminaMax)),
    goalies: [newGoalie(0), newGoalie(1)],
    ball,
    rng: cfg.seed | 0,
    events: [],
    stats: cfg.players.map(() => ({ goals: 0, shots: 0, passes: 0, tackles: 0 })),
    saves: [0, 0],
    lastGoalSide: -1,
  };
  kickoff(s, cfg, 0);
  return s;
}

function kickoff(s: MatchState, cfg: MatchConfig, kickSide: number) {
  for (let i = 0; i < cfg.players.length; i++) {
    const p = s.players[i];
    const [x, y] = homePos(cfg, i);
    p.x = x;
    p.y = y;
    p.vx = p.vy = p.speed = 0;
    p.hx = cfg.players[i].side === 0 ? 1 : -1;
    p.hy = 0;
    p.charge = -1;
    p.overhold = 0;
    p.stun = p.kickCd = p.tackleCd = p.tackleT = 0;
    p.stamina = Math.min(cfg.players[i].stats.staminaMax, p.stamina + cfg.players[i].stats.staminaMax * 0.22);
  }
  s.goalies = [newGoalie(0), newGoalie(1)];
  const b = s.ball;
  b.x = W / 2;
  b.y = H / 2;
  b.vx = b.vy = 0;
  b.owner = -1;
  let kickers = sideIndices(cfg, kickSide);
  if (kickers.length === 0) kickers = sideIndices(cfg, 1 - kickSide);
  if (kickers.length > 0) {
    const k = kickers[0];
    const p = s.players[k];
    const dir = cfg.players[k].side === 0 ? 1 : -1;
    p.x = W / 2 - dir * (PR + BR + 1);
    p.y = H / 2;
    b.owner = k;
    b.lastTouch = k;
    b.lastSide = cfg.players[k].side;
  }
  s.events.push({ t: "kickoff" });
}

function kick(s: MatchState, cfg: MatchConfig, i: number, dx: number, dy: number, speed: number) {
  const b = s.ball;
  const l = len(dx, dy) || 1;
  b.owner = -1;
  b.vx = (dx / l) * speed;
  b.vy = (dy / l) * speed;
  b.lastTouch = i;
  b.lastSide = cfg.players[i].side;
  b.shotId++;
  s.players[i].kickCd = 14;
  s.events.push({ t: "kick", x: b.x, y: b.y });
}

function shoot(s: MatchState, cfg: MatchConfig, i: number, charge: number, aimX?: number, aimY?: number) {
  const p = s.players[i];
  const def = cfg.players[i];
  const st = def.stats;
  const goalX = def.side === 0 ? W : 0;
  let dx = p.hx;
  let dy = p.hy;
  if (aimX !== undefined && aimY !== undefined) {
    dx = aimX - s.ball.x;
    dy = aimY - s.ball.y;
    const l = len(dx, dy) || 1;
    dx /= l;
    dy /= l;
  } else {
    let gx = goalX - s.ball.x;
    let gy = H / 2 - s.ball.y;
    const gl = len(gx, gy) || 1;
    gx /= gl;
    gy /= gl;
    if (dx * gx + dy * gy > 0.45) {
      dx = dx * 0.75 + gx * 0.25;
      dy = dy * 0.75 + gy * 0.25;
    }
  }
  const noise = (rnd(s) - 0.5) * (1 - st.accuracy) * 0.5 * (0.6 + charge * 0.6) * (activeEffect(s, cfg, i) === "shot" ? 0.45 : 1);
  dx += -dy * noise;
  dy += dx * noise;
  const shotMul = activeEffect(s, cfg, i) === "shot" ? 1.28 : 1;
  const speed = st.shotPower * (0.45 + 0.55 * charge) * cfg.tempo * shotMul;
  kick(s, cfg, i, dx, dy, speed);
  s.stats[i].shots++;
  s.events.push({ t: "shot", p: i, power: charge });
}

function openness(s: MatchState, cfg: MatchConfig, j: number) {
  const pj = s.players[j];
  let best = 220;
  for (let k = 0; k < cfg.players.length; k++) {
    if (cfg.players[k].side === cfg.players[j].side) continue;
    const d = len(s.players[k].x - pj.x, s.players[k].y - pj.y);
    if (d < best) best = d;
  }
  return best;
}

function pass(s: MatchState, cfg: MatchConfig, i: number, isHuman: boolean) {
  const p = s.players[i];
  const def = cfg.players[i];
  const dir = def.side === 0 ? 1 : -1;
  let best = -1;
  let bestScore = -1e9;
  for (let j = 0; j < cfg.players.length; j++) {
    if (j === i || cfg.players[j].side !== def.side) continue;
    const q = s.players[j];
    const dx = q.x - p.x;
    const dy = q.y - p.y;
    const d = len(dx, dy) || 1;
    const open = openness(s, cfg, j);
    let score: number;
    if (isHuman) {
      const dot = (dx * p.hx + dy * p.hy) / d;
      if (dot < 0.25) continue;
      score = dot * 1.4 - d / 1500 + open / 500;
    } else {
      if (d < 60) continue;
      score = (dx * dir) / 600 + open / 200 - d / 1500;
    }
    if (score > bestScore) {
      bestScore = score;
      best = j;
    }
  }
  const st = def.stats;
  if (best >= 0) {
    const q = s.players[best];
    const d = len(q.x - p.x, q.y - p.y);
    const speed = clamp(170 + d * 1.25, 260, 640) * (0.85 + 0.3 * st.passing) * cfg.tempo;
    const lead = (d / speed) * 0.8;
    let tx = q.x + q.vx * lead - s.ball.x;
    let ty = q.y + q.vy * lead - s.ball.y;
    const noise = (rnd(s) - 0.5) * (1 - st.passing) * 0.24;
    const nx = tx + -ty * noise;
    const ny = ty + tx * noise;
    tx = nx;
    ty = ny;
    kick(s, cfg, i, tx, ty, speed);
  } else {
    kick(s, cfg, i, p.hx, p.hy, 360 * cfg.tempo);
  }
  s.stats[i].passes++;
  s.events.push({ t: "pass", p: i });
}

function startTackle(s: MatchState, cfg: MatchConfig, i: number) {
  const p = s.players[i];
  if (p.tackleCd > 0 || p.stun > 0 || p.stamina < 8) return;
  const st = cfg.players[i].stats;
  spendStamina(p, 12);
  p.speed = Math.min(p.speed + 110 * cfg.tempo, st.topSpeed * cfg.tempo * 1.4);
  p.tackleT = 12;
  p.tackleCd = 60;
}

function move(s: MatchState, cfg: MatchConfig, i: number, dx: number, dy: number) {
  const p = s.players[i];
  const st = cfg.players[i].stats;
  if (p.stun > 0) {
    p.speed = Math.max(0, p.speed - 900 * DT);
    p.vx = p.hx * p.speed;
    p.vy = p.hy * p.speed;
    return;
  }
  const fx = activeEffect(s, cfg, i);
  let speedMul = 1;
  let accelMul = 1;
  if (fx === "burst") {
    speedMul = 1.38;
    accelMul = 1.45;
  } else if (fx === "ignite") {
    speedMul = 1.2;
    accelMul = 1.7;
  } else if (fx === "dribble") {
    speedMul = 1.12;
    accelMul = 1.2;
  } else if (fx === "shot") {
    speedMul = 1.08;
  } else if (fx === "vision" || fx === "pass") {
    accelMul = 1.15;
  }
  // Metavision / vision slows nearby opponents.
  if (fx !== "vision") {
    for (let j = 0; j < cfg.players.length; j++) {
      if (j === i || cfg.players[j].side === cfg.players[i].side) continue;
      if (activeEffect(s, cfg, j) === "vision" && len(s.players[j].x - p.x, s.players[j].y - p.y) < 160) {
        speedMul *= 0.58;
        break;
      }
    }
  }
  const stam = staminaFactor(p, st.staminaMax);
  speedMul *= stam;
  accelMul *= 0.55 + 0.45 * stam;
  const mag = Math.min(1, len(dx, dy));
  const carrying = s.ball.owner === i;
  if (mag > 0.05) {
    const ux = dx / (len(dx, dy) || 1);
    const uy = dy / (len(dx, dy) || 1);
    const dot = p.hx * ux + p.hy * uy;
    const t = Math.min(1, st.turnRate * DT * (fx === "dribble" ? 1.35 : 1));
    let nhx = p.hx + (ux - p.hx) * t;
    let nhy = p.hy + (uy - p.hy) * t;
    let hl = len(nhx, nhy);
    if (hl < 0.05) {
      nhx = p.hx - p.hy * 0.3 + ux * 0.2;
      nhy = p.hy + p.hx * 0.3 + uy * 0.2;
      hl = len(nhx, nhy) || 1;
    }
    p.hx = nhx / hl;
    p.hy = nhy / hl;
    p.speed -= p.speed * (1 - dot) * 1.7 * DT;
    const cap = st.topSpeed * cfg.tempo * mag * (carrying ? 0.92 : 1) * speedMul;
    if (p.speed < cap) p.speed = Math.min(cap, p.speed + st.accel * cfg.tempo * accelMul * DT);
    else p.speed = Math.max(cap, p.speed - 600 * DT);
    // Sprint cost scales with effort.
    const effort = p.speed / Math.max(1, st.topSpeed * cfg.tempo);
    if (effort > 0.55) spendStamina(p, (4.2 + effort * 7.5) * DT);
  } else {
    p.speed = Math.max(0, p.speed - 520 * DT);
  }
  if (p.tackleT > 0) p.speed = Math.max(p.speed, st.topSpeed * cfg.tempo * 0.9 * stam);
  p.vx = p.hx * p.speed;
  p.vy = p.hy * p.speed;
}

function botThink(s: MatchState, cfg: MatchConfig, i: number): [number, number] {
  const p = s.players[i];
  const def = cfg.players[i];
  const side = def.side;
  const dir = side === 0 ? 1 : -1;
  const skill = cfg.botSkill[side];
  const b = s.ball;
  p.aiT--;
  const decide = p.aiT <= 0;
  if (decide) p.aiT = Math.max(5, Math.floor(18 - 13 * skill)) + Math.floor(rnd(s) * 4);
  const oppGoalX = side === 0 ? W : 0;
  const ownGoalX = side === 0 ? 0 : W;

  if (b.owner === i) {
    const gx = oppGoalX - p.x;
    const gy = H / 2 - p.y;
    const dg = len(gx, gy) || 1;
    let ox = 0;
    let oy = 0;
    let od = 1e9;
    for (let k = 0; k < cfg.players.length; k++) {
      if (cfg.players[k].side === side) continue;
      const d = len(s.players[k].x - p.x, s.players[k].y - p.y);
      if (d < od) {
        od = d;
        ox = s.players[k].x;
        oy = s.players[k].y;
      }
    }
    let mx = gx / dg;
    let my = gy / dg;
    if (od < 120) {
      const ax = p.x - ox;
      const ay = p.y - oy;
      const al = len(ax, ay) || 1;
      mx += (ax / al) * 0.9;
      my += (ay / al) * 0.9;
    }
    if (decide) {
      if (dg < 280 + 180 * skill && rnd(s) < 0.42 + 0.45 * skill) {
        const ty = H / 2 + (rnd(s) - 0.5) * GOAL_W * 0.7;
        shoot(s, cfg, i, clamp(dg / 480, 0.55, 1), oppGoalX, ty);
      } else if (od < 70 && rnd(s) < 0.32 + 0.55 * skill) {
        pass(s, cfg, i, false);
      } else if (dg > 480 && rnd(s) < 0.14 + 0.1 * skill) {
        pass(s, cfg, i, false);
      }
    }
    return [mx, my];
  }

  const ownerSide =
    b.owner >= 100 ? b.owner - 100 : b.owner >= 0 ? cfg.players[b.owner].side : -1;
  const [hx0, hy0] = homePos(cfg, i);
  let tx = hx0 + (b.x - W / 2) * 0.45;
  let ty = hy0 + (b.y - H / 2) * 0.25;

  if (ownerSide === side) {
    tx += dir * W * 0.16;
    if (b.owner >= 0 && b.owner < 100) {
      const c = s.players[b.owner];
      const cd = len(c.x - p.x, c.y - p.y);
      if (cd < 120) {
        ty += (p.y < c.y ? -1 : 1) * 80;
      }
    }
  } else {
    let rank = 0;
    const myD = len(b.x - p.x, b.y - p.y);
    for (let k = 0; k < cfg.players.length; k++) {
      if (k === i || cfg.players[k].side !== side || cfg.players[k].human >= 0) continue;
      const d = len(b.x - s.players[k].x, b.y - s.players[k].y);
      if (d < myD || (d === myD && k < i)) rank++;
    }
    if (rank === 0) {
      tx = b.x + b.vx * 0.25;
      ty = b.y + b.vy * 0.25;
      if (decide && b.owner >= 0 && b.owner < 100 && ownerSide !== side && myD < 52 && rnd(s) < 0.34 + 0.55 * skill) {
        startTackle(s, cfg, i);
      }
    } else if (rank === 1) {
      tx = b.x + (ownGoalX - b.x) * 0.4;
      ty = b.y + (H / 2 - b.y) * 0.4;
    }
  }
  tx = clamp(tx, PR, W - PR);
  ty = clamp(ty, PR, H - PR);
  const dx = tx - p.x;
  const dy = ty - p.y;
  const d = len(dx, dy);
  if (d < 10) return [0, 0];
  const mag = d < 60 ? d / 60 : 1;
  return [(dx / d) * mag, (dy / d) * mag];
}

function goalieUpdate(s: MatchState, cfg: MatchConfig, side: 0 | 1) {
  const g = s.goalies[side];
  const b = s.ball;
  const skill = cfg.goalieSkill[side];
  const homeX = side === 0 ? GR + 4 : W - GR - 4;
  const out = side === 0 ? 1 : -1;
  if (g.cd > 0) g.cd--;

  if (b.owner === 100 + side) {
    g.hold--;
    b.x = g.x + out * (GR + BR + 2);
    b.y = g.y;
    b.vx = b.vy = 0;
    g.vx = g.vy = 0;
    if (g.hold <= 0) {
      let best = -1;
      let bestOpen = -1;
      for (let j = 0; j < cfg.players.length; j++) {
        if (cfg.players[j].side !== side) continue;
        const o = openness(s, cfg, j);
        if (o > bestOpen) {
          bestOpen = o;
          best = j;
        }
      }
      b.owner = -1;
      b.lastTouch = -1;
      b.lastSide = side;
      b.shotId++;
      if (best >= 0) {
        const q = s.players[best];
        const dx = q.x - b.x;
        const dy = q.y - b.y;
        const d = len(dx, dy) || 1;
        const sp = clamp(d * 1.3 + 200, 300, 600) * cfg.tempo;
        b.vx = (dx / d) * sp;
        b.vy = (dy / d) * sp;
      } else {
        b.vx = out * 520 * cfg.tempo;
        b.vy = (rnd(s) - 0.5) * 300;
      }
      g.cd = 40;
      s.events.push({ t: "kick", x: b.x, y: b.y });
    }
    return;
  }

  let tx = homeX;
  let ty = H / 2 + (b.y - H / 2) * 0.55;
  let diving = false;
  if (b.owner === -1 && b.vx * out < -80) {
    const t = (homeX - b.x) / b.vx;
    if (t > 0 && t < 1.2) {
      const py = b.y + b.vy * t;
      if (py > GOAL_TOP - 30 && py < GOAL_BOT + 30) {
        ty = py;
        diving = t < 0.45;
      }
    }
  } else if (b.owner >= 0 && b.owner < 100 && cfg.players[b.owner].side !== side) {
    const d = len(b.x - homeX, b.y - H / 2);
    if (d < 260) {
      tx = homeX + out * Math.min(80, (260 - d) * 0.45);
      ty = H / 2 + (b.y - H / 2) * 0.8;
    }
  }
  ty = clamp(ty, GOAL_TOP - 14, GOAL_BOT + 14);
  tx = side === 0 ? clamp(tx, homeX, homeX + 90) : clamp(tx, homeX - 90, homeX);
  const maxSp = (diving ? 330 + 220 * skill : 140 + 120 * skill) * cfg.tempo;
  const dx = tx - g.x;
  const dy = ty - g.y;
  const d = len(dx, dy);
  if (d > 0.5) {
    const sp = Math.min(maxSp, d * 8);
    g.vx = (dx / d) * sp;
    g.vy = (dy / d) * sp;
  } else {
    g.vx = g.vy = 0;
  }
  g.x += g.vx * DT;
  g.y += g.vy * DT;
  g.dive = diving ? Math.min(1, g.dive + 0.2) : Math.max(0, g.dive - 0.08);

  const bd = len(b.x - g.x, b.y - g.y);
  if (b.owner === -1 && g.cd === 0) {
    const reach = GR + BR + (diving ? 10 : 2);
    const bs = len(b.vx, b.vy);
    if (bd < reach) {
      const checked = side === 0 ? b.checked0 : b.checked1;
      if (b.lastSide === side || bs < 200) {
        b.owner = 100 + side;
        g.hold = 40;
      } else if (checked !== b.shotId) {
        if (side === 0) b.checked0 = b.shotId;
        else b.checked1 = b.shotId;
        const chance = clamp(0.42 + 0.58 * skill - Math.max(0, bs - 300) / 1700, 0.14, 0.97);
        if (rnd(s) < chance) {
          s.saves[side]++;
          if (bs < 480) {
            b.owner = 100 + side;
            g.hold = 50;
            s.events.push({ t: "save", side, catch: true });
          } else {
            b.vx = out * Math.abs(b.vx) * 0.45;
            b.vy = b.vy * 0.3 + (rnd(s) - 0.5) * 300;
            b.lastSide = side;
            b.lastTouch = -1;
            b.shotId++;
            g.cd = 20;
            s.events.push({ t: "save", side, catch: false });
          }
        }
      }
    }
  } else if (b.owner >= 0 && b.owner < 100 && cfg.players[b.owner].side !== side && bd < GR + BR + 4) {
    if (rnd(s) < 0.08 * (0.55 + skill)) {
      s.players[b.owner].kickCd = 30;
      b.owner = 100 + side;
      g.hold = 40;
      s.saves[side]++;
      s.events.push({ t: "save", side, catch: true });
    }
  }
}

function scoreGoal(s: MatchState, cfg: MatchConfig, scoringSide: 0 | 1) {
  s.score[scoringSide]++;
  const lt = s.ball.lastTouch;
  const scorer = lt >= 0 && lt < cfg.players.length && cfg.players[lt].side === scoringSide ? lt : -1;
  if (scorer >= 0) s.stats[scorer].goals++;
  s.events.push({ t: "goal", side: scoringSide, scorer });
  s.phase = 1;
  s.phaseT = 150;
  s.lastGoalSide = scoringSide;
  s.ball.owner = -1;
  s.ball.vx *= 0.2;
  s.ball.vy *= 0.2;
}

function ballUpdate(s: MatchState, cfg: MatchConfig) {
  const b = s.ball;
  if (b.owner >= 0 && b.owner < 100) {
    const p = s.players[b.owner];
    b.x = p.x + p.hx * (PR + BR + 1);
    b.y = p.y + p.hy * (PR + BR + 1);
    b.vx = p.vx;
    b.vy = p.vy;
    const inMouth = b.y > GOAL_TOP + BR && b.y < GOAL_BOT - BR;
    if (!inMouth) b.x = clamp(b.x, BR, W - BR);
    b.y = clamp(b.y, BR, H - BR);
    if (inMouth && b.x < 0) scoreGoal(s, cfg, 1);
    else if (inMouth && b.x > W) scoreGoal(s, cfg, 0);
    return;
  }
  if (b.owner >= 100) return;

  b.x += b.vx * DT;
  b.y += b.vy * DT;
  const sp = len(b.vx, b.vy);
  if (sp > 0) {
    const ns = Math.max(0, sp - (60 + sp * 0.55) * DT);
    b.vx = (b.vx / sp) * ns;
    b.vy = (b.vy / sp) * ns;
  }
  if (b.y < BR) {
    b.y = BR;
    b.vy = -b.vy * 0.7;
  } else if (b.y > H - BR) {
    b.y = H - BR;
    b.vy = -b.vy * 0.7;
  }
  const inMouth = b.y > GOAL_TOP + BR * 0.5 && b.y < GOAL_BOT - BR * 0.5;
  if (b.x < BR) {
    if (inMouth) {
      if (b.x < -BR) return scoreGoal(s, cfg, 1);
    } else {
      b.x = BR;
      b.vx = -b.vx * 0.7;
    }
  } else if (b.x > W - BR) {
    if (inMouth) {
      if (b.x > W + BR) return scoreGoal(s, cfg, 0);
    } else {
      b.x = W - BR;
      b.vx = -b.vx * 0.7;
    }
  }
  const posts: [number, number][] = [
    [0, GOAL_TOP],
    [0, GOAL_BOT],
    [W, GOAL_TOP],
    [W, GOAL_BOT],
  ];
  for (const [px, py] of posts) {
    const dx = b.x - px;
    const dy = b.y - py;
    const d = len(dx, dy);
    if (d < BR + 4 && d > 0) {
      const nx = dx / d;
      const ny = dy / d;
      const dot = b.vx * nx + b.vy * ny;
      if (dot < 0) {
        b.vx -= 2 * dot * nx;
        b.vy -= 2 * dot * ny;
        b.vx *= 0.7;
        b.vy *= 0.7;
        s.events.push({ t: "post", x: px, y: py });
      }
      b.x = px + nx * (BR + 4);
      b.y = py + ny * (BR + 4);
    }
  }

  let best = -1;
  let bestD = PR + BR + 3;
  for (let i = 0; i < cfg.players.length; i++) {
    const p = s.players[i];
    if (p.kickCd > 0 || p.stun > 0) continue;
    const d = len(b.x - p.x, b.y - p.y);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  if (best >= 0) {
    const p = s.players[best];
    const st = cfg.players[best].stats;
    const bs = len(b.vx, b.vy);
    if (bs > 300 + st.control * 400) {
      const nx = (b.x - p.x) / (bestD || 1);
      const ny = (b.y - p.y) / (bestD || 1);
      const dot = b.vx * nx + b.vy * ny;
      if (dot < 0) {
        b.vx = (b.vx - 2 * dot * nx) * 0.5;
        b.vy = (b.vy - 2 * dot * ny) * 0.5;
      }
      b.lastTouch = best;
      b.lastSide = cfg.players[best].side;
      b.shotId++;
    } else {
      b.owner = best;
      b.lastTouch = best;
      b.lastSide = cfg.players[best].side;
      p.charge = -1;
    }
  }
}

function steals(s: MatchState, cfg: MatchConfig) {
  const b = s.ball;
  if (b.owner < 0 || b.owner >= 100) return;
  const ci = b.owner;
  const c = s.players[ci];
  const cs = cfg.players[ci].stats;
  if (activeEffect(s, cfg, ci) === "dribble") return;
  for (let i = 0; i < cfg.players.length; i++) {
    if (cfg.players[i].side === cfg.players[ci].side) continue;
    const o = s.players[i];
    if (o.stun > 0) continue;
    const d = len(o.x - c.x, o.y - c.y);
    const os = cfg.players[i].stats;
    let chance = 0;
    const stealBoost = activeEffect(s, cfg, i) === "steal" || activeEffect(s, cfg, i) === "vision" ? 1.8 : 1;
    if (o.tackleT > 0 && d < PR * 2.6) chance = ((0.5 * (0.4 + os.tackle)) / (0.4 + cs.control)) * stealBoost;
    else if (d < PR * 2 + 5) chance = ((0.012 * (0.5 + os.tackle)) / (0.5 + cs.control)) * (os.mass / cs.mass) * stealBoost;
    if (chance > 0 && rnd(s) < chance) {
      b.owner = i;
      b.lastTouch = i;
      b.lastSide = cfg.players[i].side;
      c.stun = 24;
      c.speed *= 0.3;
      c.kickCd = 30;
      c.charge = -1;
      o.tackleT = 0;
      s.stats[i].tackles++;
      s.events.push({ t: "tackle", p: i, victim: ci });
      return;
    }
  }
}

function collide(s: MatchState, cfg: MatchConfig) {
  const n = cfg.players.length;
  for (let i = 0; i < n; i++) {
    const a = s.players[i];
    for (let j = i + 1; j < n; j++) {
      const c = s.players[j];
      const dx = c.x - a.x;
      const dy = c.y - a.y;
      const d = len(dx, dy);
      if (d < PR * 2 && d > 0.0001) {
        const ov = PR * 2 - d;
        const ma = cfg.players[i].stats.mass;
        const mc = cfg.players[j].stats.mass;
        const nx = dx / d;
        const ny = dy / d;
        a.x -= nx * ov * (mc / (ma + mc));
        a.y -= ny * ov * (mc / (ma + mc));
        c.x += nx * ov * (ma / (ma + mc));
        c.y += ny * ov * (ma / (ma + mc));
      }
    }
    for (const g of s.goalies) {
      const dx = a.x - g.x;
      const dy = a.y - g.y;
      const d = len(dx, dy);
      if (d < PR + GR && d > 0.0001) {
        a.x = g.x + (dx / d) * (PR + GR);
        a.y = g.y + (dy / d) * (PR + GR);
      }
    }
    a.x = clamp(a.x, PR, W - PR);
    a.y = clamp(a.y, PR, H - PR);
  }
}

export function step(s: MatchState, cfg: MatchConfig, inputs: ArrayLike<number>) {
  s.events = [];
  if (s.phase === 3) return;
  s.tick++;
  if (s.phase === 1) {
    s.phaseT--;
    for (const p of s.players) {
      p.speed = Math.max(0, p.speed - 400 * DT);
      p.x += p.hx * p.speed * DT;
      p.y += p.hy * p.speed * DT;
    }
    const b = s.ball;
    b.x += b.vx * DT;
    b.y += b.vy * DT;
    b.vx *= 0.95;
    b.vy *= 0.95;
    collide(s, cfg);
    if (s.phaseT <= 0) {
      s.phase = 0;
      kickoff(s, cfg, s.lastGoalSide === 0 ? 1 : 0);
    }
    return;
  }

  for (let i = 0; i < cfg.players.length; i++) {
    const p = s.players[i];
    const def = cfg.players[i];
    if (p.kickCd > 0) p.kickCd--;
    if (p.tackleCd > 0) p.tackleCd--;
    if (p.tackleT > 0) p.tackleT--;
    if (p.stun > 0) p.stun--;
    if (p.abilityT > 0) p.abilityT--;
    if (p.abilityCd > 0) p.abilityCd--;
    let dx = 0;
    let dy = 0;
    if (def.human >= 0) {
      const bits = (inputs[def.human] ?? 0) | 0;
      if (bits & IN.UP) dy -= 1;
      if (bits & IN.DOWN) dy += 1;
      if (bits & IN.LEFT) dx -= 1;
      if (bits & IN.RIGHT) dx += 1;
      if (dx !== 0 && dy !== 0) {
        dx *= 0.70710678;
        dy *= 0.70710678;
      }
      const shootHeld = (bits & IN.SHOOT) !== 0;
      const passHeld = (bits & IN.PASS) !== 0;
      const abilityHeld = (bits & IN.ABILITY) !== 0;
      if (abilityHeld && !p.prevAbility) activateAbility(s, cfg, i);
      if (s.ball.owner === i) {
        const chargeMul = activeEffect(s, cfg, i) === "shot" ? 3 : 1;
        const stamCharge = 0.55 + 0.45 * staminaFactor(p, def.stats.staminaMax);
        if (shootHeld) {
          if (p.charge < 0) p.charge = 0;
          if (p.charge < 1) {
            p.charge = Math.min(1, p.charge + def.stats.chargeRate * chargeMul * stamCharge * DT);
            p.overhold = 0;
            spendStamina(p, 9 * DT);
          } else {
            p.charge = 1;
            p.overhold++;
            spendStamina(p, 14 * DT);
            if (p.overhold >= OVERHOLD_LIMIT) fumbleBall(s, cfg, i);
          }
        } else if (p.prevShoot && p.charge >= 0 && s.ball.owner === i) {
          shoot(s, cfg, i, p.charge);
          p.charge = -1;
          p.overhold = 0;
          spendStamina(p, 6);
        } else {
          p.overhold = 0;
        }
        if (passHeld && !p.prevPass && s.ball.owner === i) pass(s, cfg, i, true);
      } else {
        p.charge = -1;
        p.overhold = 0;
        if (shootHeld && !p.prevShoot) startTackle(s, cfg, i);
      }
      p.prevShoot = shootHeld;
      p.prevPass = passHeld;
      p.prevAbility = abilityHeld;
    } else {
      [dx, dy] = botThink(s, cfg, i);
      // Bots fire abilities near the box or when contesting the ball.
      if (p.abilityCd === 0 && rnd(s) < 0.018) {
        const goalX = def.side === 0 ? W : 0;
        const nearGoal = Math.abs(p.x - goalX) < 320;
        const hasBall = s.ball.owner === i;
        const contest = s.ball.owner >= 0 && s.ball.owner < 100 && cfg.players[s.ball.owner].side !== def.side && len(s.ball.x - p.x, s.ball.y - p.y) < 80;
        if (hasBall && nearGoal) activateAbility(s, cfg, i);
        else if (contest && (skillOf(cfg, i).ability.effect === "steal" || skillOf(cfg, i).ability.effect === "tank")) activateAbility(s, cfg, i);
        else if (hasBall && rnd(s) < 0.35) activateAbility(s, cfg, i);
      }
    }
    move(s, cfg, i, dx, dy);
    // Recover stamina when jogging / idle and not charging.
    if (p.stun <= 0 && p.charge < 0) {
      const effort = p.speed / Math.max(1, def.stats.topSpeed * cfg.tempo);
      if (effort < 0.4) {
        const recover = (effort < 0.12 ? 16 : 9) * DT * (0.75 + 0.35 * (def.stats.mass / 1.2));
        p.stamina = Math.min(def.stats.staminaMax, p.stamina + recover);
      }
    }
    p.x += p.vx * DT;
    p.y += p.vy * DT;
  }
  goalieUpdate(s, cfg, 0);
  goalieUpdate(s, cfg, 1);
  collide(s, cfg);
  steals(s, cfg);
  ballUpdate(s, cfg);

  if (s.phase === 0) {
    s.clock++;
    if (s.clock >= cfg.durationSec * TICK_RATE) {
      s.phase = 3;
      s.events.push({ t: "end" });
    }
  }
}

export interface MatchSummary {
  score: [number, number];
  stats: { goals: number; shots: number; passes: number; tackles: number }[];
  saves: [number, number];
  ended: boolean;
}

export function summarize(s: MatchState): MatchSummary {
  return {
    score: [s.score[0], s.score[1]],
    stats: s.stats.map((x) => ({ ...x })),
    saves: [s.saves[0], s.saves[1]],
    ended: s.phase === 3,
  };
}

/** Run a whole match headless from an input log (one byte per tick per human). */
export function replay(cfg: MatchConfig, inputs: Uint8Array[], maxTicks: number) {
  const s = createMatch(cfg);
  const frame = new Array<number>(cfg.humanCount).fill(0);
  for (let t = 0; t < maxTicks && s.phase !== 3; t++) {
    for (let h = 0; h < cfg.humanCount; h++) frame[h] = inputs[h]?.[t] ?? 0;
    step(s, cfg, frame);
  }
  return s;
}

/** Upper bound of ticks a match can last including goal celebrations. */
export function maxMatchTicks(cfg: MatchConfig) {
  return cfg.durationSec * TICK_RATE + 151 * 60 + 10;
}

export type Snapshot = {
  k: number;
  c: number;
  ph: number;
  pt: number;
  sc: [number, number];
  p: number[];
  g: number[];
  b: number[];
};

const r1 = (x: number) => Math.round(x * 10) / 10;

export function snapshot(s: MatchState): Snapshot {
  const p: number[] = [];
  // stride 14: prior 12 + stamina + overhold
  for (const q of s.players)
    p.push(
      r1(q.x),
      r1(q.y),
      r1(q.hx * 100) / 100,
      r1(q.hy * 100) / 100,
      r1(q.speed),
      r1(q.charge),
      q.stun,
      q.tackleT,
      q.abilityT,
      q.kickCd,
      q.tackleCd,
      q.abilityCd,
      r1(q.stamina),
      q.overhold,
    );
  const g: number[] = [];
  for (const q of s.goalies) g.push(r1(q.x), r1(q.y), q.hold, r1(q.dive));
  const b = s.ball;
  return { k: s.tick, c: s.clock, ph: s.phase, pt: s.phaseT, sc: [s.score[0], s.score[1]], p, g, b: [r1(b.x), r1(b.y), r1(b.vx), r1(b.vy), b.owner] };
}

/** Builds a render-only state from snapshots (used by online clients). */
export function stateFromSnapshot(base: MatchState, a: Snapshot, bSnap: Snapshot | null, t: number): MatchState {
  const lerp = (x: number, y: number) => x + (y - x) * t;
  const s = base;
  s.tick = a.k;
  s.clock = bSnap ? Math.round(lerp(a.c, bSnap.c)) : a.c;
  s.phase = a.ph as 0 | 1 | 3;
  s.phaseT = a.pt;
  s.score = [a.sc[0], a.sc[1]];
  const per = s.players.length > 0 ? Math.floor(a.p.length / s.players.length) : 8;
  const stride = per >= 14 ? 14 : per >= 12 ? 12 : per >= 9 ? 9 : 8;
  for (let i = 0; i < s.players.length; i++) {
    const o = i * stride;
    const q = s.players[i];
    const nb = bSnap && bSnap.p.length === a.p.length ? bSnap.p : a.p;
    q.x = lerp(a.p[o], nb[o]);
    q.y = lerp(a.p[o + 1], nb[o + 1]);
    q.hx = lerp(a.p[o + 2], nb[o + 2]);
    q.hy = lerp(a.p[o + 3], nb[o + 3]);
    q.speed = lerp(a.p[o + 4], nb[o + 4]);
    q.charge = a.p[o + 5];
    q.stun = a.p[o + 6];
    q.tackleT = a.p[o + 7];
    q.abilityT = stride >= 9 ? a.p[o + 8] : 0;
    q.kickCd = stride >= 12 ? a.p[o + 9] : 0;
    q.tackleCd = stride >= 12 ? a.p[o + 10] : 0;
    q.abilityCd = stride >= 12 ? a.p[o + 11] : 0;
    q.stamina = stride >= 14 ? a.p[o + 12] : q.stamina;
    q.overhold = stride >= 14 ? a.p[o + 13] : 0;
    q.vx = q.hx * q.speed;
    q.vy = q.hy * q.speed;
  }
  for (let i = 0; i < 2; i++) {
    const o = i * 4;
    const nb = bSnap ? bSnap.g : a.g;
    const g = s.goalies[i];
    g.x = lerp(a.g[o], nb[o]);
    g.y = lerp(a.g[o + 1], nb[o + 1]);
    g.hold = a.g[o + 2];
    g.dive = lerp(a.g[o + 3], nb[o + 3]);
  }
  const nbb = bSnap ? bSnap.b : a.b;
  s.ball.x = lerp(a.b[0], nbb[0]);
  s.ball.y = lerp(a.b[1], nbb[1]);
  s.ball.vx = a.b[2];
  s.ball.vy = a.b[3];
  s.ball.owner = a.b[4];
  return s;
}

export function emptyEvents(): MatchEvent[] {
  return [];
}

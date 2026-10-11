import { BR, GOAL_BOT, GOAL_DEPTH, GOAL_TOP, GOAL_W, GR, H, PR, W } from "./engine";
import type { MatchConfig, MatchEvent, MatchState } from "./types";
import { CHARACTER_BY_ID, BLUE_LOCK_MAN } from "@/shared/catalog";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
}

export interface RenderFx {
  particles: Particle[];
  shake: number;
  flash: number;
  trail: { x: number; y: number }[];
  ballSpin: number;
  phases: number[];
  net: [number, number];
  goalZoom: number;
}

export function createFx(): RenderFx {
  return { particles: [], shake: 0, flash: 0, trail: [], ballSpin: 0, phases: [], net: [0, 0], goalZoom: 0 };
}

export const HUMAN_COLORS = ["#22d3ee", "#facc15", "#f472b6", "#a3e635", "#fb923c", "#c084fc", "#f87171", "#34d399", "#60a5fa", "#fde047"];

function burst(fx: RenderFx, x: number, y: number, n: number, color: string, speed: number, size = 2.5) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.3 + Math.random() * 0.7);
    fx.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, max: 0.35 + Math.random() * 0.4, color, size });
  }
}

export function applyEvents(fx: RenderFx, events: MatchEvent[], s: MatchState, opts: { shake: boolean }) {
  for (const e of events) {
    if (e.t === "kick") burst(fx, e.x, e.y, 6, "rgba(255,255,255,0.9)", 160, 2);
    else if (e.t === "shot") {
      burst(fx, s.ball.x, s.ball.y, 14 + Math.round(e.power * 16), "rgba(56,189,248,0.95)", 260 + e.power * 200, 3);
      if (opts.shake && e.power > 0.7) fx.shake = Math.max(fx.shake, 5);
    } else if (e.t === "goal") {
      const gx = e.side === 0 ? W : 0;
      burst(fx, gx, s.ball.y, 70, e.side === 0 ? "#60a5fa" : "#f87171", 420, 3.5);
      burst(fx, gx, s.ball.y, 40, "#fde047", 300, 2.5);
      fx.net[e.side === 0 ? 1 : 0] = 1;
      if (opts.shake) fx.shake = 16;
      fx.flash = 1;
      fx.goalZoom = 1;
    } else if (e.t === "save") {
      burst(fx, s.ball.x, s.ball.y, 22, "#22d3ee", 260, 3);
      if (opts.shake) fx.shake = Math.max(fx.shake, 7);
    } else if (e.t === "tackle") {
      const p = s.players[e.victim];
      if (p) burst(fx, p.x, p.y, 12, "#fbbf24", 200, 2.5);
      if (opts.shake) fx.shake = Math.max(fx.shake, 4);
    } else if (e.t === "post") {
      burst(fx, e.x, e.y, 14, "#e5e7eb", 220, 2);
      if (opts.shake) fx.shake = Math.max(fx.shake, 6);
    }
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawPitch(ctx: CanvasRenderingContext2D, fx: RenderFx) {
  const stripes = 12;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? "#14532d" : "#166534";
    ctx.fillRect((W / stripes) * i, 0, W / stripes + 1, H);
  }
  const g = ctx.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, W * 0.7);
  g.addColorStop(0, "rgba(255,255,255,0.04)");
  g.addColorStop(1, "rgba(0,0,0,0.35)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, W, H);
  ctx.beginPath();
  ctx.moveTo(W / 2, 0);
  ctx.lineTo(W / 2, H);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(W / 2, H / 2, 90, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath();
  ctx.arc(W / 2, H / 2, 4, 0, Math.PI * 2);
  ctx.fill();
  for (const side of [0, 1]) {
    const x0 = side === 0 ? 0 : W;
    const dir = side === 0 ? 1 : -1;
    ctx.strokeRect(side === 0 ? 0 : W - 170, H / 2 - 190, 170, 380);
    ctx.strokeRect(side === 0 ? 0 : W - 60, H / 2 - 110, 60, 220);
    ctx.beginPath();
    ctx.arc(x0 + dir * 120, H / 2, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x0 + dir * 120, H / 2, 80, side === 0 ? -0.93 : Math.PI - 0.93 + 0.0, side === 0 ? 0.93 : Math.PI + 0.93);
    ctx.stroke();
  }
  ctx.font = "900 120px var(--font-heading), Impact, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255,255,255,0.045)";
  ctx.fillText("BLUE LOCK", W / 2, H / 2);

  for (const side of [0, 1] as const) {
    const x = side === 0 ? -GOAL_DEPTH : W;
    const ripple = fx.net[side];
    ctx.save();
    ctx.fillStyle = "rgba(15,23,42,0.85)";
    ctx.fillRect(x, GOAL_TOP, GOAL_DEPTH, GOAL_W);
    ctx.strokeStyle = `rgba(226,232,240,${0.35 + ripple * 0.5})`;
    ctx.lineWidth = 1;
    const off = ripple * 6 * Math.sin(performance.now() / 40);
    for (let yy = GOAL_TOP; yy <= GOAL_BOT; yy += 10) {
      ctx.beginPath();
      ctx.moveTo(x, yy);
      ctx.lineTo(x + GOAL_DEPTH, yy + off * (side === 0 ? -1 : 1));
      ctx.stroke();
    }
    for (let xx = 0; xx <= GOAL_DEPTH; xx += 8) {
      ctx.beginPath();
      ctx.moveTo(x + xx, GOAL_TOP);
      ctx.lineTo(x + xx + off, GOAL_BOT);
      ctx.stroke();
    }
    ctx.strokeStyle = "#f8fafc";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(side === 0 ? 0 : W, GOAL_TOP);
    ctx.lineTo(side === 0 ? -GOAL_DEPTH : W + GOAL_DEPTH, GOAL_TOP);
    ctx.lineTo(side === 0 ? -GOAL_DEPTH : W + GOAL_DEPTH, GOAL_BOT);
    ctx.lineTo(side === 0 ? 0 : W, GOAL_BOT);
    ctx.stroke();
    ctx.restore();
  }
}

function drawHair(ctx: CanvasRenderingContext2D, charId: string, hx: number, hy: number) {
  const ch = CHARACTER_BY_ID[charId];
  const color = ch?.hair ?? "#111";
  const style = ch?.hairStyle ?? "messy";
  const bx = -hx * 3;
  const by = -hy * 3;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(bx, by, PR * 0.72, 0, Math.PI * 2);
  ctx.fill();
  const ang = Math.atan2(hy, hx);
  if (style === "spiky" || style === "messy" || style === "fluffy") {
    const n = style === "spiky" ? 7 : 5;
    const len = style === "spiky" ? 7 : style === "fluffy" ? 4 : 5;
    for (let i = 0; i < n; i++) {
      const a = ang + Math.PI + ((i - (n - 1) / 2) / n) * 2.6;
      ctx.beginPath();
      ctx.moveTo(bx + Math.cos(a - 0.25) * PR * 0.6, by + Math.sin(a - 0.25) * PR * 0.6);
      ctx.lineTo(bx + Math.cos(a) * (PR * 0.6 + len), by + Math.sin(a) * (PR * 0.6 + len));
      ctx.lineTo(bx + Math.cos(a + 0.25) * PR * 0.6, by + Math.sin(a + 0.25) * PR * 0.6);
      ctx.fill();
    }
  } else if (style === "long") {
    ctx.beginPath();
    ctx.ellipse(bx - hx * 6, by - hy * 6, PR * 0.55, PR * 0.85, ang, 0, Math.PI * 2);
    ctx.fill();
  } else if (style === "bob") {
    ctx.beginPath();
    ctx.arc(bx - hx * 2, by - hy * 2, PR * 0.85, ang + 1.1, ang - 1.1 + Math.PI * 2);
    ctx.fill();
  }
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  cfg: MatchConfig,
  s: MatchState,
  i: number,
  fx: RenderFx,
  dt: number,
  you: number[],
) {
  const p = s.players[i];
  const def = cfg.players[i];
  const team = cfg.teams[def.side];
  const sp = p.speed;
  fx.phases[i] = (fx.phases[i] ?? 0) + sp * dt * 0.09;
  const ph = fx.phases[i];
  const topSp = def.stats.topSpeed * cfg.tempo;
  const hx = p.hx;
  const hy = p.hy;

  ctx.save();
  ctx.translate(p.x, p.y);

  if (sp > topSp * 0.75) {
    ctx.strokeStyle = `rgba(255,255,255,${0.12 + (sp / topSp - 0.75) * 0.8})`;
    ctx.lineWidth = 2;
    for (let k = -1; k <= 1; k++) {
      ctx.beginPath();
      ctx.moveTo(-hx * (PR + 4) - hy * k * 7, -hy * (PR + 4) + hx * k * 7);
      ctx.lineTo(-hx * (PR + 18 + Math.abs(k) * -5) - hy * k * 7, -hy * (PR + 18 + Math.abs(k) * -5) + hx * k * 7);
      ctx.stroke();
    }
  }

  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(3, 5, PR * 1.05, PR * 0.8, 0, 0, Math.PI * 2);
  ctx.fill();

  const swing = Math.sin(ph) * Math.min(1, sp / 90) * 6;
  ctx.fillStyle = "#0f172a";
  for (const k of [-1, 1]) {
    const fx0 = hx * swing * k + -hy * k * 6;
    const fy0 = hy * swing * k + hx * k * 6;
    ctx.beginPath();
    ctx.arc(fx0, fy0, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  const humanIdx = def.human;
  const isYou = humanIdx >= 0 && you.includes(humanIdx);
  if (humanIdx >= 0) {
    const col = HUMAN_COLORS[humanIdx % HUMAN_COLORS.length];
    ctx.strokeStyle = col;
    ctx.lineWidth = isYou ? 3 : 2;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(0, 0, PR + 6 + (isYou ? Math.sin(performance.now() / 180) * 1.5 : 0), 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = def.kit || team.color;
  ctx.strokeStyle = team.color;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, PR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  const ch = CHARACTER_BY_ID[def.charId];
  ctx.fillStyle = ch?.skin ?? "#f1c9a5";
  ctx.beginPath();
  ctx.arc(hx * 2, hy * 2, PR * 0.55, 0, Math.PI * 2);
  ctx.fill();
  drawHair(ctx, def.charId, hx, hy);

  ctx.fillStyle = team.accent;
  ctx.beginPath();
  ctx.moveTo(hx * (PR + 7), hy * (PR + 7));
  ctx.lineTo(hx * (PR + 1) - hy * 5, hy * (PR + 1) + hx * 5);
  ctx.lineTo(hx * (PR + 1) + hy * 5, hy * (PR + 1) - hx * 5);
  ctx.closePath();
  ctx.fill();

  if (p.abilityT > 0) {
    const pulse = 0.45 + Math.sin(performance.now() / 90) * 0.35;
    ctx.strokeStyle = `rgba(34,211,238,${0.35 + pulse * 0.5})`;
    ctx.lineWidth = 5;
    ctx.shadowColor = "#22d3ee";
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(0, 0, PR + 14 + pulse * 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
  if (p.charge >= 0) {
    ctx.strokeStyle = p.charge > 0.95 ? "#f43f5e" : "#38bdf8";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, PR + 11, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p.charge);
    ctx.stroke();
  }
  if (p.stun > 0) {
    const t = performance.now() / 120;
    ctx.fillStyle = "#fde047";
    for (let k = 0; k < 3; k++) {
      const a = t + (k * Math.PI * 2) / 3;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 12, -PR - 6 + Math.sin(a) * 4, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (p.tackleT > 0) {
    ctx.strokeStyle = "rgba(251,191,36,0.8)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, PR + 3, Math.atan2(hy, hx) - 1, Math.atan2(hy, hx) + 1);
    ctx.stroke();
  }

  ctx.font = "700 12px var(--font-sans), sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  const label = humanIdx >= 0 ? `${def.name}` : def.name;
  ctx.fillStyle = "rgba(2,6,23,0.6)";
  const tw = ctx.measureText(label).width + 8;
  roundRect(ctx, -tw / 2, -PR - 24, tw, 15, 4);
  ctx.fill();
  ctx.fillStyle = humanIdx >= 0 ? HUMAN_COLORS[humanIdx % HUMAN_COLORS.length] : "#e2e8f0";
  ctx.fillText(label, 0, -PR - 10);
  ctx.restore();
}

function drawGoalie(ctx: CanvasRenderingContext2D, s: MatchState, side: 0 | 1, cfg: MatchConfig) {
  const g = s.goalies[side];
  const out = side === 0 ? 1 : -1;
  const hx = out;
  const hy = 0;
  const stretch = 1 + g.dive * 0.35;
  const ch = CHARACTER_BY_ID.blm;
  ctx.save();
  ctx.translate(g.x, g.y);
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(3, 5, GR * 1.05, GR * 0.8 * stretch, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.scale(1, stretch);

  // Same athlete silhouette as field players — kit, skin, hair — just larger.
  ctx.fillStyle = BLUE_LOCK_MAN.kit;
  ctx.strokeStyle = cfg.teams[side].color;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, GR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = ch?.skin ?? "#e8c4a0";
  ctx.beginPath();
  ctx.arc(hx * 3, hy * 3, GR * 0.55, 0, Math.PI * 2);
  ctx.fill();

  const prevPR = PR;
  // Temporarily draw hair at goalie scale by scaling around the head.
  ctx.save();
  ctx.translate(hx * 2, hy * 2);
  ctx.scale(GR / prevPR, GR / prevPR);
  drawHair(ctx, "blm", hx, hy);
  ctx.restore();

  ctx.fillStyle = BLUE_LOCK_MAN.accent;
  ctx.beginPath();
  ctx.moveTo(hx * (GR + 8), hy * (GR + 8));
  ctx.lineTo(hx * (GR + 1) - hy * 6, hy * (GR + 1) + hx * 6);
  ctx.lineTo(hx * (GR + 1) + hy * 6, hy * (GR + 1) - hx * 6);
  ctx.closePath();
  ctx.fill();

  ctx.font = "700 11px var(--font-sans), sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  const label = "Blue Lock Man";
  ctx.fillStyle = "rgba(2,6,23,0.6)";
  const tw = ctx.measureText(label).width + 8;
  roundRect(ctx, -tw / 2, -GR - 22, tw, 14, 4);
  ctx.fill();
  ctx.fillStyle = BLUE_LOCK_MAN.accent;
  ctx.fillText(label, 0, -GR - 9);
  ctx.restore();
}

function drawBall(ctx: CanvasRenderingContext2D, s: MatchState, fx: RenderFx, dt: number) {
  const b = s.ball;
  const sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
  fx.ballSpin += sp * dt * 0.06;
  fx.trail.push({ x: b.x, y: b.y });
  if (fx.trail.length > 14) fx.trail.shift();
  if (sp > 380) {
    for (let i = 1; i < fx.trail.length; i++) {
      const a = fx.trail[i - 1];
      const c = fx.trail[i];
      ctx.strokeStyle = `rgba(125,211,252,${(i / fx.trail.length) * 0.6})`;
      ctx.lineWidth = (i / fx.trail.length) * BR * 1.6;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(c.x, c.y);
      ctx.stroke();
    }
  }
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(b.x + 3, b.y + 4, BR, BR * 0.75, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(fx.ballSpin);
  ctx.fillStyle = "#f8fafc";
  ctx.beginPath();
  ctx.arc(0, 0, BR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.arc(0, 0, BR * 0.38, 0, Math.PI * 2);
  ctx.fill();
  for (let k = 0; k < 5; k++) {
    const a = (k * Math.PI * 2) / 5;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * BR * 0.8, Math.sin(a) * BR * 0.8, BR * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function render(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  cfg: MatchConfig,
  s: MatchState,
  fx: RenderFx,
  dt: number,
  you: number[],
) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#020617";
  ctx.fillRect(0, 0, cw, ch);
  const margin = 24;
  const scale = Math.min(cw / (W + GOAL_DEPTH * 2 + margin * 2), ch / (H + margin * 2));
  let ox = (cw - W * scale) / 2;
  let oy = (ch - H * scale) / 2;
  if (fx.shake > 0) {
    ox += (Math.random() - 0.5) * fx.shake * scale * 2;
    oy += (Math.random() - 0.5) * fx.shake * scale * 2;
    fx.shake = Math.max(0, fx.shake - dt * 40);
  }
  ctx.setTransform(scale, 0, 0, scale, ox, oy);
  drawPitch(ctx, fx);
  fx.net[0] = Math.max(0, fx.net[0] - dt * 0.8);
  fx.net[1] = Math.max(0, fx.net[1] - dt * 0.8);

  const order = s.players.map((_, i) => i).sort((a, b) => s.players[a].y - s.players[b].y);
  for (const side of [0, 1] as const) drawGoalie(ctx, s, side, cfg);
  for (const i of order) drawPlayer(ctx, cfg, s, i, fx, dt, you);
  drawBall(ctx, s, fx, dt);

  for (let i = fx.particles.length - 1; i >= 0; i--) {
    const p = fx.particles[i];
    p.life += dt;
    if (p.life >= p.max) {
      fx.particles.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.92;
    p.vy *= 0.92;
    ctx.globalAlpha = 1 - p.life / p.max;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  if (fx.flash > 0) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = `rgba(255,255,255,${fx.flash * 0.35})`;
    ctx.fillRect(0, 0, cw, ch);
    fx.flash = Math.max(0, fx.flash - dt * 2.5);
  }
}

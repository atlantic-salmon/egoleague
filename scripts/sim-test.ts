import { createMatch, replay, step, maxMatchTicks } from "@/game/engine";
import { botRoster, makePlayerDef } from "@/game/setup";
import type { MatchConfig } from "@/game/types";

function cfgFor(seed: number): MatchConfig {
  const a = botRoster(1, 3, ["C", "UC"], 1, 40);
  const b = botRoster(2, 3, ["R", "E"], 5, 50);
  return {
    seed,
    durationSec: 120,
    tempo: 1.1,
    teams: [
      { name: "A", color: "#2563eb", accent: "#fff" },
      { name: "B", color: "#dc2626", accent: "#fff" },
    ],
    players: [
      makePlayerDef("p0", a[0], 0, 0),
      makePlayerDef("p1", a[1], 0, -1),
      makePlayerDef("p2", a[2], 0, -1),
      ...b.map((e, i) => makePlayerDef(`q${i}`, e, 1, -1)),
    ],
    botSkill: [0.6, 0.6],
    goalieSkill: [0.5, 0.5],
    humanCount: 1,
  };
}

const cfg = cfgFor(12345);
const log = new Uint8Array(maxMatchTicks(cfg));
let x = 7;
for (let i = 0; i < log.length; i++) {
  if (i % 20 === 0) x = (x * 1103515245 + 12345) & 0x3f;
  log[i] = x;
}
const s = createMatch(cfg);
let t = 0;
while (s.phase !== 3) {
  step(s, cfg, [log[t]]);
  t++;
}
const r = replay(cfg, [log], maxMatchTicks(cfg));
console.log("live", s.score, "replay", r.score, "ticks", t, "same", JSON.stringify(s.stats) === JSON.stringify(r.stats));
console.log("saves", s.saves, "stats", s.stats);
const t0 = performance.now();
for (let k = 0; k < 10; k++) replay(cfgFor(k), [log], maxMatchTicks(cfg));
console.log("10 replays ms", Math.round(performance.now() - t0));

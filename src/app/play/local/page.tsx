"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Keyboard, Swords, Handshake } from "lucide-react";
import { LocalMatch, type LocalMatchResult } from "@/components/game/match-view";
import { ResultPanel } from "@/components/game/result-panel";
import { PageHeader } from "@/components/states";
import { Portrait } from "@/components/game/portrait";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { makePlayerDef, botRoster } from "@/game/setup";
import type { MatchConfig, MatchPlayerDef } from "@/game/types";
import { CONTROL_HELP, type Scheme } from "@/game/input";
import { VARIANTS, CHARACTER_BY_ID } from "@/shared/catalog";
import { cn } from "@/lib/utils";

const GUEST_ROSTER = VARIANTS.filter((v) => v.rarity === "C" || v.rarity === "UC");

type Mode = "versus" | "coop";

const DIFFS = [
  { id: 0.52, label: "Rookie" },
  { id: 0.72, label: "Selection" },
  { id: 0.9, label: "U-20" },
];

function Picker({ label, value, onChange, color }: { label: string; value: string; onChange: (v: string) => void; color: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold" style={{ color }}>
        <Keyboard className="size-4" /> {label}
      </div>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
        {GUEST_ROSTER.map((v) => (
          <button
            key={v.id}
            onClick={() => onChange(v.id)}
            className={cn(
              "flex flex-col items-center rounded-lg border border-white/10 bg-slate-950/60 p-1 text-[10px] text-slate-300 transition hover:border-white/30",
              value === v.id && "border-2 bg-blue-950/60 text-white",
            )}
            style={value === v.id ? { borderColor: color } : undefined}
            title={`${CHARACTER_BY_ID[v.characterId].name} (${v.label})`}
          >
            <Portrait id={v.characterId} className="h-12 w-12" />
            <span className="w-full truncate text-center">{CHARACTER_BY_ID[v.characterId].name.split(" ")[0]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function LocalPage() {
  const [mode, setMode] = useState<Mode>("versus");
  const [p1, setP1] = useState("isagi.base");
  const [p2, setP2] = useState("bachira.base");
  const [teamSize, setTeamSize] = useState(3);
  const [diff, setDiff] = useState(0.72);
  const [duration, setDuration] = useState(120);
  const [phase, setPhase] = useState<"setup" | "play" | "done">("setup");
  const [config, setConfig] = useState<MatchConfig | null>(null);
  const [result, setResult] = useState<LocalMatchResult | null>(null);
  const schemes = useMemo<Scheme[]>(() => ["p1", "p2"], []);

  const start = () => {
    const seed = Math.floor(Math.random() * 2 ** 30) + 1;
    const entry = (variantId: string) => ({ variantId, level: 5, talent: 50, quality: 50 });
    const players: MatchPlayerDef[] = [];
    if (mode === "versus") {
      players.push(makePlayerDef("p1", entry(p1), 0, 0, undefined, "P1"));
      botRoster(seed, teamSize - 1, ["C", "UC"], 5, 50, [p1.split(".")[0]]).forEach((e, i) => players.push(makePlayerDef(`a${i}`, e, 0, -1)));
      players.push(makePlayerDef("p2", entry(p2), 1, 1, undefined, "P2"));
      botRoster(seed + 1, teamSize - 1, ["C", "UC"], 5, 50, [p2.split(".")[0]]).forEach((e, i) => players.push(makePlayerDef(`b${i}`, e, 1, -1)));
    } else {
      players.push(makePlayerDef("p1", entry(p1), 0, 0, undefined, "P1"));
      players.push(makePlayerDef("p2", entry(p2), 0, 1, undefined, "P2"));
      botRoster(seed, Math.max(0, teamSize - 2), ["C", "UC"], 5, 50, [p1.split(".")[0], p2.split(".")[0]]).forEach((e, i) =>
        players.push(makePlayerDef(`a${i}`, e, 0, -1)),
      );
      botRoster(seed + 1, teamSize, ["UC", "R"], 6, 50).forEach((e, i) => players.push(makePlayerDef(`b${i}`, e, 1, -1)));
    }
    setConfig({
      seed,
      durationSec: duration,
      tempo: 1.12,
      teams:
        mode === "versus"
          ? [
              { name: "Player 1", color: "#0891b2", accent: "#cffafe" },
              { name: "Player 2", color: "#ca8a04", accent: "#fef9c3" },
            ]
          : [
              { name: "Team P1 + P2", color: "#2563eb", accent: "#dbeafe" },
              { name: "Blue Lock Bots", color: "#dc2626", accent: "#fee2e2" },
            ],
      players,
      botSkill: [diff, diff],
      goalieSkill: [diff * 0.9, diff * 0.9],
      humanCount: 2,
    });
    setResult(null);
    setPhase("play");
  };

  if (phase === "play" && config) {
    return (
      <LocalMatch
        key={config.seed}
        config={config}
        schemes={schemes}
        onEnd={(r) => {
          setResult(r);
          setPhase("done");
        }}
      />
    );
  }

  if (phase === "done" && config && result) {
    return (
      <ResultPanel
        config={config}
        score={result.state.score}
        perspective={mode === "coop" ? 0 : null}
        stats={result.state.stats}
        note="Local matches are unranked and don't give rewards."
        actions={
          <>
            <Button size="lg" onClick={start}>
              Rematch
            </Button>
            <Button size="lg" variant="outline" onClick={() => setPhase("setup")}>
              Change setup
            </Button>
          </>
        }
      />
    );
  }

  return (
    <div>
      <PageHeader title="Two players, one keyboard" kicker="Local play">
        <Button variant="ghost" render={<Link href="/play" />} nativeButton={false}>
          Other modes
        </Button>
      </PageHeader>
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        {(
          [
            ["versus", "P1 vs P2", "Head to head. Each player leads a team of bots.", Swords],
            ["coop", "P1 + P2 vs bots", "Team up on the same side against Blue Lock bots.", Handshake],
          ] as const
        ).map(([id, title, desc, Icon]) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={cn(
              "flex items-start gap-3 rounded-2xl border bg-slate-900/70 p-4 text-left transition",
              mode === id ? "border-blue-500 shadow-[0_0_30px_-10px_rgba(59,130,246,0.8)]" : "border-white/10 hover:border-white/25",
            )}
          >
            <Icon className="mt-1 size-5 text-blue-300" />
            <span>
              <span className="block font-heading text-xl uppercase italic text-white">{title}</span>
              <span className="text-sm text-slate-400">{desc}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Picker label={`Player 1 · ${CONTROL_HELP.p1.move}, ${CONTROL_HELP.p1.shoot}, pass ${CONTROL_HELP.p1.pass}`} value={p1} onChange={setP1} color="#22d3ee" />
        <Picker label={`Player 2 · ${CONTROL_HELP.p2.move}, ${CONTROL_HELP.p2.shoot}, pass ${CONTROL_HELP.p2.pass}`} value={p2} onChange={setP2} color="#facc15" />
      </div>
      <div className="mt-4 grid gap-4 rounded-2xl border border-white/10 bg-slate-900/70 p-4 sm:grid-cols-3">
        <div>
          <div className="mb-2 text-sm text-slate-300">
            Players per side: <span className="font-semibold text-white">{teamSize}</span>
          </div>
          <Slider min={mode === "coop" ? 2 : 1} max={5} step={1} value={[Math.max(mode === "coop" ? 2 : 1, teamSize)]} onValueChange={(v) => setTeamSize(Array.isArray(v) ? v[0] : v)} />
        </div>
        <div>
          <div className="mb-2 text-sm text-slate-300">
            Match length: <span className="font-semibold text-white">{Math.floor(duration / 60)}:{String(duration % 60).padStart(2, "0")}</span>
          </div>
          <Slider min={60} max={300} step={30} value={[duration]} onValueChange={(v) => setDuration(Array.isArray(v) ? v[0] : v)} />
        </div>
        <div>
          <div className="mb-2 text-sm text-slate-300">Bot and Blue Lock Man difficulty</div>
          <div className="flex gap-1">
            {DIFFS.map((d) => (
              <Button key={d.id} size="sm" variant={diff === d.id ? "default" : "outline"} onClick={() => setDiff(d.id)}>
                {d.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-500/20 bg-blue-950/30 p-4 text-sm text-slate-300">
        <p>
          No sprint button: hold a direction and your player slowly winds up to their top speed. Sharp turns cost momentum. Without the ball, the shoot key is a
          sliding tackle.
        </p>
        <Button size="lg" onClick={start}>
          <Swords /> Kick off
        </Button>
      </div>
    </div>
  );
}

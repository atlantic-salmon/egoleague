"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft, Film, Loader2, ShieldCheck, Swords, Users, Gift } from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/auth-card";
import { Loading, ErrorState, Empty } from "@/components/states";
import { Cutscene } from "@/components/game/cutscene";
import { LocalMatch, type LocalMatchResult } from "@/components/game/match-view";
import { ResultPanel } from "@/components/game/result-panel";
import { Portrait } from "@/components/game/portrait";
import { RarityBadge } from "@/components/game/item-card";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useSession } from "@/lib/session";
import type { Profile, TeamView, Item } from "@/lib/types";
import type { MatchConfig } from "@/game/types";
import { encodeInputLog, CONTROL_HELP, type Scheme } from "@/game/input";
import { STAGE_BY_ID, CHAPTERS, objectiveText } from "@/shared/story";
import { VARIANT_BY_ID, CHARACTER_BY_ID, variantName } from "@/shared/catalog";
import type { Rarity } from "@/shared/rarity";
import { cn } from "@/lib/utils";

type Phase = "brief" | "before" | "starting" | "play" | "submitting" | "after" | "result";

interface SubmitResult {
  score: [number, number];
  stats: { goals: number; shots: number; passes: number; tackles: number }[];
  stars: number;
  firstClear: boolean;
  newStars: number;
  rewards: { coins: number; gems: number; xp: number; items: Item[] };
  levelUp: { level: number; leveled: number; gems: number };
  user: Profile;
}

function Stage({ stageId }: { stageId: string }) {
  const stage = STAGE_BY_ID[stageId];
  const { setUser } = useSession();
  const teams = useApi<{ teams: TeamView[] }>("/teams");
  const progress = useApi<{ stages: { id: string; stars: number; unlocked: boolean; cleared: boolean }[] }>("/story");
  const [teamId, setTeamId] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("brief");
  const [config, setConfig] = useState<MatchConfig | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [played, setPlayed] = useState<LocalMatchResult | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const schemes = useMemo<Scheme[]>(() => ["solo"], []);

  useEffect(() => {
    if (teamId === null && teams.data?.teams.length) setTeamId((teams.data.teams.find((t) => t.isDefault) ?? teams.data.teams[0]).id);
  }, [teams.data, teamId]);

  if (!stage) return <Empty title="That stage doesn't exist">Head back to Isagi&apos;s path and pick a stage.</Empty>;
  const status = progress.data?.stages.find((s) => s.id === stageId);

  const startMatch = async () => {
    setPhase("starting");
    try {
      const r = await api<{ ticketId: string; config: MatchConfig }>(`/story/${stage.id}/start`, { body: { teamId } });
      setConfig(r.config);
      setTicketId(r.ticketId);
      setPlayed(null);
      setResult(null);
      setPhase("play");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't start the match");
      setPhase("brief");
    }
  };

  const submit = async (r: LocalMatchResult) => {
    if (!ticketId) return;
    setPhase("submitting");
    setSubmitError(null);
    try {
      const res = await api<SubmitResult>("/match/submit", {
        body: { ticketId, inputs: encodeInputLog(r.log), claimed: r.state.score },
        idempotent: true,
      });
      setResult(res);
      setUser(res.user);
      void progress.reload();
      if (res.levelUp.leveled > 0) toast.success(`Level up! You reached level ${res.levelUp.level}${res.levelUp.gems ? ` (+${res.levelUp.gems} gems)` : ""}`);
      setPhase(res.stars > 0 ? "after" : "result");
    } catch (e) {
      setSubmitError(e instanceof ApiError ? e.message : "The server couldn't verify the match");
      setPhase("result");
    }
  };

  if (phase === "before") return <Cutscene id={stage.before} onDone={startMatch} />;
  if (phase === "after") return <Cutscene id={stage.after} onDone={() => setPhase("result")} />;
  if (phase === "starting") return <Loading label="Entering the pitch..." />;

  if (phase === "play" && config) {
    return (
      <div>
        <div className="mb-2 flex items-center justify-between text-sm text-slate-400">
          <span>
            {stage.id} · {stage.title}
          </span>
          <span className="font-semibold text-blue-300">{objectiveText(stage.objective)}</span>
        </div>
        <LocalMatch
          key={ticketId}
          config={config}
          schemes={schemes}
          onEnd={(r) => {
            setPlayed(r);
            void submit(r);
          }}
        />
      </div>
    );
  }

  if (phase === "submitting")
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-slate-300">
        <ShieldCheck className="size-10 text-blue-400" />
        <div className="flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" /> The server is replaying your match to verify the result...
        </div>
      </div>
    );

  if (phase === "result" && config && played) {
    const items = result?.rewards.items ?? [];
    return (
      <ResultPanel
        config={config}
        score={result?.score ?? played.state.score}
        stats={result?.stats ?? played.state.stats}
        stars={result?.stars ?? 0}
        title={`${stage.id} · ${stage.title}`}
        rewards={
          result
            ? {
                coins: result.rewards.coins,
                gems: result.rewards.gems,
                xp: result.rewards.xp,
                items: items.map((it) => ({ name: it.name, rarity: it.rarity })),
              }
            : undefined
        }
        note={
          submitError
            ? `Result not counted: ${submitError}`
            : result?.stars
              ? result.firstClear
                ? "Stage cleared! First-clear rewards granted."
                : result.newStars
                  ? `New best: +${result.newStars} star${result.newStars > 1 ? "s" : ""}.`
                  : "Stage cleared again. Replays give reduced rewards."
              : `Objective failed: ${objectiveText(stage.objective)}. Level up your players or try a different lineup.`
        }
        actions={
          <>
            <Button size="lg" onClick={startMatch}>
              <Swords /> {result?.stars ? "Replay" : "Retry"}
            </Button>
            {result?.stars && stage.id !== "4-2" ? (
              <Button size="lg" variant="secondary" render={<Link href="/story" />} nativeButton={false}>
                Next stage
              </Button>
            ) : null}
            <Button size="lg" variant="outline" onClick={() => setPhase("brief")}>
              Briefing
            </Button>
          </>
        }
      />
    );
  }

  const myTeam = teams.data?.teams.find((t) => t.id === teamId);
  const reward = stage.rewards.variant ? VARIANT_BY_ID[stage.rewards.variant] : null;
  const ch = CHAPTERS[stage.chapter - 1];

  return (
    <div className="space-y-5">
      <Link href="/story" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
        <ArrowLeft className="size-4" /> Isagi&apos;s Path
      </Link>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-blue-500/30 bg-gradient-to-br from-blue-950 to-slate-950 p-6"
      >
        <div className="speedlines absolute inset-0 opacity-10" />
        <div className="relative grid gap-6 md:grid-cols-[1fr_auto]">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-300">
              Chapter {stage.chapter} · {ch.title}
            </div>
            <h1 className="font-heading text-4xl uppercase italic text-white sm:text-5xl">
              {stage.id} {stage.title}
            </h1>
            <p className="mt-2 max-w-xl text-slate-300">{stage.blurb}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              <span className="rounded-full bg-blue-500/20 px-3 py-1 text-blue-100">{objectiveText(stage.objective)}</span>
              <span className="rounded-full bg-slate-800 px-3 py-1 text-slate-200">
                {Math.floor(stage.durationSec / 60)}:{String(stage.durationSec % 60).padStart(2, "0")}
              </span>
              <span className="rounded-full bg-slate-800 px-3 py-1 text-slate-200">Recommended OVR {stage.recommendedOvr}</span>
              {status && <span className="rounded-full bg-amber-500/15 px-3 py-1 text-amber-200">Best: {status.stars}/3 stars</span>}
            </div>
            <div className="mt-4 text-xs text-slate-400">
              Controls: {CONTROL_HELP.solo.move} to move · {CONTROL_HELP.solo.shoot} (hold to charge, tackle without the ball) · {CONTROL_HELP.solo.pass} to pass
            </div>
          </div>
          <div className="flex items-end gap-2">
            {stage.opp.variants.length === 0 ? (
              <Portrait id="blm" className="h-36 w-36" />
            ) : (
              stage.opp.variants.slice(0, 3).map((v) => (
                <div key={v} className="text-center">
                  <Portrait id={VARIANT_BY_ID[v]?.characterId ?? "isagi"} className="h-24 w-24" />
                  <div className="max-w-24 truncate text-[11px] text-slate-400">{CHARACTER_BY_ID[VARIANT_BY_ID[v]?.characterId]?.name}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </motion.div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 font-heading text-lg uppercase italic text-white">
              <Users className="size-5 text-blue-300" /> Your lineup
            </div>
            <Button size="sm" variant="ghost" render={<Link href="/teams" />} nativeButton={false}>
              Edit teams
            </Button>
          </div>
          {teams.loading && !teams.data ? (
            <Loading />
          ) : teams.error ? (
            <ErrorState message={teams.error} onRetry={teams.reload} />
          ) : (
            <>
              <div className="mb-3 flex flex-wrap gap-2">
                {teams.data?.teams.map((t) => (
                  <Button key={t.id} size="sm" variant={t.id === teamId ? "default" : "outline"} onClick={() => setTeamId(t.id)}>
                    {t.name} · {t.ovr}
                  </Button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {Array.from({ length: stage.mySize }).map((_, i) => {
                  const p = myTeam?.players[i];
                  return (
                    <div key={i} className={cn("rounded-xl border p-2 text-center", i === 0 ? "border-cyan-400/50 bg-cyan-950/30" : "border-white/10 bg-slate-950/60")}>
                      <Portrait id={p?.characterId ?? "isagi"} className={cn("mx-auto h-16 w-16", !p && "opacity-30 grayscale")} />
                      <div className="truncate text-xs font-semibold text-white">{p ? CHARACTER_BY_ID[p.characterId]?.name : "Trainee"}</div>
                      <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400">
                        {p ? (
                          <>
                            <RarityBadge rarity={p.rarity as Rarity} /> {p.ovr}
                          </>
                        ) : (
                          "Empty slot"
                        )}
                      </div>
                      {i === 0 && <div className="mt-1 text-[10px] uppercase tracking-wider text-cyan-300">You control</div>}
                    </div>
                  );
                })}
              </div>
              {myTeam && myTeam.ovr < stage.recommendedOvr && (
                <p className="mt-3 text-xs text-amber-300">
                  Your team OVR ({myTeam.ovr}) is below the recommended {stage.recommendedOvr}. Level up players or pull for stronger versions.
                </p>
              )}
            </>
          )}
        </div>
        <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/70 p-4">
          <div className="font-heading text-lg uppercase italic text-white">First clear rewards</div>
          <ul className="space-y-1 text-sm text-slate-300">
            <li>{stage.rewards.gems} gems</li>
            <li>{stage.rewards.coins} coins</li>
            <li>{stage.rewards.xp} XP</li>
            {reward && (
              <li className="flex items-center gap-1 text-fuchsia-200">
                <Gift className="size-4" /> {variantName(reward.id)} <RarityBadge rarity={reward.rarity} />
              </li>
            )}
          </ul>
          <div className="mt-auto flex flex-col gap-2">
            <Button size="lg" onClick={() => setPhase("before")} disabled={status ? !status.unlocked : false}>
              <Film /> Watch and play
            </Button>
            <Button variant="outline" onClick={startMatch} disabled={status ? !status.unlocked : false}>
              <Swords /> Skip to kickoff
            </Button>
            {status && !status.unlocked && <p className="text-xs text-slate-500">Clear {stage.requires} first.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StagePage({ params }: { params: Promise<{ stageId: string }> }) {
  const { stageId } = use(params);
  return (
    <RequireAuth>
      <Stage stageId={stageId} />
    </RequireAuth>
  );
}

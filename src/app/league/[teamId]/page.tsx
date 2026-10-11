"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, ShieldCheck, Swords, Users } from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/auth-card";
import { Loading, Empty, ErrorState } from "@/components/states";
import { LocalMatch, type LocalMatchResult } from "@/components/game/match-view";
import { ResultPanel } from "@/components/game/result-panel";
import { Portrait } from "@/components/game/portrait";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useSession } from "@/lib/session";
import type { Profile, TeamView } from "@/lib/types";
import type { MatchConfig } from "@/game/types";
import { encodeInputLog, type Scheme } from "@/game/input";
import { LEAGUE_BY_ID } from "@/shared/league";
import { VARIANT_BY_ID, CHARACTER_BY_ID } from "@/shared/catalog";
import { defaultTeamId } from "@/lib/teams";
import { cn } from "@/lib/utils";

type Phase = "brief" | "starting" | "play" | "submitting" | "result";

interface SubmitResult {
  score: [number, number];
  stats: { goals: number; shots: number; passes: number; tackles: number }[];
  rewards: { gems: number; xp: number };
  levelUp: { level: number; leveled: number; gems: number };
  user: Profile;
}

function LeagueMatch({ teamId }: { teamId: string }) {
  const foe = LEAGUE_BY_ID[teamId];
  const { setUser } = useSession();
  const teams = useApi<{ teams: TeamView[] }>("/teams");
  const league = useApi<{ teams: { id: string; unlocked: boolean; wins: number }[] }>("/league");
  const [pickedTeam, setTeamId] = useState<number | null>(null);
  const teamIdNum = pickedTeam ?? defaultTeamId(teams.data?.teams);
  const [phase, setPhase] = useState<Phase>("brief");
  const [config, setConfig] = useState<MatchConfig | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [played, setPlayed] = useState<LocalMatchResult | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const schemes = useMemo<Scheme[]>(() => ["solo"], []);

  if (!foe) return <Empty title="Unknown league team">Pick another side from the League ladder.</Empty>;
  const status = league.data?.teams.find((t) => t.id === teamId);

  const startMatch = async () => {
    setPhase("starting");
    try {
      const r = await api<{ ticketId: string; config: MatchConfig }>(`/league/${foe.id}/start`, { body: { teamId: teamIdNum } });
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
      void league.reload();
      if (res.levelUp.leveled > 0) toast.success(`Level up! You reached level ${res.levelUp.level}`);
      setPhase("result");
    } catch (e) {
      setSubmitError(e instanceof ApiError ? e.message : "The server couldn't verify the match");
      setPhase("result");
    }
  };

  if (phase === "starting") return <Loading label="Entering the pitch..." />;
  if (phase === "play" && config) {
    return (
      <div>
        <div className="mb-2 flex items-center justify-between text-sm text-slate-400">
          <span>League · {foe.name}</span>
          <span className="font-semibold text-blue-300">Win the match</span>
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
          <Loader2 className="size-4 animate-spin" /> Verifying match...
        </div>
      </div>
    );

  if (phase === "result" && config && played) {
    const won = (result?.score ?? played.state.score)[0] > (result?.score ?? played.state.score)[1];
    return (
      <ResultPanel
        config={config}
        score={result?.score ?? played.state.score}
        stats={result?.stats ?? played.state.stats}
        title={`League · ${foe.name}`}
        rewards={result ? { gems: result.rewards.gems, xp: result.rewards.xp } : undefined}
        note={
          submitError
            ? `Result not counted: ${submitError}`
            : won
              ? status && status.wins === 0
                ? "First win! Next tier unlocked if this was your frontier."
                : "Win counted. Replay anytime for smaller gem rewards."
              : "Defeat. Adjust your lineup and try again."
        }
        actions={
          <>
            <Button size="lg" onClick={startMatch}>
              <Swords /> {won ? "Replay" : "Retry"}
            </Button>
            <Button size="lg" variant="secondary" render={<Link href="/league" />} nativeButton={false}>
              League ladder
            </Button>
          </>
        }
      />
    );
  }

  const myTeam = teams.data?.teams.find((t) => t.id === teamIdNum);

  return (
    <div className="space-y-5">
      <Link href="/league" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
        <ArrowLeft className="size-4" /> League
      </Link>
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-950 p-6" style={{ borderColor: `${foe.color}66` }}>
        <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Tier {foe.tier}</div>
        <h1 className="font-heading text-4xl uppercase italic text-white">{foe.name}</h1>
        <p className="mt-2 max-w-xl text-slate-300">{foe.blurb}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {foe.variants.map((v) => (
            <div key={v} className="text-center">
              <Portrait id={VARIANT_BY_ID[v]?.characterId ?? "isagi"} className="h-16 w-16" />
              <div className="max-w-16 truncate text-[11px] text-slate-400">{CHARACTER_BY_ID[VARIANT_BY_ID[v]?.characterId ?? ""]?.name.split(" ")[0]}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
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
                  <Button key={t.id} size="sm" variant={t.id === teamIdNum ? "default" : "outline"} onClick={() => setTeamId(t.id)}>
                    {t.name} · {t.ovr}
                  </Button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {Array.from({ length: foe.mySize }).map((_, i) => {
                  const p = myTeam?.players[i];
                  return (
                    <div key={i} className={cn("rounded-xl border p-2 text-center", i === 0 ? "border-cyan-400/50 bg-cyan-950/30" : "border-white/10 bg-slate-950/60")}>
                      <Portrait id={p?.characterId ?? "isagi"} className={cn("mx-auto h-16 w-16", !p && "opacity-30 grayscale")} />
                      <div className="truncate text-xs font-semibold text-white">{p?.name.split(" (")[0] ?? "Empty"}</div>
                      {i === 0 && <div className="mt-1 text-[10px] uppercase tracking-wider text-cyan-300">You control</div>}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
        <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/70 p-4">
          <div className="text-sm text-slate-300">
            First win: <span className="text-cyan-200">{foe.rewards.gems} gems</span> · Replay: smaller gem payout
          </div>
          <Button size="lg" onClick={startMatch} disabled={status ? !status.unlocked : false || !myTeam}>
            <Swords /> Kick off
          </Button>
          {status && !status.unlocked && <p className="text-xs text-slate-500">Beat the previous tier first.</p>}
        </div>
      </div>
    </div>
  );
}

export default function LeagueTeamPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = use(params);
  return (
    <RequireAuth>
      <LeagueMatch teamId={teamId} />
    </RequireAuth>
  );
}

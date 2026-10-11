"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Ghost, Loader2, ShieldCheck, Swords, Users } from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/auth-card";
import { PageHeader, Loading, ErrorState, Empty } from "@/components/states";
import { LocalMatch, type LocalMatchResult } from "@/components/game/match-view";
import { ResultPanel } from "@/components/game/result-panel";
import { Portrait } from "@/components/game/portrait";
import { RarityBadge } from "@/components/game/item-card";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useSession } from "@/lib/session";
import type { Profile } from "@/lib/types";
import type { MatchConfig } from "@/game/types";
import { encodeInputLog, type Scheme } from "@/game/input";
import type { Rarity } from "@/shared/rarity";
import { cn } from "@/lib/utils";

type Friend = { id: number; username: string; level: number; rating: number; online: boolean };
type FriendTeam = { team: { name: string; formation: string; players: { characterId: string; name: string; rarity: Rarity; ovr: number }[] } | null };

function Ghosts() {
  const { setUser } = useSession();
  const friends = useApi<{ friends: Friend[] }>("/friends");
  const [pick, setPick] = useState<number | null>(null);
  const preview = useApi<FriendTeam>(pick ? `/friends/${pick}/team` : null);
  const [phase, setPhase] = useState<"pick" | "play" | "submitting" | "done">("pick");
  const [cfg, setCfg] = useState<{ ticketId: string; config: MatchConfig } | null>(null);
  const [played, setPlayed] = useState<LocalMatchResult | null>(null);
  const [result, setResult] = useState<{ score: [number, number]; stats: LocalMatchResult["state"]["stats"]; rewards: { gems: number; xp: number } } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const schemes = useMemo<Scheme[]>(() => ["solo"], []);

  const start = async () => {
    if (!pick) return;
    try {
      const r = await api<{ ticketId: string; config: MatchConfig }>("/ghost/start", { body: { friendId: pick } });
      setCfg(r);
      setResult(null);
      setErr(null);
      setPhase("play");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't start");
    }
  };

  const submit = async (r: LocalMatchResult) => {
    if (!cfg) return;
    setPlayed(r);
    setPhase("submitting");
    try {
      const res = await api<{ score: [number, number]; stats: LocalMatchResult["state"]["stats"]; rewards: { gems: number; xp: number }; user: Profile }>("/match/submit", {
        body: { ticketId: cfg.ticketId, inputs: encodeInputLog(r.log), claimed: r.state.score },
        idempotent: true,
      });
      setUser(res.user);
      setResult(res);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Verification failed");
    }
    setPhase("done");
  };

  if (phase === "play" && cfg) return <LocalMatch key={cfg.ticketId} config={cfg.config} schemes={schemes} onEnd={submit} />;
  if (phase === "submitting")
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-slate-300">
        <ShieldCheck className="size-10 text-blue-400" />
        <div className="flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" /> Verifying the match on the server...
        </div>
      </div>
    );
  if (phase === "done" && cfg && played)
    return (
      <ResultPanel
        config={cfg.config}
        score={result?.score ?? played.state.score}
        stats={result?.stats ?? played.state.stats}
        title="Ghost match"
        rewards={result ? { gems: result.rewards.gems, xp: result.rewards.xp } : undefined}
        note={err ? `Result not counted: ${err}` : result && !result.rewards.gems ? "Daily friendly reward cap reached. The win still counts toward quests." : undefined}
        actions={
          <>
            <Button size="lg" onClick={start}>
              <Swords /> Rematch
            </Button>
            <Button size="lg" variant="outline" onClick={() => setPhase("pick")}>
              Pick another friend
            </Button>
          </>
        }
      />
    );

  return (
    <div>
      <PageHeader title="Ghost match" kicker="Async vs friends">
        <Button variant="ghost" render={<Link href="/friends" />} nativeButton={false}>
          <Users /> Manage friends
        </Button>
      </PageHeader>
      <p className="mb-4 max-w-2xl text-sm text-slate-400">
        Play against a friend&apos;s default team, controlled by bots, even when they&apos;re offline. You lead your own default lineup. 3v3, server-verified.
      </p>
      {friends.loading && !friends.data ? (
        <Loading />
      ) : friends.error || !friends.data ? (
        <ErrorState message={friends.error ?? "Couldn't load friends"} onRetry={friends.reload} />
      ) : friends.data.friends.length === 0 ? (
        <Empty title="No friends yet" icon={<Ghost className="size-6 text-slate-500" />}>
          Add friends by username on the{" "}
          <Link href="/friends" className="text-blue-300 underline">
            Friends page
          </Link>{" "}
          to challenge their teams.
        </Empty>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-2">
            {friends.data.friends.map((f) => (
              <button
                key={f.id}
                onClick={() => setPick(f.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border bg-slate-900/70 px-4 py-3 text-left transition",
                  pick === f.id ? "border-blue-500" : "border-white/10 hover:border-white/25",
                )}
              >
                <span className={cn("size-2 rounded-full", f.online ? "bg-emerald-400" : "bg-slate-600")} />
                <span className="font-semibold text-white">{f.username}</span>
                <span className="text-xs text-slate-400">
                  Lv {f.level} · {f.rating} rating
                </span>
              </button>
            ))}
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
            {!pick ? (
              <Empty title="Pick a friend">Their default team will appear here.</Empty>
            ) : preview.loading && !preview.data ? (
              <Loading />
            ) : !preview.data?.team ? (
              <Empty title="No team available">That friend hasn&apos;t set up a team yet.</Empty>
            ) : (
              <>
                <div className="font-heading text-xl uppercase italic text-white">{preview.data.team.name}</div>
                <div className="mt-3 space-y-1.5">
                  {preview.data.team.players.slice(0, 3).map((p, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg bg-slate-950/60 px-2 py-1 text-sm">
                      <Portrait id={p.characterId} className="size-9" />
                      <span className="text-white">{p.name}</span>
                      <span className="ml-auto flex items-center gap-1 text-xs text-slate-400">
                        <RarityBadge rarity={p.rarity} /> {p.ovr}
                      </span>
                    </div>
                  ))}
                </div>
                <Button className="mt-4 w-full" size="lg" onClick={start}>
                  <Swords /> Challenge
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function GhostPage() {
  return (
    <RequireAuth>
      <Ghosts />
    </RequireAuth>
  );
}

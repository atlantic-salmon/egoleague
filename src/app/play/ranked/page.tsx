"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Flag, Loader2, Swords, Trophy, X } from "lucide-react";
import { RequireAuth } from "@/components/auth-card";
import { PageHeader, Loading, Empty } from "@/components/states";
import { OnlineMatch } from "@/components/game/match-view";
import { ConnectionBadge, OnlineResult } from "@/components/game/online-bits";
import { Portrait } from "@/components/game/portrait";
import { Button } from "@/components/ui/button";
import { useOnline } from "@/lib/use-online";
import { useApi } from "@/lib/use-api";
import { useSession } from "@/lib/session";
import type { TeamView } from "@/lib/types";

function Ranked() {
  const { user } = useSession();
  const { socket, status, feed, queue, match, end, clearEnd } = useOnline();
  const teams = useApi<{ teams: TeamView[] }>("/teams");
  const [teamId, setTeamId] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (teamId === null && teams.data?.teams.length) setTeamId((teams.data.teams.find((t) => t.isDefault) ?? teams.data.teams[0]).id);
  }, [teams.data, teamId]);

  useEffect(() => {
    if (queue.status !== "searching") return setElapsed(0);
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [queue.status]);

  if (match && feed && socket)
    return (
      <div>
        <div className="mb-2 flex items-center justify-between text-sm text-slate-400">
          <span className="inline-flex items-center gap-1">
            <Trophy className="size-4 text-amber-300" /> Ranked 3v3 · you lead your team, bots fill the rest
          </span>
          <Button size="sm" variant="ghost" className="text-red-300" onClick={() => socket.send({ t: "match.leave" })}>
            <Flag /> Forfeit
          </Button>
        </div>
        <OnlineMatch key={match.matchId} config={match.config} you={match.you} feed={feed} />
      </div>
    );

  if (end)
    return (
      <OnlineResult
        end={end}
        actions={
          <>
            <Button
              size="lg"
              onClick={() => {
                clearEnd();
                socket?.send({ t: "queue.join", teamId });
              }}
            >
              <Swords /> Queue again
            </Button>
            <Button size="lg" variant="outline" onClick={clearEnd}>
              Done
            </Button>
          </>
        }
      />
    );

  const myTeam = teams.data?.teams.find((t) => t.id === teamId);
  const searching = queue.status === "searching";

  return (
    <div>
      <PageHeader title="Ranked" kicker="Online">
        <ConnectionBadge status={status} />
      </PageHeader>
      {!socket || status === "connecting" ? (
        <Loading label="Connecting..." />
      ) : status === "replaced" ? (
        <Empty title="You're connected in another tab">Close the other tab or reload this one to play here.</Empty>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <div className="relative overflow-hidden rounded-3xl border border-amber-400/30 bg-gradient-to-br from-amber-950/40 to-slate-950 p-6">
            <div className="speedlines absolute inset-0 opacity-10" />
            <div className="relative flex flex-col items-center gap-4 py-6 text-center">
              {searching ? (
                <>
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 3, ease: "linear" }} className="rounded-full border-4 border-amber-400/30 border-t-amber-300 p-6">
                    <Portrait id="isagi" expr="ego" className="size-24" />
                  </motion.div>
                  <div className="font-heading text-3xl uppercase italic text-white">Searching for a rival</div>
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <Loader2 className="size-4 animate-spin" /> {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")} · {queue.waiting} in queue
                  </div>
                  <Button variant="outline" onClick={() => socket.send({ t: "queue.leave" })}>
                    <X /> Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Trophy className="size-14 text-amber-300" />
                  <div className="font-heading text-5xl uppercase italic text-white">{user?.rating ?? 1000}</div>
                  <div className="text-sm text-slate-300">
                    {user?.wins ?? 0}W · {user?.losses ?? 0}L · {user?.draws ?? 0}D
                  </div>
                  <p className="max-w-md text-sm text-slate-400">
                    Get matched against another player. You control your captain; the rest of your team is your own lineup, played by bots. Leaving counts as a forfeit.
                  </p>
                  <Button size="lg" onClick={() => socket.send({ t: "queue.join", teamId })} disabled={!teams.data}>
                    <Swords /> Find match
                  </Button>
                </>
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
            <div className="mb-2 font-heading text-lg uppercase italic text-white">Lineup</div>
            <div className="flex flex-wrap gap-2">
              {teams.data?.teams.map((t) => (
                <Button key={t.id} size="sm" disabled={searching} variant={t.id === teamId ? "default" : "outline"} onClick={() => setTeamId(t.id)}>
                  {t.name} · {t.ovr}
                </Button>
              ))}
            </div>
            <div className="mt-3 space-y-1.5">
              {myTeam?.players.slice(0, 3).map((p, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg bg-slate-950/60 px-2 py-1 text-sm">
                  <Portrait id={p?.characterId ?? "isagi"} className={p ? "size-8" : "size-8 opacity-30 grayscale"} />
                  <span className="text-white">{p ? p.name : "Trainee"}</span>
                  <span className="ml-auto text-xs text-slate-400">{p ? `OVR ${p.ovr}` : ""}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-500">Ranked uses the first three slots of the team.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RankedPage() {
  return (
    <RequireAuth>
      <Ranked />
    </RequireAuth>
  );
}

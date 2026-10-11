"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Lock, Medal, Swords, RotateCcw } from "lucide-react";
import { RequireAuth } from "@/components/auth-card";
import { PageHeader, Loading, ErrorState } from "@/components/states";
import { Portrait } from "@/components/game/portrait";
import { Button } from "@/components/ui/button";
import { useApi } from "@/lib/use-api";
import { VARIANT_BY_ID, CHARACTER_BY_ID } from "@/shared/catalog";
import { cn } from "@/lib/utils";
import type { LeagueTeam } from "@/shared/league";

type LeagueTeamView = LeagueTeam & {
  unlocked: boolean;
  wins: number;
  bestScore: [number, number] | null;
};

export default function LeaguePage() {
  return (
    <RequireAuth>
      <LeagueHub />
    </RequireAuth>
  );
}

function LeagueHub() {
  const { data, loading, error, reload } = useApi<{ teams: LeagueTeamView[] }>("/league");
  return (
    <div>
      <PageHeader title="League" kicker="Climb the ladder">
        <p className="max-w-xl text-sm text-slate-400">
          Face escalating teams with your own collection lineup. Beat a side to unlock the next. Replays always count — farm gems and sharpen your ego.
        </p>
      </PageHeader>
      {loading && !data ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <div className="grid gap-3">
          {data?.teams.map((t, i) => {
            const face = t.variants[0];
            const ch = VARIANT_BY_ID[face]?.characterId ?? "isagi";
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={cn(
                  "relative overflow-hidden rounded-2xl border bg-slate-900/70 p-4",
                  t.unlocked ? "border-white/10" : "border-white/5 opacity-70",
                )}
              >
                <div className="absolute inset-y-0 left-0 w-1.5" style={{ background: t.color }} />
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <Portrait id={ch} className={cn("h-20 w-20 shrink-0", !t.unlocked && "grayscale")} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                        Tier {t.tier}
                      </span>
                      {t.wins > 0 && (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-2 py-0.5 text-[11px] text-emerald-200">
                          <Medal className="size-3" /> {t.wins} win{t.wins === 1 ? "" : "s"}
                        </span>
                      )}
                      {t.bestScore && (
                        <span className="text-[11px] text-slate-500">
                          Best {t.bestScore[0]}-{t.bestScore[1]}
                        </span>
                      )}
                    </div>
                    <h2 className="font-heading text-2xl uppercase italic text-white">{t.name}</h2>
                    <p className="text-sm text-slate-400">{t.blurb}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {t.variants.slice(0, 5).map((v) => (
                        <span key={v} className="rounded bg-slate-950 px-1.5 py-0.5 text-[11px] text-slate-400">
                          {CHARACTER_BY_ID[VARIANT_BY_ID[v]?.characterId ?? ""]?.name.split(" ")[0] ?? v}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                    <div className="text-xs text-slate-500">
                      {t.rewards.gems} gems · {t.rewards.xp} XP first win
                    </div>
                    {t.unlocked ? (
                      <Button render={<Link href={`/league/${t.id}`} />} nativeButton={false}>
                        {t.wins > 0 ? (
                          <>
                            <RotateCcw /> Replay
                          </>
                        ) : (
                          <>
                            <Swords /> Challenge
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button disabled variant="outline">
                        <Lock /> Locked
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Lock, Star, Swords, Gift } from "lucide-react";
import { RequireAuth } from "@/components/auth-card";
import { PageHeader, Loading, ErrorState } from "@/components/states";
import { Portrait } from "@/components/game/portrait";
import { useApi } from "@/lib/use-api";
import { CHAPTERS, STAGES, objectiveText } from "@/shared/story";
import { variantName, VARIANT_BY_ID } from "@/shared/catalog";
import { cn } from "@/lib/utils";

type StageStatus = { id: string; stars: number; unlocked: boolean; cleared: boolean };

const CHAPTER_ART: Record<number, { portrait: string; tint: string }> = {
  1: { portrait: "isagi", tint: "from-blue-700/40" },
  2: { portrait: "rin", tint: "from-emerald-700/40" },
  3: { portrait: "sae", tint: "from-slate-500/40" },
  4: { portrait: "kaiser", tint: "from-amber-600/40" },
};

function StoryMap() {
  const { data, error, loading, reload } = useApi<{ stages: StageStatus[] }>("/story");
  if (loading && !data) return <Loading label="Loading Isagi's path..." />;
  if (error || !data) return <ErrorState message={error ?? "Couldn't load the story"} onRetry={reload} />;
  const byId = new Map(data.stages.map((s) => [s.id, s]));
  const total = data.stages.reduce((a, s) => a + s.stars, 0);

  return (
    <div>
      <PageHeader title="Isagi's Path" kicker="Story mode">
        <div className="flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-sm text-amber-200">
          <Star className="size-4 fill-amber-400 text-amber-400" /> {total} / {STAGES.length * 3}
        </div>
      </PageHeader>
      <div className="space-y-8">
        {CHAPTERS.map((ch) => {
          const stages = STAGES.filter((s) => s.chapter === ch.n);
          const open = stages.some((s) => byId.get(s.id)?.unlocked);
          const art = CHAPTER_ART[ch.n];
          return (
            <section key={ch.n} className={cn("relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br to-slate-950 p-5 sm:p-6", art.tint, !open && "opacity-60")}>
              <Portrait id={art.portrait} expr="ego" className="pointer-events-none absolute -right-6 -top-4 h-48 w-48 opacity-25 sm:h-64 sm:w-64" />
              <div className="relative">
                <div className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-300">Chapter {ch.n}</div>
                <h2 className="font-heading text-3xl uppercase italic text-white">{ch.title}</h2>
                <p className="text-sm text-slate-300">{ch.subtitle}</p>
                <div className="relative mt-5 grid gap-3 md:grid-cols-3">
                  {stages.map((s, i) => {
                    const st = byId.get(s.id);
                    const locked = !st?.unlocked;
                    const reward = s.rewards.variant ? VARIANT_BY_ID[s.rewards.variant] : null;
                    const card = (
                      <motion.div
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className={cn(
                          "group relative flex h-full flex-col rounded-2xl border bg-slate-950/80 p-4 transition",
                          locked ? "border-white/5" : "border-blue-500/30 hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-[0_0_30px_-10px_rgba(59,130,246,0.9)]",
                          st && st.unlocked && !st.cleared && "ring-2 ring-blue-500/60",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-heading text-sm text-blue-300">{s.id}</div>
                            <div className="font-heading text-lg uppercase italic leading-tight text-white">{s.title}</div>
                          </div>
                          {locked ? (
                            <Lock className="size-5 text-slate-500" />
                          ) : (
                            <div className="flex">
                              {[1, 2, 3].map((n) => (
                                <Star key={n} className={cn("size-4", n <= (st?.stars ?? 0) ? "fill-amber-400 text-amber-400" : "text-slate-700")} />
                              ))}
                            </div>
                          )}
                        </div>
                        <p className="mt-2 flex-1 text-sm text-slate-400">{s.blurb}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                          <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-blue-200">{objectiveText(s.objective)}</span>
                          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-slate-300">
                            {s.preset.length === 1 ? "Solo" : `${s.preset.length}v${s.opp.variants.length || 1}`}
                          </span>
                          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-slate-300">Rec. OVR {s.recommendedOvr}</span>
                          {reward && !st?.cleared && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-fuchsia-500/15 px-2 py-0.5 text-fuchsia-200">
                              <Gift className="size-3" /> {variantName(reward.id)}
                            </span>
                          )}
                        </div>
                        {!locked && (
                          <div className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-blue-300 group-hover:text-white">
                            <Swords className="size-4" /> {st?.cleared ? "Replay" : "Play"}
                          </div>
                        )}
                        {locked && s.requires && <div className="mt-3 text-xs text-slate-500">Clear {s.requires} to unlock</div>}
                      </motion.div>
                    );
                    return locked ? (
                      <div key={s.id} aria-disabled>
                        {card}
                      </div>
                    ) : (
                      <Link key={s.id} href={`/story/${s.id}`} className="block">
                        {card}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export default function StoryPage() {
  return (
    <RequireAuth>
      <StoryMap />
    </RequireAuth>
  );
}

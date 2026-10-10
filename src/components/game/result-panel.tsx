"use client";

import { motion } from "motion/react";
import { Coins, Gem, Star, Sparkles, TrendingUp, TrendingDown } from "lucide-react";
import type { MatchConfig } from "@/game/types";
import { cn } from "@/lib/utils";

export interface ResultStat {
  goals: number;
  shots: number;
  passes: number;
  tackles: number;
}

export function ResultPanel({
  config,
  score,
  perspective = 0,
  stats,
  stars,
  rewards,
  note,
  actions,
  title,
}: {
  config: MatchConfig;
  score: [number, number];
  perspective?: 0 | 1 | null;
  stats?: ResultStat[];
  stars?: number;
  rewards?: { coins?: number; gems?: number; xp?: number; ratingDelta?: number; items?: { name: string; rarity: string }[] };
  note?: string;
  actions: React.ReactNode;
  title?: string;
}) {
  const mine = perspective === null ? null : score[perspective];
  const theirs = perspective === null ? null : score[1 - perspective];
  const outcome = mine === null || theirs === null ? (score[0] === score[1] ? "Draw" : score[0] > score[1] ? `${config.teams[0].name} wins` : `${config.teams[1].name} wins`) : mine > theirs ? "Victory" : mine < theirs ? "Defeat" : "Draw";
  const win = outcome === "Victory";
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="relative mx-auto w-full max-w-2xl overflow-hidden rounded-3xl border border-blue-500/30 bg-slate-950/95 p-6 shadow-[0_0_80px_-20px_rgba(37,99,235,0.8)]"
    >
      <div className="speedlines absolute inset-0 opacity-10" />
      <div className="relative text-center">
        <div className="text-xs uppercase tracking-[0.3em] text-slate-400">{title ?? "Full time"}</div>
        <div className={cn("font-heading text-6xl uppercase italic", win ? "text-blue-300 text-glow" : outcome === "Defeat" ? "text-red-400" : "text-white")}>{outcome}</div>
        <div className="mt-3 flex items-center justify-center gap-4 font-heading text-4xl text-white">
          <span className="max-w-[10rem] truncate text-base font-semibold text-slate-300">{config.teams[0].name}</span>
          <span className="tabular-nums">
            {score[0]} - {score[1]}
          </span>
          <span className="max-w-[10rem] truncate text-base font-semibold text-slate-300">{config.teams[1].name}</span>
        </div>
        {stars !== undefined && (
          <div className="mt-3 flex justify-center gap-1">
            {[1, 2, 3].map((n) => (
              <motion.span key={n} initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.3 + n * 0.15, type: "spring" }}>
                <Star className={cn("size-9", n <= stars ? "fill-amber-400 text-amber-400" : "text-slate-700")} />
              </motion.span>
            ))}
          </div>
        )}
        {rewards && (
          <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm">
            {!!rewards.coins && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-3 py-1 text-amber-200">
                <Coins className="size-4" /> +{rewards.coins}
              </span>
            )}
            {!!rewards.gems && (
              <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/15 px-3 py-1 text-cyan-200">
                <Gem className="size-4" /> +{rewards.gems}
              </span>
            )}
            {!!rewards.xp && <span className="rounded-full bg-blue-500/15 px-3 py-1 text-blue-200">+{rewards.xp} XP</span>}
            {rewards.ratingDelta !== undefined && (
              <span className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1", rewards.ratingDelta >= 0 ? "bg-emerald-500/15 text-emerald-200" : "bg-red-500/15 text-red-200")}>
                {rewards.ratingDelta >= 0 ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
                {rewards.ratingDelta >= 0 ? "+" : ""}
                {rewards.ratingDelta} rating
              </span>
            )}
            {rewards.items?.map((it, i) => (
              <span key={i} className="inline-flex items-center gap-1 rounded-full bg-fuchsia-500/15 px-3 py-1 text-fuchsia-200">
                <Sparkles className="size-4" /> {it.name}
              </span>
            ))}
          </div>
        )}
        {note && <p className="mt-3 text-sm text-slate-400">{note}</p>}
        {stats && (
          <div className="mt-5 overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-3 py-2">Player</th>
                  <th className="px-2 py-2 text-right">G</th>
                  <th className="px-2 py-2 text-right">Shots</th>
                  <th className="px-2 py-2 text-right">Passes</th>
                  <th className="px-3 py-2 text-right">Tackles</th>
                </tr>
              </thead>
              <tbody>
                {config.players.map((p, i) => (
                  <tr key={p.key} className="border-t border-white/5">
                    <td className="px-3 py-1.5">
                      <span className="mr-2 inline-block size-2 rounded-full" style={{ background: config.teams[p.side].color }} />
                      <span className={p.human >= 0 ? "font-semibold text-white" : "text-slate-300"}>{p.name}</span>
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{stats[i]?.goals ?? 0}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{stats[i]?.shots ?? 0}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{stats[i]?.passes ?? 0}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{stats[i]?.tackles ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-2">{actions}</div>
      </div>
    </motion.div>
  );
}

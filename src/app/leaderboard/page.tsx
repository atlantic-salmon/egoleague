"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Crown, Goal, Star, Trophy } from "lucide-react";
import { PageHeader, Loading, ErrorState, Empty } from "@/components/states";
import { Button } from "@/components/ui/button";
import { useApi } from "@/lib/use-api";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

type Board = "rating" | "stars" | "goals";
interface Row {
  rank: number;
  id: number;
  username: string;
  v: number;
  level: number;
  wins: number;
  losses: number;
}

const BOARDS: { id: Board; label: string; icon: typeof Trophy; unit: string }[] = [
  { id: "rating", label: "Ranked rating", icon: Trophy, unit: "rating" },
  { id: "stars", label: "Story stars", icon: Star, unit: "stars" },
  { id: "goals", label: "Total goals", icon: Goal, unit: "goals" },
];

const PODIUM = ["text-amber-300", "text-slate-200", "text-orange-400"];

export default function LeaderboardPage() {
  const { user } = useSession();
  const [board, setBoard] = useState<Board>("rating");
  const { data, error, loading, reload } = useApi<{ rows: Row[]; me: { rank: number; v: number } | null }>(`/leaderboard?board=${board}`);
  const b = BOARDS.find((x) => x.id === board)!;

  return (
    <div>
      <PageHeader title="Leaderboard" kicker="Who's the world's #1?">
        {BOARDS.map((x) => (
          <Button key={x.id} size="sm" variant={board === x.id ? "default" : "outline"} onClick={() => setBoard(x.id)}>
            <x.icon /> {x.label}
          </Button>
        ))}
      </PageHeader>
      {user && data?.me && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-cyan-400/30 bg-cyan-950/30 px-4 py-3 text-sm">
          <span className="text-slate-300">Your rank</span>
          <span className="font-heading text-2xl text-white">#{data.me.rank}</span>
          <span className="text-slate-400">
            {data.me.v.toLocaleString()} {b.unit}
          </span>
        </div>
      )}
      {loading && !data ? (
        <Loading />
      ) : error || !data ? (
        <ErrorState message={error ?? "Couldn't load the leaderboard"} onRetry={reload} />
      ) : data.rows.length === 0 ? (
        <Empty title="No one on this board yet">{board === "rating" ? "Play a ranked match to get on the board." : "Be the first."}</Empty>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="w-16 px-4 py-2">#</th>
                <th className="px-2 py-2">Player</th>
                <th className="hidden px-2 py-2 sm:table-cell">Level</th>
                {board === "rating" && <th className="hidden px-2 py-2 sm:table-cell">W-L</th>}
                <th className="px-4 py-2 text-right">{b.label}</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r, i) => (
                <motion.tr
                  key={r.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i, 20) * 0.02 }}
                  className={cn("border-t border-white/5 bg-slate-950/60", r.id === user?.id && "bg-cyan-950/40")}
                >
                  <td className="px-4 py-2">
                    <span className={cn("inline-flex items-center gap-1 font-heading text-lg", PODIUM[i] ?? "text-slate-400")}>
                      {i === 0 && <Crown className="size-4" />}
                      {r.rank}
                    </span>
                  </td>
                  <td className="px-2 py-2 font-semibold text-white">{r.username}</td>
                  <td className="hidden px-2 py-2 text-slate-400 sm:table-cell">{r.level}</td>
                  {board === "rating" && (
                    <td className="hidden px-2 py-2 text-slate-400 sm:table-cell">
                      {r.wins}-{r.losses}
                    </td>
                  )}
                  <td className="px-4 py-2 text-right font-heading text-lg tabular-nums text-white">{r.v.toLocaleString()}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

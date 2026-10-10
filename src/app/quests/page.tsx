"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { CheckCircle2, Coins, Gem, Hammer, CalendarClock, Trophy } from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/auth-card";
import { PageHeader, Loading, ErrorState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useSession } from "@/lib/session";
import type { Profile } from "@/lib/types";
import type { QuestDef } from "@/shared/quests";
import { cn } from "@/lib/utils";

type QuestView = QuestDef & { progress: number; claimed: boolean; complete: boolean };

function Reward({ r }: { r: QuestDef["reward"] }) {
  return (
    <div className="flex flex-wrap gap-1.5 text-xs">
      {!!r.gems && (
        <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/15 px-2 py-0.5 text-cyan-200">
          <Gem className="size-3" /> {r.gems}
        </span>
      )}
      {!!r.coins && (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-200">
          <Coins className="size-3" /> {r.coins}
        </span>
      )}
      {!!r.shards && (
        <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/15 px-2 py-0.5 text-violet-200">
          <Hammer className="size-3" /> {r.shards} shards
        </span>
      )}
    </div>
  );
}

function QuestList({ quests, onClaim, busy }: { quests: QuestView[]; onClaim: (id: string) => void; busy: string | null }) {
  const sorted = [...quests].sort((a, b) => Number(a.claimed) - Number(b.claimed) || Number(b.complete) - Number(a.complete));
  return (
    <div className="grid gap-2">
      {sorted.map((q, i) => (
        <motion.div
          key={q.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03 }}
          className={cn(
            "flex flex-col gap-3 rounded-xl border bg-slate-900/70 p-3 sm:flex-row sm:items-center",
            q.complete && !q.claimed ? "border-emerald-400/50 shadow-[0_0_24px_-10px_rgba(52,211,153,0.9)]" : "border-white/10",
            q.claimed && "opacity-60",
          )}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white">{q.title}</span>
              {q.claimed && <CheckCircle2 className="size-4 text-emerald-400" />}
            </div>
            <div className="text-sm text-slate-400">{q.desc}</div>
            <div className="mt-2 flex items-center gap-2">
              <Progress value={(q.progress / q.target) * 100} className="max-w-64" />
              <span className="text-xs tabular-nums text-slate-400">
                {q.progress} / {q.target}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:flex-col sm:items-end">
            <Reward r={q.reward} />
            <Button size="sm" disabled={!q.complete || q.claimed || busy === q.id} onClick={() => onClaim(q.id)}>
              {q.claimed ? "Claimed" : q.complete ? "Claim" : "In progress"}
            </Button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function Quests() {
  const { setUser } = useSession();
  const { data, error, loading, reload } = useApi<{ day: string; quests: QuestView[] }>("/quests");
  const [busy, setBusy] = useState<string | null>(null);

  if (loading && !data) return <Loading label="Loading quests..." />;
  if (error || !data) return <ErrorState message={error ?? "Couldn't load quests"} onRetry={reload} />;

  const claim = async (id: string) => {
    setBusy(id);
    try {
      const r = await api<{ user: Profile }>(`/quests/${id}/claim`, { method: "POST", idempotent: true });
      setUser(r.user);
      toast.success("Reward claimed");
      await reload();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't claim");
    } finally {
      setBusy(null);
    }
  };

  const daily = data.quests.filter((q) => q.period === "daily");
  const life = data.quests.filter((q) => q.period === "life");
  const ready = data.quests.filter((q) => q.complete && !q.claimed).length;

  return (
    <div>
      <PageHeader title="Quests" kicker={ready ? `${ready} reward${ready > 1 ? "s" : ""} ready` : "Keep grinding"} />
      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-2 flex items-center gap-2 font-heading text-xl uppercase italic text-white">
            <CalendarClock className="size-5 text-blue-300" /> Daily
            <span className="text-xs font-normal normal-case not-italic text-slate-500">Resets at midnight UTC</span>
          </h2>
          <QuestList quests={daily} onClaim={claim} busy={busy} />
        </section>
        <section>
          <h2 className="mb-2 flex items-center gap-2 font-heading text-xl uppercase italic text-white">
            <Trophy className="size-5 text-amber-300" /> Milestones
          </h2>
          <QuestList quests={life} onClaim={claim} busy={busy} />
        </section>
      </div>
    </div>
  );
}

export default function QuestsPage() {
  return (
    <RequireAuth>
      <Quests />
    </RequireAuth>
  );
}

"use client";

import { Wifi, WifiOff } from "lucide-react";
import { ResultPanel } from "./result-panel";
import type { OnlineEnd } from "@/lib/use-online";
import { cn } from "@/lib/utils";

export function ConnectionBadge({ status }: { status: string }) {
  const ok = status === "open";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs", ok ? "bg-emerald-500/15 text-emerald-200" : "bg-amber-500/15 text-amber-200")}>
      {ok ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}
      {ok ? "Connected" : status === "replaced" ? "Open in another tab" : "Connecting..."}
    </span>
  );
}

export function OnlineResult({ end, actions }: { end: OnlineEnd; actions: React.ReactNode }) {
  return (
    <ResultPanel
      config={end.config}
      score={end.score}
      perspective={end.side}
      title={end.mode === "ranked" ? "Ranked match" : "Friendly match"}
      rewards={{ coins: end.reward.coins, gems: end.reward.gems, xp: end.reward.xp, ratingDelta: end.reward.ratingDelta }}
      note={end.reward.note}
      actions={actions}
    />
  );
}

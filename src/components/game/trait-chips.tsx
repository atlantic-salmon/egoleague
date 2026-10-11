"use client";

import type { TraitView } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Compact +/− mutation chips for gacha results and item cards. */
export function TraitChips({
  traits,
  className,
  max = 5,
}: {
  traits: TraitView[];
  className?: string;
  max?: number;
}) {
  if (!traits?.length) return null;
  const list = traits.slice(0, max);
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {list.map((t) => (
        <span
          key={t.id}
          title={t.desc}
          className={cn(
            "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            t.sign > 0 ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/30" : "bg-rose-500/20 text-rose-300 ring-1 ring-rose-400/30",
          )}
        >
          <span aria-hidden>{t.sign > 0 ? "+" : "−"}</span>
          {t.name}
        </span>
      ))}
    </div>
  );
}

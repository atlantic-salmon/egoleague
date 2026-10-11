"use client";

import { useState } from "react";
import { Lock, Footprints, Crown, Shirt, Sparkle } from "lucide-react";
import { RARITY_INFO, isLegendaryPlus, type Rarity } from "@/shared/rarity";
// Legendary+ uses unique variant portraits
import { Portrait } from "./portrait";
import { TraitChips } from "./trait-chips";
import type { Item } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { GearSlot } from "@/shared/catalog";

export function RarityBadge({ rarity, className }: { rarity: Rarity; className?: string }) {
  const r = RARITY_INFO[rarity];
  if (r.rainbow) {
    return (
      <span
        className={cn(
          "rarity-rainbow inline-flex items-center rounded px-1.5 py-0.5 font-heading text-[11px] uppercase tracking-wider text-slate-950",
          className,
        )}
        title={r.label}
      >
        {r.short}
      </span>
    );
  }
  return (
    <span
      className={cn("inline-flex items-center rounded px-1.5 py-0.5 font-heading text-[11px] uppercase tracking-wider text-slate-950", className)}
      style={{ background: r.color, boxShadow: `0 0 10px ${r.glow}` }}
      title={r.label}
    >
      {r.short}
    </span>
  );
}

export function GearIcon({ slot, className, style }: { slot: GearSlot; className?: string; style?: React.CSSProperties }) {
  const I = slot === "boots" ? Footprints : slot === "band" ? Crown : Shirt;
  return <I className={className} style={style} />;
}

export function GearArt({
  templateId,
  slot,
  rarity,
  className,
}: {
  templateId: string;
  slot: GearSlot;
  rarity: Rarity;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const r = RARITY_INFO[rarity];
  if (failed) {
    return <GearIcon slot={slot} className={className} style={{ color: r.color }} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/gear/${templateId}.png`}
      alt=""
      className={cn("object-contain", className)}
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
}

export function RollBar({ label, value }: { label: string; value: number }) {
  const color = value >= 90 ? "#22d3ee" : value >= 75 ? "#fbbf24" : value >= 55 ? "#a78bfa" : value >= 35 ? "#38bdf8" : "#94a3b8";
  return (
    <div className="flex items-center gap-1.5 text-[11px]">
      <span className="w-12 shrink-0 text-slate-400">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="w-6 text-right font-mono tabular-nums text-slate-200">{value}</span>
    </div>
  );
}

const gradeColor: Record<string, string> = { S: "text-cyan-300", A: "text-amber-300", B: "text-violet-300", C: "text-sky-300", D: "text-slate-400" };

export function ItemCard({
  item,
  onClick,
  selected,
  compact,
  footer,
}: {
  item: Item;
  onClick?: () => void;
  selected?: boolean;
  compact?: boolean;
  footer?: React.ReactNode;
}) {
  const r = RARITY_INFO[item.rarity];
  const high = isLegendaryPlus(item.rarity);
  const rainbow = !!r.rainbow;
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border bg-slate-900/90 text-left transition",
        onClick && "cursor-pointer hover:-translate-y-0.5 focus-visible:outline-2",
        selected && "ring-2 ring-blue-400",
        rainbow && "border-transparent",
      )}
      style={
        rainbow
          ? {
              boxShadow: `0 0 28px -6px ${r.glow}`,
              backgroundImage:
                "linear-gradient(#0f172a,#0f172a), linear-gradient(90deg,#ef4444,#f97316,#eab308,#22c55e,#06b6d4,#3b82f6,#a855f7,#ef4444)",
              backgroundOrigin: "border-box",
              backgroundClip: "padding-box, border-box",
              borderWidth: 2,
            }
          : { borderColor: r.color, boxShadow: `0 0 ${high ? 26 : 12}px -6px ${r.glow}` }
      }
    >
      <div
        className={cn("relative flex items-end justify-center overflow-hidden", compact ? "h-24" : "h-32", high && "shimmer")}
        style={{
          background: rainbow
            ? "linear-gradient(180deg, rgba(249,115,22,0.25), transparent 55%), linear-gradient(180deg, #0f172a, #020617)"
            : `radial-gradient(circle at 50% 30%, ${r.glow}, transparent 70%), linear-gradient(180deg, #0f172a, #020617)`,
        }}
      >
        {item.kind === "char" ? (
          <Portrait
            id={item.characterId}
            variantId={high ? item.templateId : undefined}
            expr={high ? "ego" : "normal"}
            className={cn("relative z-[1] h-full", compact ? "w-24" : "w-32")}
          />
        ) : (
          <div className="relative z-[1] flex h-full items-center justify-center">
            <GearArt templateId={item.templateId} slot={item.slot} rarity={item.rarity} className={cn(compact ? "h-16 w-16" : "h-24 w-24")} />
          </div>
        )}
        {/* Above shimmer so L/M rarity + OVR stay readable on bright variant art */}
        <div className="absolute left-1.5 top-1.5 z-10 flex items-center gap-1">
          <RarityBadge rarity={item.rarity} />
          {item.perfect && (
            <span className="inline-flex items-center gap-0.5 rounded bg-cyan-400/90 px-1 text-[10px] font-bold uppercase text-slate-950">
              <Sparkle className="size-3" /> Perfect
            </span>
          )}
        </div>
        <div className="absolute right-1.5 top-1.5 z-10 flex flex-col items-end gap-1">
          {item.kind === "char" && (
            <span className="rounded-md border border-white/20 bg-slate-950 px-1.5 font-heading text-lg leading-tight text-white shadow-md">
              <span className="mr-0.5 text-[10px] font-sans font-semibold uppercase tracking-wide text-slate-400">OVR</span>
              {item.ovr}
            </span>
          )}
          {item.kind === "gear" && (
            <span className="rounded-md border border-white/20 bg-slate-950 px-1.5 font-heading text-sm leading-tight text-white shadow-md">Q{item.quality}</span>
          )}
          {item.locked && (
            <span className="rounded bg-amber-500/90 p-0.5 text-slate-950" title="Locked in a trade or listing">
              <Lock className="size-3" />
            </span>
          )}
        </div>
        <span className={cn("absolute bottom-1 right-2 z-10 font-heading text-2xl italic drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]", gradeColor[item.grade])}>{item.grade}</span>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-2">
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-1">
            <div className="truncate text-sm font-semibold text-white">{item.kind === "char" ? item.name.split(" (")[0] : item.name}</div>
            {item.kind === "char" && (
              <span className="shrink-0 font-heading text-sm tabular-nums" style={{ color: r.color }}>
                {item.ovr}
              </span>
            )}
          </div>
          <div className="truncate text-xs text-slate-400">
            {item.kind === "char" ? `${item.variantLabel} · ${item.archetypeLabel}` : `${item.slot === "band" ? "Headband" : item.slot === "boots" ? "Boots" : "Jersey"}`} · Lv {item.level}
          </div>
        </div>
        {!compact && (
          <div className="mt-1 space-y-0.5">
            {item.kind === "char" ? <RollBar label="Talent" value={item.talent} /> : <RollBar label="Quality" value={item.quality} />}
          </div>
        )}
        {compact && (
          <div className="flex gap-2 text-[11px] text-slate-400">
            {item.kind === "char" ? <span>T {item.talent}</span> : <span>Q {item.quality}</span>}
          </div>
        )}
        {item.kind === "char" && item.traits.length > 0 && (
          <TraitChips traits={item.traits} className={cn("mt-1", compact && "max-h-10 overflow-hidden")} max={compact ? 3 : 5} />
        )}
        {footer}
      </div>
    </div>
  );
}

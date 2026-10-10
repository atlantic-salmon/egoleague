"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpCircle, Coins, Hammer, Lock, Store, Gem } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Portrait } from "./portrait";
import { GearIcon, RarityBadge, RollBar } from "./item-card";
import { api, ApiError } from "@/lib/api";
import { useSession } from "@/lib/session";
import type { CharItem, GearItem, Item, Profile } from "@/lib/types";
import { STAT_KEYS, STAT_LABEL, TALENT_STATS, GEAR_BY_ID, GEAR_SLOT_STATS, type GearSlot } from "@/shared/catalog";
import { RARITY_INFO } from "@/shared/rarity";
import { cn } from "@/lib/utils";

const SLOTS: { slot: GearSlot; label: string }[] = [
  { slot: "boots", label: "Boots" },
  { slot: "band", label: "Headband" },
  { slot: "jersey", label: "Jersey" },
];

function StatBars({ item }: { item: CharItem }) {
  return (
    <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
      {STAT_KEYS.map((k) => {
        const v = item.ratings[k];
        return (
          <div key={k}>
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">
                {STAT_LABEL[k]}{" "}
                <span className="text-[10px] uppercase text-slate-500">{TALENT_STATS.includes(k) ? "talent" : "quality"}</span>
              </span>
              <span className="font-semibold tabular-nums text-white">{Math.round(v)}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-300" style={{ width: `${Math.min(100, v / 1.3)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ItemDetail({
  item,
  all,
  open,
  onOpenChange,
  onChanged,
}: {
  item: Item | null;
  all: Item[];
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onChanged: () => void;
}) {
  const { user, setUser } = useSession();
  const [cost, setCost] = useState<{ cost: { coins: number; shards: number }; maxed: boolean; shardsOnDismantle: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDismantle, setConfirmDismantle] = useState(false);

  useEffect(() => {
    setCost(null);
    setConfirmDismantle(false);
    if (!item || !open) return;
    api<typeof cost>(`/items/${item.id}/cost`).then(setCost).catch(() => setCost(null));
  }, [item, open]);

  if (!item) return null;
  const r = RARITY_INFO[item.rarity];

  const act = async (fn: () => Promise<{ user?: Profile } | unknown>, ok: string) => {
    setBusy(true);
    try {
      const res = (await fn()) as { user?: Profile };
      if (res?.user) setUser(res.user);
      toast.success(ok);
      onChanged();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const levelUp = () =>
    act(async () => {
      const res = await api<{ user: Profile }>(`/items/${item.id}/levelup`, { method: "POST", idempotent: true });
      const c = await api<typeof cost>(`/items/${item.id}/cost`);
      setCost(c);
      return res;
    }, `${item.name} reached level ${item.level + 1}`);

  const dismantle = () =>
    act(async () => {
      const res = await api<{ shards: number; user: Profile }>(`/items/${item.id}/dismantle`, { method: "POST", idempotent: true });
      onOpenChange(false);
      return res;
    }, `Dismantled for ${cost?.shardsOnDismantle ?? 0} shards`);

  const equip = (slot: GearSlot, gearId: number | null) =>
    act(() => api(`/items/${item.id}/equip`, { body: { slot, gearId } }), gearId ? "Gear equipped" : "Gear removed");

  const canAfford = cost && user ? user.coins >= cost.cost.coins && user.shards >= cost.cost.shards : false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <RarityBadge rarity={item.rarity} /> {item.name}
          </DialogTitle>
          <DialogDescription>
            {r.label} · Grade {item.grade} · Level {item.level} / {item.levelCap} · Est. value {item.value.toLocaleString()} coins
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
          <div
            className="flex h-44 items-end justify-center rounded-xl border"
            style={{ borderColor: r.color, background: `radial-gradient(circle at 50% 30%, ${r.glow}, transparent 70%), #020617` }}
          >
            {item.kind === "char" ? (
              <Portrait id={item.characterId} expr="ego" className="h-full w-full" />
            ) : (
              <GearIcon slot={item.slot} className="mb-10 size-20" style={{ color: r.color }} />
            )}
          </div>
          <div className="space-y-3">
            <div className="space-y-1">
              <RollBar label="Talent" value={item.talent} />
              <RollBar label="Quality" value={item.quality} />
              <p className="text-[11px] text-slate-500">
                Talent raises top speed, shot power and physical. Quality raises everything else. Both are permanent and were rolled when this item was pulled.
              </p>
            </div>
            {item.kind === "char" ? (
              <div className="rounded-lg bg-slate-900 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-heading text-lg uppercase italic text-white">OVR {item.ovr}</span>
                  <span className="text-xs text-slate-400">{item.archetypeLabel}</span>
                </div>
                <div className="mt-1 text-xs text-blue-200">
                  <span className="font-semibold">{item.skill.name}:</span> {item.skill.desc}
                </div>
              </div>
            ) : (
              <GearInfo item={item} all={all} />
            )}
            {item.locked && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                <Lock className="size-4" /> Locked in a {item.lockedBy?.startsWith("trade") ? "trade offer" : "market listing"}. Cancel it to use this item.
              </div>
            )}
          </div>
        </div>

        {item.kind === "char" && <StatBars item={item} />}

        {item.kind === "char" && (
          <div>
            <div className="mb-2 text-sm font-semibold text-white">Gear</div>
            <div className="grid gap-2 sm:grid-cols-3">
              {SLOTS.map(({ slot, label }) => {
                const eq = item.gear.find((g) => g.slot === slot);
                const options = all.filter((x): x is GearItem => x.kind === "gear" && x.slot === slot && !x.locked);
                return (
                  <div key={slot} className="rounded-lg border border-white/10 bg-slate-900 p-2">
                    <div className="mb-1 flex items-center gap-1 text-xs text-slate-400">
                      <GearIcon slot={slot} className="size-3.5" /> {label}
                    </div>
                    <select
                      className="w-full rounded-md border border-white/10 bg-slate-950 px-2 py-1.5 text-xs text-white"
                      value={eq?.id ?? ""}
                      disabled={busy || item.locked}
                      onChange={(e) => equip(slot, e.target.value ? Number(e.target.value) : null)}
                    >
                      <option value="">Empty</option>
                      {options.map((g) => (
                        <option key={g.id} value={g.id}>
                          [{RARITY_INFO[g.rarity].short}] {g.name} T{g.talent}/Q{g.quality}
                          {g.equippedTo && g.equippedTo !== item.id ? " (equipped elsewhere)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Equip three pieces of the same rarity or higher for a set bonus.</p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
          {cost && !cost.maxed ? (
            <Button disabled={busy || item.locked || !canAfford} onClick={levelUp}>
              <ArrowUpCircle /> Level up
              <span className="ml-1 inline-flex items-center gap-1 text-xs opacity-80">
                <Coins className="size-3.5" />
                {cost.cost.coins.toLocaleString()} <Gem className="size-3.5" />
                {cost.cost.shards.toLocaleString()} shards
              </span>
            </Button>
          ) : cost?.maxed ? (
            <span className="text-sm text-slate-400">Max level for {r.label}</span>
          ) : null}
          <Button variant="outline" render={<Link href={`/market?sell=${item.id}`} />} nativeButton={false} disabled={item.locked}>
            <Store /> Sell
          </Button>
          <div className="ml-auto">
            {confirmDismantle ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-300">Destroy forever for {cost?.shardsOnDismantle ?? "?"} shards?</span>
                <Button size="sm" variant="destructive" disabled={busy} onClick={dismantle}>
                  Confirm
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmDismantle(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button variant="ghost" className="text-red-300" disabled={busy || item.locked} onClick={() => setConfirmDismantle(true)}>
                <Hammer /> Dismantle
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function GearInfo({ item, all }: { item: GearItem; all: Item[] }) {
  const def = GEAR_BY_ID[item.templateId];
  const [a, b] = GEAR_SLOT_STATS[item.slot];
  const wearer = item.equippedTo ? all.find((x) => x.id === item.equippedTo) : null;
  return (
    <div className={cn("rounded-lg bg-slate-900 p-3 text-sm", item.named && "border border-amber-400/30")}>
      <div className="text-white">
        Boosts {STAT_LABEL[a]} and {STAT_LABEL[b]}
      </div>
      {def?.named && <div className="mt-1 text-xs text-amber-200">Named {RARITY_INFO[item.rarity].label} piece. Only the rarest scouts find these.</div>}
      <div className="mt-1 text-xs text-slate-400">{wearer ? `Equipped by ${wearer.name}` : "Not equipped"}</div>
    </div>
  );
}

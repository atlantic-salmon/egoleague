"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpCircle, Hammer, Lock, Store, Gem, Zap } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Portrait } from "./portrait";
import { GearArt, GearIcon, RarityBadge, RollBar } from "./item-card";
import { TraitChips } from "./trait-chips";
import { api, ApiError } from "@/lib/api";
import { useSession } from "@/lib/session";
import type { CharItem, GearItem, Item, Profile } from "@/lib/types";
import { STAT_KEYS, STAT_LABEL, GEAR_BY_ID, GEAR_SLOT_STATS, type GearSlot } from "@/shared/catalog";
import { RARITY_INFO, isLegendaryPlus } from "@/shared/rarity";
import { cn } from "@/lib/utils";

const SLOTS: { slot: GearSlot; label: string }[] = [
  { slot: "boots", label: "Boots" },
  { slot: "band", label: "Headband" },
  { slot: "jersey", label: "Jersey" },
];

type CostInfo = {
  cost: { gems: number };
  maxed: boolean;
  gemsOnDismantle: number;
  instantSell: number;
  marketValue: number;
};

function StatBars({ item }: { item: CharItem }) {
  return (
    <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
      {STAT_KEYS.map((k) => {
        const v = item.ratings[k];
        return (
          <div key={k}>
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">{STAT_LABEL[k]}</span>
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
  const [costState, setCostState] = useState<{ key: string; data: CostInfo } | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmFor, setConfirmFor] = useState<number | null>(null);
  const costKey = item ? `${item.id}:${item.level}` : "";
  const cost = costState?.key === costKey ? costState.data : null;
  const confirmDismantle = !!item && confirmFor === item.id;
  const setConfirmDismantle = (v: boolean) => setConfirmFor(v && item ? item.id : null);

  useEffect(() => {
    if (!item || !open) return;
    let alive = true;
    api<CostInfo>(`/items/${item.id}/cost`)
      .then((data) => alive && setCostState({ key: `${item.id}:${item.level}`, data }))
      .catch(() => {});
    return () => {
      alive = false;
    };
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
    act(() => api<{ user: Profile }>(`/items/${item.id}/levelup`, { method: "POST", idempotent: true }), `${item.name} reached level ${item.level + 1}`);

  const dismantle = () =>
    act(async () => {
      const res = await api<{ gems: number; user: Profile }>(`/items/${item.id}/dismantle`, { method: "POST", idempotent: true });
      onOpenChange(false);
      return res;
    }, `Dismantled for ${cost?.gemsOnDismantle ?? 0} gems`);

  const instantSell = () =>
    act(async () => {
      const res = await api<{ gems: number; user: Profile }>(`/items/${item.id}/sell`, { method: "POST", idempotent: true });
      onOpenChange(false);
      return res;
    }, `Sold for ${cost?.instantSell ?? 0} gems`);

  const equip = (slot: GearSlot, gearId: number | null) =>
    act(() => api(`/items/${item.id}/equip`, { body: { slot, gearId } }), gearId ? "Gear equipped" : "Gear removed");

  const canAfford = cost && user ? !!user.infiniteGems || user.gems >= cost.cost.gems : false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <RarityBadge rarity={item.rarity} /> {item.name}
          </DialogTitle>
          <DialogDescription>
            {r.label} · Grade {item.grade} · Level {item.level} / {item.levelCap} · Est. value {item.value.toLocaleString()} gems
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
          <div
            className="flex h-44 items-end justify-center rounded-xl border"
            style={{ borderColor: r.color, background: `radial-gradient(circle at 50% 30%, ${r.glow}, transparent 70%), #020617` }}
          >
            {item.kind === "char" ? (
              <Portrait
                id={item.characterId}
                variantId={isLegendaryPlus(item.rarity) ? item.templateId : undefined}
                expr="ego"
                className="h-full w-full"
              />
            ) : (
              <GearArt templateId={item.templateId} slot={item.slot} rarity={item.rarity} className="mb-4 h-28 w-28" />
            )}
          </div>
          <div className="space-y-3">
            <div className="space-y-1">
              {item.kind === "char" ? <RollBar label="Talent" value={item.talent} /> : <RollBar label="Quality" value={item.quality} />}
              <p className="text-[11px] text-slate-500">
                {item.kind === "char"
                  ? "Talent is permanent and was rolled when this player was pulled. It scales every stat."
                  : "Quality is permanent and was rolled when this gear was pulled. It scales the gear's boosts."}
              </p>
            </div>
            {item.kind === "char" && (
              <div className="space-y-1">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Mutations {item.traits.length ? `(${item.traits.length}/5)` : ""}
                </div>
                {item.traits.length ? (
                  <TraitChips traits={item.traits} />
                ) : (
                  <p className="text-[11px] text-slate-500">No mutations. Starter players have none; gacha pulls can roll up to five +/− traits.</p>
                )}
              </div>
            )}
            {item.kind === "char" ? (
              <div className="rounded-lg bg-slate-900 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-heading text-lg uppercase italic text-white">OVR {item.ovr}</span>
                  <span className="text-xs text-slate-400">{item.archetypeLabel}</span>
                </div>
                <div className="mt-1 text-xs text-blue-200">
                  <span className="font-semibold">{item.skill.name}:</span> {item.skill.desc}
                </div>
                {item.skill.ability && (
                  <div className="mt-2 rounded bg-cyan-500/10 px-2 py-1.5 text-xs text-cyan-100">
                    <span className="font-heading uppercase tracking-wide text-cyan-300">{item.skill.ability.title}</span>
                    <span className="ml-2 text-slate-400">
                      Q · {item.skill.ability.cooldownSec}s CD · {item.skill.ability.durationSec}s
                    </span>
                    <div className="mt-0.5 italic text-slate-300">&ldquo;{item.skill.ability.line}&rdquo;</div>
                  </div>
                )}
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
                          [{RARITY_INFO[g.rarity].short || RARITY_INFO[g.rarity].label}] {g.name} Q{g.quality}
                          {g.equippedTo && g.equippedTo !== item.id ? " (equipped elsewhere)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Equip three pieces of the same rarity for a set bonus.</p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
          {cost && !cost.maxed ? (
            <Button disabled={busy || item.locked || !canAfford} onClick={levelUp}>
              <ArrowUpCircle /> Level up
              <span className="ml-1 inline-flex items-center gap-1 text-xs opacity-80">
                <Gem className="size-3.5" />
                {cost.cost.gems.toLocaleString()}
              </span>
            </Button>
          ) : cost?.maxed ? (
            <span className="text-sm text-slate-400">Max level for {r.label}</span>
          ) : null}
          <Button
            variant="secondary"
            disabled={busy || item.locked || !cost}
            onClick={instantSell}
            title="Sell instantly for 50% of market value"
          >
            <Zap /> Instant sell
            {cost && (
              <span className="ml-1 inline-flex items-center gap-1 text-xs opacity-80">
                <Gem className="size-3.5" />
                {cost.instantSell.toLocaleString()}
              </span>
            )}
          </Button>
          <Button variant="outline" render={<Link href={`/market?sell=${item.id}`} />} nativeButton={false} disabled={item.locked}>
            <Store /> List
          </Button>
          <div className="ml-auto">
            {confirmDismantle ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-300">Destroy forever for {cost?.gemsOnDismantle ?? "?"} gems?</span>
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

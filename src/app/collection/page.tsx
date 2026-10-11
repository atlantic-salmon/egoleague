"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Sparkles, Shirt, Users } from "lucide-react";
import { RequireAuth } from "@/components/auth-card";
import { PageHeader, Loading, ErrorState, Empty } from "@/components/states";
import { ItemCard } from "@/components/game/item-card";
import { ItemDetail } from "@/components/game/item-detail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApi } from "@/lib/use-api";
import type { Item } from "@/lib/types";
import { RARITIES, RARITY_INFO, rarityIndex, type Rarity } from "@/shared/rarity";
import { cn } from "@/lib/utils";

type Sort = "rarity" | "ovr" | "value" | "newest" | "rolls";

function Collection() {
  const { data, error, loading, reload } = useApi<{ items: Item[] }>("/collection");
  const [kind, setKind] = useState<"char" | "gear">("char");
  const [rarity, setRarity] = useState<Rarity | "all">("all");
  const [sort, setSort] = useState<Sort>("rarity");
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const items = useMemo(() => {
    const list = (data?.items ?? []).filter(
      (it) => it.kind === kind && (rarity === "all" || it.rarity === rarity) && (!q || it.name.toLowerCase().includes(q.toLowerCase())),
    );
    const key = (it: Item) =>
      sort === "rarity"
        ? rarityIndex(it.rarity) * 1000 + (it.kind === "char" ? it.ovr : it.talent + it.quality)
        : sort === "ovr"
          ? it.kind === "char"
            ? it.ovr
            : it.talent + it.quality
          : sort === "value"
            ? it.value
            : sort === "rolls"
              ? it.talent + it.quality
              : it.createdAt;
    return [...list].sort((a, b) => key(b) - key(a));
  }, [data, kind, rarity, sort, q]);

  if (loading && !data) return <Loading label="Opening your locker..." />;
  if (error || !data) return <ErrorState message={error ?? "Couldn't load your collection"} onRetry={reload} />;
  const selected = data.items.find((i) => i.id === selectedId) ?? null;
  const counts = { char: data.items.filter((i) => i.kind === "char").length, gear: data.items.filter((i) => i.kind === "gear").length };

  return (
    <div>
      <PageHeader title="Collection" kicker="Your locker">
        <Button variant="outline" render={<Link href="/teams" />} nativeButton={false}>
          <Users /> Teams
        </Button>
        <Button render={<Link href="/gacha" />} nativeButton={false}>
          <Sparkles /> Scout more
        </Button>
      </PageHeader>
      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/70 p-3 lg:flex-row lg:items-center">
        <div className="flex gap-1">
          <Button size="sm" variant={kind === "char" ? "default" : "outline"} onClick={() => setKind("char")}>
            <Users /> Players ({counts.char})
          </Button>
          <Button size="sm" variant={kind === "gear" ? "default" : "outline"} onClick={() => setKind("gear")}>
            <Shirt /> Gear ({counts.gear})
          </Button>
        </div>
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setRarity("all")}
            className={cn("rounded-md px-2 py-1 text-xs", rarity === "all" ? "bg-white/15 text-white" : "text-slate-400 hover:text-white")}
          >
            All
          </button>
          {RARITIES.map((r) => {
            const n = data.items.filter((i) => i.kind === kind && i.rarity === r).length;
            return (
              <button
                key={r}
                onClick={() => setRarity(r)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-bold",
                  rarity === r ? "border-white/30 bg-white/15" : "border-transparent opacity-70 hover:opacity-100",
                  n === 0 && "opacity-35",
                )}
                style={{ color: RARITY_INFO[r].color }}
                title={`${RARITY_INFO[r].label} (${n})`}
              >
                {RARITY_INFO[r].short}
                <span className="font-sans text-[10px] tabular-nums text-slate-400">{n}</span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-1 gap-2 lg:justify-end">
          <Input placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-48" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="rounded-md border border-white/10 bg-slate-950 px-2 text-sm text-white"
            aria-label="Sort"
          >
            <option value="rarity">Rarity</option>
            <option value="ovr">{kind === "char" ? "OVR" : "Rolls"}</option>
            <option value="rolls">Talent / Quality</option>
            <option value="value">Value</option>
            <option value="newest">Newest</option>
          </select>
        </div>
      </div>
      {items.length === 0 ? (
        <Empty title={kind === "char" ? "No players match" : "No gear matches"}>
          {data.items.some((i) => i.kind === kind) ? "Try a different filter." : "Pull on the banners to fill your locker."}
        </Empty>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
          {items.map((it) => (
            <ItemCard key={it.id} item={it} onClick={() => setSelectedId(it.id)} />
          ))}
        </div>
      )}
      <ItemDetail item={selected} all={data.items} open={!!selected} onOpenChange={(o) => !o && setSelectedId(null)} onChanged={reload} />
    </div>
  );
}

export default function CollectionPage() {
  return (
    <RequireAuth>
      <Collection />
    </RequireAuth>
  );
}

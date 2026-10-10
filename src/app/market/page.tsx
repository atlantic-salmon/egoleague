"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Coins, Search, ShoppingCart, Store, Tag, X } from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/auth-card";
import { PageHeader, Loading, ErrorState, Empty } from "@/components/states";
import { ItemCard } from "@/components/game/item-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useSession } from "@/lib/session";
import type { Item, Profile } from "@/lib/types";
import { RARITIES, RARITY_INFO } from "@/shared/rarity";
import { cn } from "@/lib/utils";

interface Listing {
  id: number;
  price: number;
  seller?: string;
  sellerId?: number;
  listedAt: number;
  item: Item;
}
interface EconomyCfg {
  economy: { listingFeePct: number; listingFeeMin: number; taxPct: number; minPrice: number; maxPrice: number };
}

const fmt = (n: number) => n.toLocaleString();

function Browse() {
  const { user, setUser } = useSession();
  const [kind, setKind] = useState("");
  const [rarity, setRarity] = useState("");
  const [grade, setGrade] = useState("");
  const [sort, setSort] = useState("newest");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [buying, setBuying] = useState<Listing | null>(null);
  const [busy, setBusy] = useState(false);
  const path = useMemo(() => {
    const p = new URLSearchParams({ sort, page: String(page) });
    if (kind) p.set("kind", kind);
    if (rarity) p.set("rarity", rarity);
    if (grade) p.set("grade", grade);
    if (query) p.set("q", query);
    return `/market?${p}`;
  }, [kind, rarity, grade, sort, query, page]);
  const { data, error, loading, reload } = useApi<{ listings: Listing[] }>(path);

  const buy = async () => {
    if (!buying) return;
    setBusy(true);
    try {
      const r = await api<{ item: Item; user: Profile }>(`/market/${buying.id}/buy`, { method: "POST", idempotent: true });
      setUser(r.user);
      toast.success(`Bought ${r.item.name}`);
      setBuying(null);
      await reload();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Purchase failed");
      void reload();
    } finally {
      setBusy(false);
    }
  };

  const sel = "rounded-md border border-white/10 bg-slate-950 px-2 py-1.5 text-sm text-white";
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/70 p-3">
        <form
          className="flex gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(0);
            setQuery(q.trim());
          }}
        >
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search e.g. isagi" className="w-44" />
          <Button type="submit" size="icon" variant="outline" aria-label="Search">
            <Search />
          </Button>
        </form>
        <select className={sel} value={kind} onChange={(e) => (setKind(e.target.value), setPage(0))} aria-label="Kind">
          <option value="">Players and gear</option>
          <option value="char">Players</option>
          <option value="gear">Gear</option>
        </select>
        <select className={sel} value={rarity} onChange={(e) => (setRarity(e.target.value), setPage(0))} aria-label="Rarity">
          <option value="">Any rarity</option>
          {RARITIES.map((r) => (
            <option key={r} value={r}>
              {RARITY_INFO[r].label}
            </option>
          ))}
        </select>
        <select className={sel} value={grade} onChange={(e) => (setGrade(e.target.value), setPage(0))} aria-label="Minimum grade">
          <option value="">Any grade</option>
          <option value="S">Grade S</option>
          <option value="A">Grade A+</option>
          <option value="B">Grade B+</option>
          <option value="C">Grade C+</option>
        </select>
        <select className={sel} value={sort} onChange={(e) => (setSort(e.target.value), setPage(0))} aria-label="Sort">
          <option value="newest">Newest</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
          <option value="rarity">Rarity</option>
          <option value="talent">Talent</option>
          <option value="quality">Quality</option>
        </select>
      </div>
      {loading && !data ? (
        <Loading label="Loading listings..." />
      ) : error || !data ? (
        <ErrorState message={error ?? "Couldn't load the market"} onRetry={reload} />
      ) : data.listings.length === 0 ? (
        <Empty title="Nothing listed here" icon={<Store className="size-6 text-slate-500" />}>
          {page > 0 ? "No more results." : "Try different filters, or be the first to list something."}
        </Empty>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
          {data.listings.map((l) => (
            <ItemCard
              key={l.id}
              item={l.item}
              onClick={() => setBuying(l)}
              footer={
                <div className="flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1 font-semibold text-amber-200">
                    <Coins className="size-3.5" /> {fmt(l.price)}
                  </span>
                  <span className={cn("truncate", l.sellerId === user?.id ? "text-cyan-300" : "text-slate-500")}>{l.sellerId === user?.id ? "You" : l.seller}</span>
                </div>
              }
            />
          ))}
        </div>
      )}
      <div className="mt-4 flex items-center justify-center gap-2">
        <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
          <ChevronLeft /> Prev
        </Button>
        <span className="text-sm text-slate-400">Page {page + 1}</span>
        <Button size="sm" variant="outline" disabled={!data || data.listings.length < 30} onClick={() => setPage((p) => p + 1)}>
          Next <ChevronRight />
        </Button>
      </div>

      <Dialog open={!!buying} onOpenChange={(o) => !o && setBuying(null)}>
        <DialogContent className="sm:max-w-md">
          {buying && (
            <>
              <DialogHeader>
                <DialogTitle>Buy {buying.item.name}?</DialogTitle>
                <DialogDescription>
                  Sold by {buying.seller}. Talent and Quality are permanent, so what you see is what you get.
                </DialogDescription>
              </DialogHeader>
              <div className="mx-auto w-48">
                <ItemCard item={buying.item} />
              </div>
              <PriceHistory templateId={buying.item.templateId} />
              <div className="flex items-center justify-between rounded-lg bg-slate-900 px-3 py-2 text-sm">
                <span className="text-slate-400">Price</span>
                <span className="inline-flex items-center gap-1 font-semibold text-amber-200">
                  <Coins className="size-4" /> {fmt(buying.price)}
                </span>
              </div>
              <div className="text-xs text-slate-500">Estimated value {fmt(buying.item.value)} · You have {fmt(user?.coins ?? 0)} coins</div>
              <Button
                size="lg"
                disabled={busy || buying.sellerId === user?.id || (user?.coins ?? 0) < buying.price}
                onClick={buy}
              >
                <ShoppingCart /> {buying.sellerId === user?.id ? "This is your listing" : (user?.coins ?? 0) < buying.price ? "Not enough coins" : "Buy now"}
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PriceHistory({ templateId }: { templateId: string }) {
  const { data } = useApi<{ sales: { price: number; grade: string; talent: number; quality: number }[]; avg: number | null }>(
    `/market/history/${encodeURIComponent(templateId)}`,
  );
  if (!data) return null;
  if (!data.sales.length) return <div className="text-xs text-slate-500">No recent sales for this item.</div>;
  return (
    <div className="rounded-lg bg-slate-900 p-2 text-xs">
      <div className="mb-1 text-slate-300">
        Recent sales · avg <span className="font-semibold text-amber-200">{fmt(data.avg ?? 0)}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {data.sales.slice(0, 8).map((s, i) => (
          <span key={i} className="rounded bg-slate-950 px-1.5 py-0.5 text-slate-400">
            {s.grade} T{s.talent}/Q{s.quality}: {fmt(s.price)}
          </span>
        ))}
      </div>
    </div>
  );
}

function Sell({ preselect, onListed }: { preselect: number | null; onListed: () => void }) {
  const { user, setUser } = useSession();
  const coll = useApi<{ items: Item[] }>("/collection");
  const cfg = useApi<EconomyCfg>("/config");
  const [itemId, setItemId] = useState<number | null>(preselect);
  const [prices, setPrices] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const items = (coll.data?.items ?? []).filter((i) => !i.locked);
  const item = items.find((i) => i.id === itemId) ?? null;
  const price = item ? (prices[item.id] ?? String(item.value)) : "";
  const setPrice = (v: string) => item && setPrices((p) => ({ ...p, [item.id]: v }));

  if (coll.loading && !coll.data) return <Loading />;
  if (coll.error || !coll.data) return <ErrorState message={coll.error ?? "Couldn't load items"} onRetry={coll.reload} />;
  const e = cfg.data?.economy;
  const p = Math.floor(Number(price) || 0);
  const fee = e ? Math.max(e.listingFeeMin, Math.floor((p * e.listingFeePct) / 100)) : 0;
  const tax = e ? Math.floor((p * e.taxPct) / 100) : 0;

  const list = async () => {
    if (!item) return;
    setBusy(true);
    try {
      const r = await api<{ user: Profile }>("/market/list", { body: { itemId: item.id, price: p }, idempotent: true });
      setUser(r.user);
      toast.success(`${item.name} listed for ${fmt(p)} coins`);
      setItemId(null);
      await coll.reload();
      onListed();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't list the item");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <div>
        {items.length === 0 ? (
          <Empty title="Nothing to sell">Items in trades or listings are locked.</Empty>
        ) : (
          <div className="grid max-h-[640px] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 md:grid-cols-4">
            {items.map((it) => (
              <ItemCard key={it.id} item={it} compact selected={it.id === itemId} onClick={() => setItemId(it.id)} />
            ))}
          </div>
        )}
      </div>
      <div className="h-fit rounded-2xl border border-white/10 bg-slate-900/70 p-4 lg:sticky lg:top-20">
        {!item ? (
          <Empty title="Pick an item to sell" icon={<Tag className="size-6 text-slate-500" />} />
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-white">{item.name}</div>
              <Button size="icon-sm" variant="ghost" aria-label="Clear" onClick={() => setItemId(null)}>
                <X />
              </Button>
            </div>
            <div className="text-xs text-slate-400">
              T{item.talent} / Q{item.quality} · Grade {item.grade} · Lv {item.level} · Est. value {fmt(item.value)}
            </div>
            <PriceHistory templateId={item.templateId} />
            <div>
              <label htmlFor="price" className="text-xs text-slate-400">
                Price (coins)
              </label>
              <Input id="price" inputMode="numeric" value={price} onChange={(ev) => setPrice(ev.target.value.replace(/\D/g, "").slice(0, 9))} />
            </div>
            <div className="space-y-1 rounded-lg bg-slate-950/60 p-3 text-sm">
              <div className="flex justify-between text-slate-400">
                <span>Listing fee ({e?.listingFeePct}%, min {e?.listingFeeMin}), paid now</span>
                <span>-{fmt(fee)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Sale tax ({e?.taxPct}%), on sale</span>
                <span>-{fmt(tax)}</span>
              </div>
              <div className="flex justify-between font-semibold text-white">
                <span>You receive if sold</span>
                <span className="text-amber-200">{fmt(Math.max(0, p - tax))}</span>
              </div>
            </div>
            <p className="text-xs text-slate-500">The item is locked and removed from your teams while listed. The fee isn&apos;t refunded if you cancel.</p>
            <Button className="w-full" size="lg" disabled={busy || p < (e?.minPrice ?? 1) || (user?.coins ?? 0) < fee} onClick={list}>
              <Store /> List for {fmt(p)}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function Mine() {
  const { data, error, loading, reload } = useApi<{ listings: Listing[] }>("/market/mine");
  const cancel = async (id: number) => {
    try {
      await api(`/market/${id}/cancel`, { method: "POST" });
      toast.success("Listing cancelled. Your item is unlocked.");
      await reload();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't cancel");
    }
  };
  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorState message={error ?? "Couldn't load your listings"} onRetry={reload} />;
  if (!data.listings.length) return <Empty title="No active listings">List items from the Sell tab or your collection.</Empty>;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
      {data.listings.map((l) => (
        <ItemCard
          key={l.id}
          item={l.item}
          footer={
            <div className="flex items-center justify-between gap-1">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-200">
                <Coins className="size-3.5" /> {fmt(l.price)}
              </span>
              <Button size="xs" variant="outline" onClick={() => cancel(l.id)}>
                Cancel
              </Button>
            </div>
          }
        />
      ))}
    </div>
  );
}

function Market() {
  const [preselect] = useState<number | null>(() => Number(new URLSearchParams(window.location.search).get("sell")) || null);
  const [tab, setTab] = useState<"browse" | "sell" | "mine">(preselect ? "sell" : "browse");
  const [mineKey, setMineKey] = useState(0);
  return (
    <div>
      <PageHeader title="Market" kicker="Buy and sell for coins">
        {(
          [
            ["browse", "Browse"],
            ["sell", "Sell"],
            ["mine", "My listings"],
          ] as const
        ).map(([id, label]) => (
          <Button key={id} size="sm" variant={tab === id ? "default" : "outline"} onClick={() => setTab(id)}>
            {label}
          </Button>
        ))}
      </PageHeader>
      {tab === "browse" && <Browse />}
      {tab === "sell" && <Sell preselect={preselect} onListed={() => setMineKey((k) => k + 1)} />}
      {tab === "mine" && <Mine key={mineKey} />}
    </div>
  );
}

export default function MarketPage() {
  return (
    <RequireAuth>
      <Market />
    </RequireAuth>
  );
}

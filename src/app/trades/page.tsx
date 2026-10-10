"use client";

import { useEffect, useState } from "react";
import { ArrowLeftRight, Check, Coins, Inbox, Send, X } from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/auth-card";
import { PageHeader, Loading, ErrorState, Empty } from "@/components/states";
import { ItemCard } from "@/components/game/item-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useSession } from "@/lib/session";
import type { Item, Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Trade {
  id: number;
  from: string;
  to: string;
  fromId: number;
  toId: number;
  offerItems: (Item | null)[];
  offerCoins: number;
  requestItems: (Item | null)[];
  requestCoins: number;
  status: string;
  createdAt: number;
}

const MAX = 6;

function Side({ title, items, coins }: { title: string; items: (Item | null)[]; coins: number }) {
  return (
    <div className="min-w-0 flex-1">
      <div className="mb-1 text-xs uppercase tracking-wide text-slate-400">{title}</div>
      <div className="flex flex-wrap gap-2">
        {items.map((it, i) =>
          it ? (
            <div key={it.id} className="w-28">
              <ItemCard item={it} compact />
            </div>
          ) : (
            <div key={i} className="grid h-24 w-28 place-items-center rounded-xl border border-dashed border-white/10 text-xs text-slate-500">
              Item gone
            </div>
          ),
        )}
        {coins > 0 && (
          <div className="flex h-24 w-28 flex-col items-center justify-center rounded-xl border border-amber-400/30 bg-amber-500/10 text-amber-200">
            <Coins className="size-6" />
            <span className="text-sm font-semibold">{coins.toLocaleString()}</span>
          </div>
        )}
        {!items.length && !coins && <span className="text-sm text-slate-500">Nothing</span>}
      </div>
    </div>
  );
}

function TradeList({ reloadKey }: { reloadKey: number }) {
  const { user, setUser } = useSession();
  const { data, error, loading, reload } = useApi<{ trades: Trade[] }>("/trades");
  const [busy, setBusy] = useState<number | null>(null);
  useEffect(() => {
    if (reloadKey) void reload();
  }, [reloadKey, reload]);

  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorState message={error ?? "Couldn't load trades"} onRetry={reload} />;
  if (!data.trades.length) return <Empty title="No trades yet" icon={<Inbox className="size-6 text-slate-500" />}>Propose one above to swap players or gear with a friend.</Empty>;

  const act = async (t: Trade, action: "accept" | "decline") => {
    setBusy(t.id);
    try {
      const r = await api<{ user?: Profile }>(`/trades/${t.id}/${action}`, { method: "POST", idempotent: action === "accept" });
      if (r.user) setUser(r.user);
      toast.success(action === "accept" ? "Trade complete" : t.fromId === user?.id ? "Trade cancelled" : "Trade declined");
      await reload();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Something went wrong");
      void reload();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      {data.trades.map((t) => {
        const mine = t.fromId === user?.id;
        const pending = t.status === "pending";
        return (
          <div key={t.id} className={cn("rounded-2xl border bg-slate-900/70 p-4", pending && !mine ? "border-blue-500/50" : "border-white/10", !pending && "opacity-70")}>
            <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold text-white">{mine ? `You → ${t.to}` : `${t.from} → You`}</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs capitalize",
                  t.status === "accepted" ? "bg-emerald-500/15 text-emerald-200" : pending ? "bg-blue-500/15 text-blue-200" : "bg-slate-700 text-slate-300",
                )}
              >
                {t.status}
              </span>
              <span className="text-xs text-slate-500">{new Date(t.createdAt).toLocaleString()}</span>
              {pending && (
                <div className="ml-auto flex gap-2">
                  {!mine && (
                    <Button size="sm" disabled={busy === t.id} onClick={() => act(t, "accept")}>
                      <Check /> Accept
                    </Button>
                  )}
                  <Button size="sm" variant="outline" disabled={busy === t.id} onClick={() => act(t, "decline")}>
                    <X /> {mine ? "Cancel" : "Decline"}
                  </Button>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <Side title={mine ? "You give" : `${t.from} gives`} items={t.offerItems} coins={t.offerCoins} />
              <ArrowLeftRight className="mx-auto size-5 shrink-0 text-slate-500" />
              <Side title={mine ? `${t.to} gives` : "You give"} items={t.requestItems} coins={t.requestCoins} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Picker({ items, selected, toggle, empty }: { items: Item[]; selected: number[]; toggle: (id: number) => void; empty: string }) {
  if (!items.length) return <Empty title={empty} />;
  return (
    <div className="grid max-h-80 grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4">
      {items.map((it) => (
        <ItemCard key={it.id} item={it} compact selected={selected.includes(it.id)} onClick={() => toggle(it.id)} />
      ))}
    </div>
  );
}

function Composer({ onSent }: { onSent: () => void }) {
  const { user, setUser } = useSession();
  const mineRes = useApi<{ items: Item[] }>("/collection");
  const [username, setUsername] = useState(() => new URLSearchParams(window.location.search).get("to") ?? "");
  const [theirs, setTheirs] = useState<{ username: string; items: Item[] } | null>(null);
  const [offer, setOffer] = useState<number[]>([]);
  const [request, setRequest] = useState<number[]>([]);
  const [offerCoins, setOfferCoins] = useState("");
  const [requestCoins, setRequestCoins] = useState("");
  const [busy, setBusy] = useState(false);

  const lookup = async () => {
    if (username.trim().length < 3) return;
    try {
      const r = await api<{ username: string; items: Item[] }>(`/users/${encodeURIComponent(username.trim())}/items`);
      if (r.username === user?.username) return toast.error("You can't trade with yourself");
      setTheirs(r);
      setRequest([]);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Player not found");
    }
  };

  const toggle = (list: number[], set: (v: number[]) => void) => (id: number) =>
    set(list.includes(id) ? list.filter((x) => x !== id) : list.length >= MAX ? list : [...list, id]);

  const send = async () => {
    if (!theirs) return;
    setBusy(true);
    try {
      await api("/trades", {
        body: { to: theirs.username, offerItems: offer, offerCoins: Number(offerCoins) || 0, requestItems: request, requestCoins: Number(requestCoins) || 0 },
        idempotent: true,
      });
      const me = await api<{ user: Profile }>("/me");
      setUser(me.user);
      toast.success(`Trade sent to ${theirs.username}`);
      setOffer([]);
      setRequest([]);
      setOfferCoins("");
      setRequestCoins("");
      await mineRes.reload();
      onSent();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't send the trade");
    } finally {
      setBusy(false);
    }
  };

  const myItems = (mineRes.data?.items ?? []).filter((i) => !i.locked);
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
      <div className="mb-3 font-heading text-xl uppercase italic text-white">Propose a trade</div>
      <form
        className="mb-4 flex max-w-md gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void lookup();
        }}
      >
        <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Their username" aria-label="Username" />
        <Button type="submit" variant="outline">
          Load their items
        </Button>
      </form>
      {theirs && (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-slate-300">
                  You give ({offer.length}/{MAX})
                </span>
                <div className="flex items-center gap-1">
                  <Coins className="size-4 text-amber-300" />
                  <Input className="h-8 w-28" inputMode="numeric" placeholder="0 coins" value={offerCoins} onChange={(e) => setOfferCoins(e.target.value.replace(/\D/g, "").slice(0, 8))} />
                </div>
              </div>
              {mineRes.loading && !mineRes.data ? <Loading /> : <Picker items={myItems} selected={offer} toggle={toggle(offer, setOffer)} empty="No tradeable items" />}
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-slate-300">
                  {theirs.username} gives ({request.length}/{MAX})
                </span>
                <div className="flex items-center gap-1">
                  <Coins className="size-4 text-amber-300" />
                  <Input className="h-8 w-28" inputMode="numeric" placeholder="0 coins" value={requestCoins} onChange={(e) => setRequestCoins(e.target.value.replace(/\D/g, "").slice(0, 8))} />
                </div>
              </div>
              <Picker items={theirs.items} selected={request} toggle={toggle(request, setRequest)} empty={`${theirs.username} has nothing tradeable`} />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-500">Your offered items and coins are held in escrow until the trade is accepted, declined or cancelled.</p>
            <Button disabled={busy || (!offer.length && !request.length) || (Number(offerCoins) || 0) > (user?.coins ?? 0)} onClick={send}>
              <Send /> Send offer
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function Trades() {
  const [k, setK] = useState(0);
  return (
    <div className="space-y-6">
      <PageHeader title="Trades" kicker="Swap with other players" />
      <Composer onSent={() => setK((x) => x + 1)} />
      <TradeList reloadKey={k} />
    </div>
  );
}

export default function TradesPage() {
  return (
    <RequireAuth>
      <Trades />
    </RequireAuth>
  );
}

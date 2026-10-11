"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Gem, Info, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/auth-card";
import { PageHeader, Loading, ErrorState } from "@/components/states";
import { ItemCard, RarityBadge } from "@/components/game/item-card";
import { Portrait } from "@/components/game/portrait";
import { TraitChips } from "@/components/game/trait-chips";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useSession } from "@/lib/session";
import type { Item, Profile } from "@/lib/types";
import { uiBlip } from "@/game/sfx";
import { RARITIES, RARITY_INFO, rarityIndex, isLegendaryPlus, type Rarity } from "@/shared/rarity";
import { VARIANT_BY_ID, variantName } from "@/shared/catalog";
import type { BannerDef } from "@/shared/banners";
import { cn } from "@/lib/utils";

type BannerView = BannerDef & { pity: { sinceL: number; sinceN1: number; total: number; hardL: number; hardN1: number } };
interface GachaConfig {
  gacha: { pullCost: number; tenPullCost: number; rates: Record<Rarity, number>; rollRanges: Record<Rarity, [number, number]>; featuredShare: number };
}

function sortReveal(items: Item[]) {
  // x10: drip commons first, save the best for last.
  return [...items].sort((a, b) => rarityIndex(a.rarity) - rarityIndex(b.rarity));
}

function RevealCard({ item, hero, multi }: { item: Item; hero?: boolean; multi?: boolean }) {
  const info = RARITY_INFO[item.rarity];
  const high = isLegendaryPlus(item.rarity);
  return (
    <motion.div
      className={cn("relative", hero && "mx-auto max-w-xs sm:max-w-sm")}
      initial={hero ? { scale: 0.4, rotateY: 90, opacity: 0 } : { rotateY: 180, opacity: 0, y: 40, scale: 0.85 }}
      animate={hero ? { scale: [0.4, 1.12, 1], rotateY: [90, -8, 0], opacity: 1 } : { rotateY: 0, opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: hero ? 140 : 200, damping: hero ? 14 : 16 }}
      style={{ transformStyle: "preserve-3d" }}
    >
      {high && (
        <motion.div
          className="pointer-events-none absolute inset-0 -z-10 rounded-2xl"
          style={{ boxShadow: `0 0 80px 20px ${info.glow}` }}
          animate={{ opacity: [0.45, 0.9, 0.55], scale: [0.96, 1.04, 1] }}
          transition={{ duration: 1.4, repeat: Infinity }}
        />
      )}
      {info.rainbow && (
        <motion.div
          className="pointer-events-none absolute -inset-1 -z-10 rounded-2xl opacity-80"
          style={{
            background: "conic-gradient(from 0deg, #ef4444, #f97316, #eab308, #22c55e, #06b6d4, #3b82f6, #a855f7, #ef4444)",
            filter: "blur(10px)",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 4, ease: "linear", repeat: Infinity }}
        />
      )}
      <ItemCard item={item} compact={!!multi && !hero} />
    </motion.div>
  );
}

function Reveal({ items, onClose }: { items: Item[]; onClose: () => void }) {
  const ordered = useMemo(() => sortReveal(items), [items]);
  const best = ordered.reduce((b, it) => (rarityIndex(it.rarity) > rarityIndex(b) ? it.rarity : b), "C" as Rarity);
  const info = RARITY_INFO[best];
  const multi = ordered.length > 1;
  const high = isLegendaryPlus(best);
  const [stage, setStage] = useState<"charge" | "burst" | "focus" | "grid">("charge");
  const [focusIdx, setFocusIdx] = useState(0);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    uiBlip("pull");
    const t1 = setTimeout(() => setStage("burst"), high ? 1600 : 900);
    const t2 = setTimeout(() => setStage(multi ? "focus" : "grid"), high ? 2300 : 1400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [high, multi]);

  // x10: one dramatic focus reveal at a time, commons faster, legendaries linger.
  useEffect(() => {
    if (stage !== "focus" || !multi) return;
    if (focusIdx >= ordered.length) {
      const t = setTimeout(() => setStage("grid"), 420);
      return () => clearTimeout(t);
    }
    const it = ordered[focusIdx];
    const rare = rarityIndex(it.rarity) >= rarityIndex("L");
    uiBlip(rare ? "rare" : "reveal");
    const hold = rare ? 900 : rarityIndex(it.rarity) >= rarityIndex("E") ? 520 : 280;
    const t = setTimeout(() => setFocusIdx((n) => n + 1), hold);
    return () => clearTimeout(t);
  }, [stage, focusIdx, ordered, multi]);

  useEffect(() => {
    if (stage !== "grid") return;
    if (!multi) {
      setShown(1);
      uiBlip(isLegendaryPlus(ordered[0].rarity) ? "rare" : "reveal");
      return;
    }
    setShown(ordered.length);
  }, [stage, multi, ordered]);

  const skip = () => {
    if (stage === "charge" || stage === "burst") setStage(multi ? "focus" : "grid");
    else if (stage === "focus" && focusIdx < ordered.length) setFocusIdx(ordered.length);
    else if (stage === "focus") setStage("grid");
    else if (shown < ordered.length) setShown(ordered.length);
  };

  const focusItem = multi && stage === "focus" && focusIdx > 0 ? ordered[focusIdx - 1] : null;
  const done = stage === "grid" && shown >= ordered.length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto bg-slate-950/96 p-4" onClick={skip}>
      <div className="speedlines pointer-events-none absolute inset-0 opacity-25" />
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(circle at 50% 40%, ${info.glow}, transparent 55%)` }}
        animate={{ opacity: stage === "burst" ? 1 : 0.35 }}
      />

      <AnimatePresence mode="wait">
        {(stage === "charge" || stage === "burst") && (
          <motion.div key="orb" className="relative flex flex-col items-center" exit={{ scale: 2.4, opacity: 0, filter: "blur(8px)" }} transition={{ duration: 0.35 }}>
            <motion.div
              className="absolute size-64 rounded-full sm:size-80"
              style={{ background: `conic-gradient(from 0deg, ${info.color}, transparent, ${info.color})` }}
              animate={{ rotate: 360, scale: stage === "burst" ? [1, 1.4, 0.2] : 1, opacity: stage === "burst" ? [0.7, 1, 0] : 0.55 }}
              transition={{ rotate: { duration: 1.2, repeat: Infinity, ease: "linear" }, scale: { duration: 0.55 }, opacity: { duration: 0.55 } }}
            />
            <motion.div
              className="relative size-36 rounded-full sm:size-48"
              style={{ background: `radial-gradient(circle at 35% 30%, #fff, ${info.color} 40%, #020617 78%)`, boxShadow: `0 0 140px 40px ${info.glow}` }}
              initial={{ scale: 0.15 }}
              animate={{ scale: stage === "burst" ? [1, 1.35, 0.1] : [0.15, 1.05, 0.95, 1], rotate: high ? 540 : 280 }}
              transition={{ duration: high ? 1.5 : 0.9, ease: "easeInOut" }}
            />
            {high && (
              <motion.div
                className="mt-8 font-heading text-4xl uppercase italic text-glow sm:text-5xl"
                initial={{ opacity: 0, letterSpacing: "1.2em", y: 12 }}
                animate={{ opacity: 1, letterSpacing: "0.18em", y: 0 }}
                transition={{ delay: 0.55, duration: 0.75 }}
                style={{ color: info.color }}
              >
                {info.label} pull
              </motion.div>
            )}
            {multi && (
              <motion.p className="mt-3 text-xs uppercase tracking-[0.35em] text-slate-400" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
                10-pull sequence
              </motion.p>
            )}
          </motion.div>
        )}

        {stage === "focus" && multi && (
          <motion.div key={`focus-${focusIdx}`} className="relative w-full max-w-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
            <div className="mb-4 text-center text-xs uppercase tracking-[0.3em] text-slate-400">
              Card {Math.min(focusIdx, ordered.length)} / {ordered.length}
            </div>
            {focusItem ? (
              <RevealCard item={focusItem} hero />
            ) : (
              <div className="grid h-64 place-items-center text-slate-500">Charging reveal...</div>
            )}
            {focusItem && isLegendaryPlus(focusItem.rarity) && (
              <motion.div
                className="mt-4 text-center font-heading text-3xl uppercase italic"
                style={{ color: RARITY_INFO[focusItem.rarity].color }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                {RARITY_INFO[focusItem.rarity].label}!
              </motion.div>
            )}
            {focusItem?.kind === "char" && focusItem.traits.length > 0 && rarityIndex(focusItem.rarity) >= rarityIndex("E") && (
              <motion.div className="mt-3 rounded-xl border border-white/10 bg-slate-900/85 p-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <TraitChips traits={focusItem.traits} className="justify-center" />
              </motion.div>
            )}
          </motion.div>
        )}

        {stage === "grid" && (
          <motion.div key="cards" className="relative w-full max-w-5xl" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            {multi && (
              <motion.div className="mb-4 text-center font-heading text-2xl uppercase italic text-white sm:text-3xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                Scout results
              </motion.div>
            )}
            <div className={cn("grid gap-3", ordered.length === 1 ? "mx-auto max-w-56 grid-cols-1" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-5")}>
              {ordered.map((it, i) => (
                <motion.div
                  key={it.id}
                  initial={multi ? { opacity: 0.35, scale: 0.92 } : { opacity: 0 }}
                  animate={i < shown ? { opacity: 1, scale: 1 } : { opacity: 0.25, scale: 0.9 }}
                  transition={{ delay: multi ? i * 0.04 : 0, type: "spring", stiffness: 220, damping: 18 }}
                  className={cn(isLegendaryPlus(it.rarity) && "z-10")}
                >
                  <RevealCard item={it} multi={multi} hero={!multi} />
                </motion.div>
              ))}
            </div>
            {done && !multi && ordered[0].kind === "char" && ordered[0].traits.length > 0 && (
              <motion.div className="mx-auto mt-4 max-w-md rounded-xl border border-white/10 bg-slate-900/80 p-3" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <div className="mb-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-400">Mutations</div>
                <TraitChips traits={ordered[0].traits} className="justify-center" />
              </motion.div>
            )}
            {done && (
              <motion.div className="mt-6 flex justify-center" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Button
                  size="lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                  }}
                >
                  Continue
                </Button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close"
      >
        <X className="size-5" />
      </button>
      <p className="absolute bottom-4 text-xs text-slate-500">Click anywhere to skip</p>
    </div>
  );
}

function RatesDialog({ open, onOpenChange, cfg, banner }: { open: boolean; onOpenChange: (o: boolean) => void; cfg: GachaConfig; banner: BannerView }) {
  const total = Object.values(cfg.gacha.rates).reduce((a, b) => a + b, 0);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Drop rates · {banner.name}</DialogTitle>
        </DialogHeader>
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-slate-400">
            <tr>
              <th className="py-1 text-left">Rarity</th>
              <th className="py-1 text-right">Chance</th>
              <th className="py-1 text-right">Roll range</th>
            </tr>
          </thead>
          <tbody>
            {RARITIES.map((r) => (
              <tr key={r} className="border-t border-white/5">
                <td className="py-1.5">
                  <RarityBadge rarity={r} /> <span className="ml-1 text-slate-300">{RARITY_INFO[r].label}</span>
                </td>
                <td className="py-1.5 text-right tabular-nums">{((cfg.gacha.rates[r] / total) * 100).toFixed(2)}%</td>
                <td className="py-1.5 text-right tabular-nums text-slate-400">
                  {cfg.gacha.rollRanges[r][0]} to {cfg.gacha.rollRanges[r][1]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <ul className="list-disc space-y-1 pl-5 text-xs text-slate-400">
          <li>Players roll Talent; gear rolls Quality. Rolls are permanent and never rerolled.</li>
          <li>Characters can roll up to 5 unique mutations (+ or −) that permanently buff or nerf stats. Higher rarities roll more.</li>
          <li>Order: C → UC → R → E → Legendary → Mythic → World Class → #1. Legendary and above have unique portrait art.</li>
          <li>Legendary or better is guaranteed within {banner.pity.hardL} pulls. #1 is guaranteed within {banner.pity.hardN1} pulls.</li>
          <li>Every 10-pull includes at least one Rare or better.</li>
          {banner.featured.length > 0 && (
            <li>When you hit a rarity with a featured version, there is a {Math.round(cfg.gacha.featuredShare * 100)}% chance it is a featured one.</li>
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

function Gacha() {
  const { user, setUser } = useSession();
  const { data, error, loading, reload } = useApi<{ banners: BannerView[] }>("/gacha");
  const cfg = useApi<GachaConfig>("/config");
  const [active, setActive] = useState("feat_bm");
  const [busy, setBusy] = useState(false);
  const [reveal, setReveal] = useState<Item[] | null>(null);
  const [ratesOpen, setRatesOpen] = useState(false);

  if ((loading && !data) || (cfg.loading && !cfg.data)) return <Loading label="Opening the scout room..." />;
  if (error || !data || !cfg.data) return <ErrorState message={error ?? cfg.error ?? "Couldn't load banners"} onRetry={reload} />;
  const banner = data.banners.find((b) => b.id === active) ?? data.banners[0];
  const g = cfg.data.gacha;

  const pull = async (count: 1 | 10) => {
    setBusy(true);
    try {
      const r = await api<{ items: Item[]; user: Profile }>("/gacha/pull", { body: { bannerId: banner.id, count }, idempotent: true });
      setUser(r.user);
      setReveal(r.items);
      void reload();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Pull failed");
    } finally {
      setBusy(false);
    }
  };

  const gems = user?.gems ?? 0;
  return (
    <div>
      <PageHeader title="Scout" kicker="Gacha">
        <Button variant="outline" size="sm" onClick={() => setRatesOpen(true)}>
          <Info /> Rates and pity
        </Button>
      </PageHeader>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {data.banners.map((b) => (
          <button
            key={b.id}
            onClick={() => setActive(b.id)}
            className={cn(
              "shrink-0 rounded-xl border px-4 py-2 text-left text-sm transition",
              b.id === banner.id ? "border-white/40 bg-white/10 text-white" : "border-white/10 text-slate-400 hover:text-white",
            )}
            style={b.id === banner.id ? { boxShadow: `inset 0 -3px 0 ${b.accent}` } : undefined}
          >
            <div className="font-semibold">{b.name}</div>
            <div className="text-xs opacity-70">{b.kind === "gear" ? "Gear" : "Characters"}</div>
          </button>
        ))}
      </div>

      <motion.div
        key={banner.id}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="relative overflow-hidden rounded-3xl border border-white/10 p-6"
        style={{ background: `radial-gradient(ellipse at 80% 20%, ${banner.accent}55, transparent 60%), linear-gradient(135deg, #0b1530, #020617)` }}
      >
        <div className="speedlines absolute inset-0 opacity-10" />
        <div className="relative grid gap-6 lg:grid-cols-[1fr_auto]">
          <div className="flex flex-col">
            <h2 className="font-heading text-4xl uppercase italic text-white sm:text-5xl">{banner.name}</h2>
            <p className="mt-1 max-w-lg text-slate-300">{banner.tagline}</p>
            {banner.featured.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {banner.featured.map((v) => (
                  <span key={v} className="inline-flex items-center gap-1 rounded-full bg-slate-950/70 px-2 py-1 text-xs text-slate-200">
                    <RarityBadge rarity={VARIANT_BY_ID[v].rarity} /> {variantName(v)}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-5 grid max-w-md gap-3">
              <div>
                <div className="mb-1 flex justify-between text-xs text-slate-300">
                  <span>Legendary+ pity</span>
                  <span className="tabular-nums">
                    {banner.pity.sinceL} / {banner.pity.hardL}
                  </span>
                </div>
                <Progress value={(banner.pity.sinceL / banner.pity.hardL) * 100} />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs text-slate-300">
                  <span>#1 pity</span>
                  <span className="tabular-nums">
                    {banner.pity.sinceN1} / {banner.pity.hardN1}
                  </span>
                </div>
                <Progress value={(banner.pity.sinceN1 / banner.pity.hardN1) * 100} />
              </div>
              <div className="text-xs text-slate-500">{banner.pity.total} pulls on this banner so far</div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button size="lg" variant="secondary" disabled={busy || gems < g.pullCost} onClick={() => pull(1)}>
                <Sparkles /> Pull x1{" "}
                <span className="ml-1 inline-flex items-center gap-1 opacity-80">
                  <Gem className="size-4" />
                  {g.pullCost}
                </span>
              </Button>
              <Button size="lg" disabled={busy || gems < g.tenPullCost} onClick={() => pull(10)} className="shadow-[0_0_30px_-6px_rgba(59,130,246,0.9)]">
                <Sparkles /> Pull x10{" "}
                <span className="ml-1 inline-flex items-center gap-1 opacity-80">
                  <Gem className="size-4" />
                  {g.tenPullCost}
                </span>
              </Button>
            </div>
            {gems < g.pullCost && <p className="mt-2 text-sm text-amber-300">Out of gems. Clear story stages, finish quests and level up to earn more.</p>}
          </div>
          <div className="relative hidden h-72 w-80 lg:block">
            {banner.kind === "gear" ? (
              <div className="grid h-full place-items-center">
                <div className="grid grid-cols-3 gap-3">
                  {(["N1", "WC", "M", "L"] as Rarity[]).map((r) => (
                    <div key={r} className="grid size-20 place-items-center rounded-2xl border" style={{ borderColor: RARITY_INFO[r].color, boxShadow: `0 0 30px -4px ${RARITY_INFO[r].glow}` }}>
                      <span className="font-heading text-2xl" style={{ color: RARITY_INFO[r].color }}>
                        {RARITY_INFO[r].short}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              (banner.featured.length ? banner.featured : ["isagi.base", "rin.base", "nagi.base"]).slice(0, 3).map((v, i) => (
                <div key={v} className="absolute" style={{ left: i * 70, top: i === 1 ? 0 : 50, zIndex: 3 - i }}>
                  <Portrait
                    id={VARIANT_BY_ID[v].characterId}
                    variantId={v}
                    expr="ego"
                    className="h-52 w-52 drop-shadow-[0_0_30px_rgba(0,0,0,0.8)]"
                    flip={i === 1}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </motion.div>

      <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-8">
        {RARITIES.map((r) => (
          <div key={r} className="rounded-lg border bg-slate-900/70 p-2 text-center" style={{ borderColor: `${RARITY_INFO[r].color}55` }}>
            <div className="font-heading text-lg" style={{ color: RARITY_INFO[r].color }}>
              {RARITY_INFO[r].short}
            </div>
            <div className="truncate text-[11px] text-slate-400">{RARITY_INFO[r].label}</div>
          </div>
        ))}
      </div>

      <RatesDialog open={ratesOpen} onOpenChange={setRatesOpen} cfg={cfg.data} banner={banner} />
      {reveal && <Reveal items={reveal} onClose={() => setReveal(null)} />}
    </div>
  );
}

export default function GachaPage() {
  return (
    <RequireAuth>
      <Gacha />
    </RequireAuth>
  );
}

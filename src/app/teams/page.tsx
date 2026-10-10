"use client";

import { useEffect, useMemo, useState } from "react";
import { Crown, Plus, Save, Star, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/auth-card";
import { PageHeader, Loading, ErrorState } from "@/components/states";
import { ItemCard, RarityBadge } from "@/components/game/item-card";
import { Portrait } from "@/components/game/portrait";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import type { CharItem, Item, TeamView } from "@/lib/types";
import { cn } from "@/lib/utils";

type Formation = TeamView["formation"];
const FORMATIONS: { id: Formation; label: string; desc: string }[] = [
  { id: "balanced", label: "Balanced", desc: "Even spacing. Good default." },
  { id: "attack", label: "All-out attack", desc: "Bots push high. Risky on the counter." },
  { id: "defend", label: "Low block", desc: "Bots stay deep and counter." },
];
const SLOT_LABELS = ["Captain (you)", "Striker", "Wing", "Midfield", "Defense"];

interface Draft {
  id: number | null;
  name: string;
  formation: Formation;
  slots: (number | null)[];
}

const toDraft = (t: TeamView): Draft => ({ id: t.id, name: t.name, formation: t.formation, slots: [...t.slots, null, null, null, null, null].slice(0, 5) });

function Teams() {
  const teams = useApi<{ teams: TeamView[] }>("/teams");
  const coll = useApi<{ items: Item[] }>("/collection");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [slot, setSlot] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!draft && teams.data?.teams.length) setDraft(toDraft(teams.data.teams.find((t) => t.isDefault) ?? teams.data.teams[0]));
  }, [teams.data, draft]);

  const chars = useMemo(() => (coll.data?.items ?? []).filter((i): i is CharItem => i.kind === "char").sort((a, b) => b.ovr - a.ovr), [coll.data]);
  const byId = useMemo(() => new Map(chars.map((c) => [c.id, c])), [chars]);

  if ((teams.loading && !teams.data) || (coll.loading && !coll.data)) return <Loading label="Loading your squads..." />;
  if (teams.error || coll.error || !teams.data || !coll.data)
    return (
      <ErrorState
        message={teams.error ?? coll.error ?? "Couldn't load teams"}
        onRetry={() => {
          void teams.reload();
          void coll.reload();
        }}
      />
    );
  if (!draft) return <Loading />;

  const picked = draft.slots.map((id) => (id != null ? (byId.get(id) ?? null) : null));
  const usedChars = new Set(picked.filter(Boolean).map((p) => p!.characterId));
  const filled = picked.filter(Boolean) as CharItem[];
  const ovr = filled.length ? Math.round(filled.reduce((s, p) => s + p.ovr, 0) / filled.length) : 0;
  const current = teams.data.teams.find((t) => t.id === draft.id);

  const assign = (c: CharItem) => {
    const slots = [...draft.slots];
    const existing = slots.indexOf(c.id);
    if (existing >= 0) slots[existing] = null;
    const clash = slots.findIndex((id, i) => id != null && i !== slot && byId.get(id)?.characterId === c.characterId);
    if (clash >= 0) slots[clash] = null;
    slots[slot] = c.id;
    setDraft({ ...draft, slots });
    const nextEmpty = slots.findIndex((x) => x == null);
    if (nextEmpty >= 0) setSlot(nextEmpty);
  };

  const save = async () => {
    setBusy(true);
    try {
      const body = { name: draft.name.trim() || "My Team", formation: draft.formation, slots: draft.slots };
      if (draft.id) await api(`/teams/${draft.id}`, { method: "PUT", body });
      else {
        const r = await api<{ id: number }>("/teams", { body });
        setDraft({ ...draft, id: r.id });
      }
      toast.success("Team saved");
      await teams.reload();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't save the team");
    } finally {
      setBusy(false);
    }
  };

  const setDefault = async () => {
    if (!draft.id) return;
    try {
      await api(`/teams/${draft.id}/default`, { method: "POST" });
      toast.success(`${draft.name} is now your default team`);
      await teams.reload();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't set default");
    }
  };

  const remove = async () => {
    if (!draft.id) return setDraft(toDraft(teams.data!.teams[0]));
    try {
      await api(`/teams/${draft.id}`, { method: "DELETE" });
      toast.success("Team deleted");
      await teams.reload();
      setDraft(null);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't delete the team");
    }
  };

  return (
    <div>
      <PageHeader title="Teams" kicker="Squad builder">
        <Button
          variant="outline"
          disabled={teams.data.teams.length >= 8}
          onClick={() => {
            setDraft({ id: null, name: `Squad ${teams.data!.teams.length + 1}`, formation: "balanced", slots: [null, null, null, null, null] });
            setSlot(0);
          }}
        >
          <Plus /> New team
        </Button>
      </PageHeader>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {teams.data.teams.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setDraft(toDraft(t));
              setSlot(0);
            }}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm",
              draft.id === t.id ? "border-blue-500 bg-blue-950/50 text-white" : "border-white/10 text-slate-400 hover:text-white",
            )}
          >
            {t.isDefault && <Star className="size-3.5 fill-amber-400 text-amber-400" />}
            {t.name} <span className="text-xs opacity-70">OVR {t.ovr}</span>
          </button>
        ))}
        {!draft.id && <span className="shrink-0 rounded-xl border border-dashed border-blue-500 px-3 py-2 text-sm text-blue-200">New team (unsaved)</span>}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1">
              <label className="text-xs text-slate-400" htmlFor="tname">
                Team name
              </label>
              <Input id="tname" value={draft.name} maxLength={24} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </div>
            <div className="font-heading text-3xl italic text-white">OVR {ovr}</div>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {FORMATIONS.map((f) => (
              <button
                key={f.id}
                onClick={() => setDraft({ ...draft, formation: f.id })}
                className={cn(
                  "rounded-lg border p-2 text-left text-xs",
                  draft.formation === f.id ? "border-blue-500 bg-blue-950/40 text-white" : "border-white/10 text-slate-400 hover:text-white",
                )}
              >
                <div className="font-semibold">{f.label}</div>
                <div>{f.desc}</div>
              </button>
            ))}
          </div>

          <div className="relative mt-4 overflow-hidden rounded-xl border border-emerald-500/20 bg-gradient-to-r from-emerald-900/50 via-emerald-800/40 to-emerald-900/50 p-3">
            <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-white/20" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15" />
            <div className="relative grid grid-cols-5 gap-2">
              {picked.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setSlot(i)}
                  className={cn(
                    "group relative flex flex-col items-center rounded-lg border bg-slate-950/70 p-1.5 text-center transition",
                    slot === i ? "border-cyan-300 ring-2 ring-cyan-400/50" : "border-white/10 hover:border-white/30",
                  )}
                >
                  {i === 0 && <Crown className="absolute -top-2 left-1/2 size-4 -translate-x-1/2 text-amber-300" />}
                  <Portrait id={p?.characterId ?? "isagi"} className={cn("h-14 w-14", !p && "opacity-20 grayscale")} />
                  <div className="w-full truncate text-[11px] font-semibold text-white">{p ? p.name.split(" (")[0].split(" ")[0] : "Empty"}</div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    {p ? (
                      <>
                        <RarityBadge rarity={p.rarity} /> {p.ovr}
                      </>
                    ) : (
                      SLOT_LABELS[i]
                    )}
                  </div>
                  {p && (
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label="Remove"
                      onClick={(e) => {
                        e.stopPropagation();
                        const slots = [...draft.slots];
                        slots[i] = null;
                        setDraft({ ...draft, slots });
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const slots = [...draft.slots];
                          slots[i] = null;
                          setDraft({ ...draft, slots });
                        }
                      }}
                      className="absolute right-0.5 top-0.5 hidden rounded bg-slate-900 p-0.5 text-slate-400 hover:text-white group-hover:block"
                    >
                      <X className="size-3" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Slot 1 is the player you control. Smaller matches use the first slots in order. Empty slots are filled by trainees. Only one version of each character per team.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={save} disabled={busy}>
              <Save /> Save team
            </Button>
            {draft.id && !current?.isDefault && (
              <Button variant="outline" onClick={setDefault}>
                <Star /> Make default
              </Button>
            )}
            {(draft.id ? teams.data.teams.length > 1 : true) && (
              <Button variant="ghost" className="ml-auto text-red-300" onClick={remove}>
                <Trash2 /> {draft.id ? "Delete" : "Discard"}
              </Button>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
          <div className="mb-2 text-sm text-slate-300">
            Pick a player for <span className="font-semibold text-cyan-300">{SLOT_LABELS[slot]}</span>
          </div>
          <div className="grid max-h-[560px] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
            {chars.map((c) => {
              const inTeam = draft.slots.includes(c.id);
              const sameChar = !inTeam && usedChars.has(c.characterId) && picked[slot]?.characterId !== c.characterId;
              return (
                <div key={c.id} className={cn("relative", (c.locked || sameChar) && "opacity-40")}>
                  <ItemCard
                    item={c}
                    compact
                    selected={inTeam}
                    onClick={c.locked ? undefined : () => assign(c)}
                    footer={
                      c.locked ? (
                        <span className="text-[10px] text-amber-300">Locked</span>
                      ) : sameChar ? (
                        <span className="text-[10px] text-slate-400">Swaps out other version</span>
                      ) : inTeam ? (
                        <span className="text-[10px] text-blue-300">In team</span>
                      ) : null
                    }
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TeamsPage() {
  return (
    <RequireAuth>
      <Teams />
    </RequireAuth>
  );
}

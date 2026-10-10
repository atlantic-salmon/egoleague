"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeftRight, Check, Ghost, LogIn, UserMinus, UserPlus, Users, X } from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/auth-card";
import { PageHeader, Loading, ErrorState, Empty } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";

interface FriendsData {
  friends: { id: number; username: string; level: number; rating: number; online: boolean; lobby: { code: string; status: string; players: number } | null }[];
  incoming: { id: number; username: string }[];
  outgoing: { id: number; username: string }[];
}

function Friends() {
  const { data, error, loading, reload } = useApi<FriendsData>("/friends");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      await reload();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorState message={error ?? "Couldn't load friends"} onRetry={reload} />;

  return (
    <div>
      <PageHeader title="Friends" kicker={`${data.friends.filter((f) => f.online).length} online`}>
        <Button size="sm" variant="ghost" onClick={reload}>
          Refresh
        </Button>
      </PageHeader>
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-2">
          {data.friends.length === 0 ? (
            <Empty title="No friends yet" icon={<Users className="size-6 text-slate-500" />}>
              Send a request by username. Friends can join your lobbies and challenge your team in ghost matches.
            </Empty>
          ) : (
            data.friends.map((f) => (
              <div key={f.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3">
                <span className={cn("size-2.5 rounded-full", f.online ? "bg-emerald-400" : "bg-slate-600")} />
                <div>
                  <div className="font-semibold text-white">{f.username}</div>
                  <div className="text-xs text-slate-400">
                    Lv {f.level} · {f.rating} rating · {f.lobby ? (f.lobby.status === "open" ? `In a lobby (${f.lobby.players})` : "In a match") : f.online ? "Online" : "Offline"}
                  </div>
                </div>
                <div className="ml-auto flex flex-wrap gap-1">
                  {f.lobby?.status === "open" && (
                    <Button size="sm" render={<Link href={`/play/lobby?code=${f.lobby.code}`} />} nativeButton={false}>
                      <LogIn /> Join lobby
                    </Button>
                  )}
                  <Button size="sm" variant="outline" render={<Link href="/play/ghost" />} nativeButton={false}>
                    <Ghost /> Ghost match
                  </Button>
                  <Button size="sm" variant="outline" render={<Link href={`/trades?to=${encodeURIComponent(f.username)}`} />} nativeButton={false}>
                    <ArrowLeftRight /> Trade
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Remove ${f.username}`}
                    disabled={busy}
                    onClick={() => run(() => api(`/friends/${f.id}`, { method: "DELETE" }), `Removed ${f.username}`)}
                  >
                    <UserMinus />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="space-y-4">
          <form
            className="rounded-2xl border border-white/10 bg-slate-900/70 p-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim().length < 3) return;
              void run(() => api("/friends/request", { body: { username: name.trim() } }), `Request sent to ${name.trim()}`).then(() => setName(""));
            }}
          >
            <div className="mb-2 font-semibold text-white">Add a friend</div>
            <div className="flex gap-2">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Username" maxLength={16} aria-label="Username" />
              <Button type="submit" disabled={busy || name.trim().length < 3}>
                <UserPlus /> Add
              </Button>
            </div>
          </form>
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
            <div className="mb-2 font-semibold text-white">Requests</div>
            {data.incoming.length === 0 && data.outgoing.length === 0 && <p className="text-sm text-slate-500">No pending requests.</p>}
            <div className="space-y-2">
              {data.incoming.map((r) => (
                <div key={r.id} className="flex items-center gap-2 text-sm">
                  <span className="text-white">{r.username}</span>
                  <span className="text-xs text-slate-500">wants to be friends</span>
                  <Button size="icon-sm" className="ml-auto" aria-label="Accept" disabled={busy} onClick={() => run(() => api(`/friends/${r.id}/accept`, { method: "POST" }), `You and ${r.username} are now friends`)}>
                    <Check />
                  </Button>
                  <Button size="icon-sm" variant="ghost" aria-label="Decline" disabled={busy} onClick={() => run(() => api(`/friends/${r.id}`, { method: "DELETE" }), "Request declined")}>
                    <X />
                  </Button>
                </div>
              ))}
              {data.outgoing.map((r) => (
                <div key={r.id} className="flex items-center gap-2 text-sm">
                  <span className="text-slate-300">{r.username}</span>
                  <span className="text-xs text-slate-500">pending</span>
                  <Button size="xs" variant="ghost" className="ml-auto" disabled={busy} onClick={() => run(() => api(`/friends/${r.id}`, { method: "DELETE" }), "Request cancelled")}>
                    Cancel
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FriendsPage() {
  return (
    <RequireAuth>
      <Friends />
    </RequireAuth>
  );
}

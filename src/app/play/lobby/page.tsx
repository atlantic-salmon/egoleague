"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeftRight, Bot, Copy, Crown, DoorOpen, LogIn, Minus, Plus, Swords, Users } from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/auth-card";
import { PageHeader, Loading, Empty } from "@/components/states";
import { OnlineMatch } from "@/components/game/match-view";
import { ConnectionBadge, OnlineResult } from "@/components/game/online-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOnline } from "@/lib/use-online";
import { useApi } from "@/lib/use-api";
import { useSession } from "@/lib/session";
import type { TeamView } from "@/lib/types";
import type { GameSocket } from "@/lib/socket";
import { DIFFICULTY_LABEL, type Difficulty, type LobbyView } from "@/shared/protocol";
import { cn } from "@/lib/utils";

type Friend = { id: number; username: string; level: number; rating: number; online: boolean; lobby: { code: string; status: string; players: number } | null };

const DURATIONS = [90, 120, 150, 180, 240, 300];

function SideColumn({
  lobby,
  side,
  socket,
  meId,
  isHost,
}: {
  lobby: LobbyView;
  side: 0 | 1;
  socket: GameSocket;
  meId: number;
  isHost: boolean;
}) {
  const slots = lobby.sides[side];
  const color = side === 0 ? "#2563eb" : "#dc2626";
  const amHere = slots.some((s) => s.kind === "human" && s.userId === meId);
  return (
    <div className="rounded-2xl border bg-slate-900/70 p-4" style={{ borderColor: `${color}66` }}>
      <div className="mb-3 flex items-center justify-between">
        <div className="font-heading text-xl uppercase italic" style={{ color }}>
          {side === 0 ? "Blue side" : "Red side"} <span className="text-sm text-slate-400">({slots.length}/5)</span>
        </div>
        {isHost && (
          <div className="flex gap-1">
            <Button size="icon-sm" variant="outline" aria-label="Remove bot" onClick={() => socket.send({ t: "lobby.bot", side, action: "remove" })}>
              <Minus />
            </Button>
            <Button size="icon-sm" variant="outline" aria-label="Add bot" disabled={slots.length >= 5} onClick={() => socket.send({ t: "lobby.bot", side, action: "add" })}>
              <Plus />
            </Button>
          </div>
        )}
      </div>
      <div className="space-y-2">
        {slots.length === 0 && <div className="rounded-lg border border-dashed border-white/10 p-3 text-center text-sm text-slate-500">Empty side</div>}
        {slots.map((s, i) =>
          s.kind === "human" ? (
            <div key={s.userId} className={cn("flex items-center gap-2 rounded-lg border bg-slate-950/70 px-3 py-2", s.userId === meId ? "border-cyan-400/60" : "border-white/10")}>
              <span className={cn("size-2 rounded-full", s.online ? "bg-emerald-400" : "bg-slate-600")} />
              <span className="font-semibold text-white">{s.name}</span>
              {lobby.hostId === s.userId && <Crown className="size-4 text-amber-300" />}
              {s.userId === meId && <span className="text-xs text-cyan-300">you</span>}
              <span className="ml-auto text-xs text-slate-500">{s.teamId ? "Custom team" : "Default team"}</span>
              {isHost && s.userId !== meId && (
                <Button size="icon-xs" variant="ghost" aria-label="Move to other side" onClick={() => socket.send({ t: "lobby.move", side: (1 - side) as 0 | 1, userId: s.userId })}>
                  <ArrowLeftRight />
                </Button>
              )}
            </div>
          ) : (
            <div key={s.id} className="flex items-center gap-2 rounded-lg border border-white/5 bg-slate-950/40 px-3 py-2 text-slate-400">
              <Bot className="size-4" /> Bot {i + 1}
              <span className="ml-auto text-xs">{DIFFICULTY_LABEL[lobby.settings.difficulty]}</span>
            </div>
          ),
        )}
      </div>
      {!amHere && lobby.status === "open" && (
        <Button className="mt-3 w-full" variant="outline" onClick={() => socket.send({ t: "lobby.move", side })}>
          <ArrowLeftRight /> Switch to this side
        </Button>
      )}
    </div>
  );
}

function LobbyRoom({ lobby, socket }: { lobby: LobbyView; socket: GameSocket }) {
  const { user } = useSession();
  const teams = useApi<{ teams: TeamView[] }>("/teams");
  const isHost = user?.id === lobby.hostId;
  const me = lobby.sides.flat().find((s) => s.kind === "human" && s.userId === user?.id);
  const myTeamId = me && me.kind === "human" ? me.teamId : null;
  const humans = lobby.sides.flat().filter((s) => s.kind === "human").length;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(lobby.code);
      toast.success("Lobby code copied");
    } catch {
      toast.message(`Lobby code: ${lobby.code}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-blue-500/30 bg-blue-950/30 p-4">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-blue-300">Lobby code</div>
          <button onClick={copy} className="flex items-center gap-2 font-heading text-4xl tracking-[0.2em] text-white hover:text-blue-200">
            {lobby.code} <Copy className="size-5" />
          </button>
        </div>
        <p className="max-w-sm text-sm text-slate-300">Share this code with friends on other laptops. They join from Play &gt; Friendly lobby.</p>
        <Button variant="ghost" className="ml-auto" onClick={() => socket.send({ t: "lobby.leave" })}>
          <DoorOpen /> Leave
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <SideColumn lobby={lobby} side={0} socket={socket} meId={user?.id ?? 0} isHost={isHost} />
        <SideColumn lobby={lobby} side={1} socket={socket} meId={user?.id ?? 0} isHost={isHost} />
      </div>

      <div className="grid gap-4 rounded-2xl border border-white/10 bg-slate-900/70 p-4 lg:grid-cols-3">
        <div>
          <div className="mb-1 text-sm text-slate-300">Your team (bots on your side are drawn from it)</div>
          <select
            className="w-full rounded-md border border-white/10 bg-slate-950 px-2 py-2 text-sm text-white"
            value={myTeamId ?? ""}
            onChange={(e) => socket.send({ t: "lobby.team", teamId: e.target.value ? Number(e.target.value) : null })}
          >
            <option value="">Default team</option>
            {teams.data?.teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} (OVR {t.ovr})
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="mb-1 text-sm text-slate-300">Match length {isHost ? "" : "(host)"}</div>
          <div className="flex flex-wrap gap-1">
            {DURATIONS.map((d) => (
              <Button
                key={d}
                size="sm"
                disabled={!isHost}
                variant={lobby.settings.durationSec === d ? "default" : "outline"}
                onClick={() => socket.send({ t: "lobby.settings", durationSec: d })}
              >
                {Math.floor(d / 60)}:{String(d % 60).padStart(2, "0")}
              </Button>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-1 text-sm text-slate-300">Bot difficulty {isHost ? "" : "(host)"}</div>
          <div className="flex flex-wrap gap-1">
            {(Object.keys(DIFFICULTY_LABEL) as Difficulty[]).map((d) => (
              <Button
                key={d}
                size="sm"
                disabled={!isHost}
                variant={lobby.settings.difficulty === d ? "default" : "outline"}
                onClick={() => socket.send({ t: "lobby.settings", difficulty: d })}
              >
                {DIFFICULTY_LABEL[d]}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-400">
          {humans} human{humans === 1 ? "" : "s"} · Friendly matches give small rewards (daily cap) and never change your rating.
        </p>
        {isHost ? (
          <Button size="lg" onClick={() => socket.send({ t: "lobby.start" })} disabled={lobby.status !== "open"}>
            <Swords /> {lobby.status === "playing" ? "Match in progress" : "Start match"}
          </Button>
        ) : (
          <span className="text-sm text-slate-300">Waiting for the host to start...</span>
        )}
      </div>
    </div>
  );
}

function NoLobby({ socket }: { socket: GameSocket }) {
  const friends = useApi<{ friends: Friend[] }>("/friends");
  const [code, setCode] = useState("");
  const joinable = friends.data?.friends.filter((f) => f.lobby && f.lobby.status === "open") ?? [];
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
          <div className="font-heading text-xl uppercase italic text-white">Host a lobby</div>
          <p className="mt-1 text-sm text-slate-400">Pick sides, add bots to either team and set the difficulty. Up to 5 per side.</p>
          <Button className="mt-4" size="lg" onClick={() => socket.send({ t: "lobby.create" })}>
            <Plus /> Create lobby
          </Button>
        </div>
        <form
          className="rounded-2xl border border-white/10 bg-slate-900/70 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (code.trim().length >= 4) socket.send({ t: "lobby.join", code: code.trim().toUpperCase() });
          }}
        >
          <div className="font-heading text-xl uppercase italic text-white">Join with a code</div>
          <div className="mt-3 flex gap-2">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
              placeholder="ABC123"
              className="font-heading text-lg tracking-[0.3em]"
              aria-label="Lobby code"
            />
            <Button type="submit" disabled={code.length < 4}>
              <LogIn /> Join
            </Button>
          </div>
        </form>
      </div>
      <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="font-heading text-xl uppercase italic text-white">Friends&apos; lobbies</div>
          <Button size="sm" variant="ghost" onClick={friends.reload}>
            Refresh
          </Button>
        </div>
        {friends.loading && !friends.data ? (
          <Loading />
        ) : joinable.length === 0 ? (
          <Empty title="No open lobbies" icon={<Users className="size-6 text-slate-500" />}>
            When a friend hosts a lobby it shows up here.{" "}
            <Link href="/friends" className="text-blue-300 underline">
              Add friends
            </Link>
          </Empty>
        ) : (
          <div className="space-y-2">
            {joinable.map((f) => (
              <div key={f.id} className="flex items-center gap-3 rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2">
                <span className="size-2 rounded-full bg-emerald-400" />
                <span className="font-semibold text-white">{f.username}</span>
                <span className="text-xs text-slate-400">{f.lobby!.players} in lobby</span>
                <Button size="sm" className="ml-auto" onClick={() => socket.send({ t: "lobby.join", code: f.lobby!.code })}>
                  Join
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Lobby() {
  const { socket, status, feed, lobby, match, end, clearEnd } = useOnline();
  const autoJoined = useRef(false);

  useEffect(() => {
    if (!socket || status !== "open" || autoJoined.current) return;
    const code = new URLSearchParams(window.location.search).get("code");
    autoJoined.current = true;
    if (code) socket.send({ t: "lobby.join", code: code.toUpperCase() });
  }, [socket, status]);

  if (match && feed && socket)
    return (
      <div>
        <div className="mb-2 flex items-center justify-between text-sm text-slate-400">
          <span>Friendly match · server authoritative</span>
          <Button size="sm" variant="ghost" onClick={() => socket.send({ t: "match.leave" })}>
            <DoorOpen /> Leave (a bot takes over)
          </Button>
        </div>
        <OnlineMatch key={match.matchId} config={match.config} you={match.you} feed={feed} />
      </div>
    );

  if (end)
    return (
      <OnlineResult
        end={end}
        actions={
          <Button size="lg" onClick={clearEnd}>
            Back to lobby
          </Button>
        }
      />
    );

  return (
    <div>
      <PageHeader title="Friendly lobby" kicker="Online">
        <ConnectionBadge status={status} />
      </PageHeader>
      {!socket || status === "connecting" ? (
        <Loading label="Connecting to the Blue Lock servers..." />
      ) : status === "replaced" ? (
        <Empty title="You're connected in another tab">Close the other tab or reload this one to play here.</Empty>
      ) : lobby ? (
        <LobbyRoom lobby={lobby} socket={socket} />
      ) : (
        <NoLobby socket={socket} />
      )}
    </div>
  );
}

export default function LobbyPage() {
  return (
    <RequireAuth>
      <Lobby />
    </RequireAuth>
  );
}

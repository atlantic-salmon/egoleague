"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useGameSocket, useSnapFeed } from "./socket";
import { useSession } from "./session";
import type { LobbyView, MatchRewardView } from "@/shared/protocol";
import type { MatchConfig } from "@/game/types";

export interface OnlineMatchInfo {
  matchId: string;
  config: MatchConfig;
  you: number;
  mode: "friendly" | "ranked";
}

export interface OnlineEnd {
  score: [number, number];
  side: 0 | 1;
  reward: MatchRewardView;
  mode: "friendly" | "ranked";
  config: MatchConfig;
}

/** One WebSocket per page, with lobby, queue and match state derived from server messages. */
export function useOnline() {
  const { user, refresh } = useSession();
  const { socket, status } = useGameSocket(!!user);
  const feed = useSnapFeed(socket);
  const [lobby, setLobby] = useState<LobbyView | null>(null);
  const [queue, setQueue] = useState<{ status: "idle" | "searching"; waiting: number; since: number }>({ status: "idle", waiting: 0, since: 0 });
  const [match, setMatch] = useState<OnlineMatchInfo | null>(null);
  const [end, setEnd] = useState<OnlineEnd | null>(null);

  useEffect(() => {
    if (!socket) return;
    let current: OnlineMatchInfo | null = null;
    return socket.on((m) => {
      switch (m.t) {
        case "lobby":
          setLobby(m.lobby);
          break;
        case "lobby.closed":
          setLobby(null);
          toast.message(m.reason);
          break;
        case "error":
          toast.error(m.msg);
          break;
        case "queue":
          setQueue((q) => ({ status: m.status, waiting: m.waiting, since: m.status === "searching" && q.status !== "searching" ? Date.now() : q.since }));
          break;
        case "match.start":
          current = { matchId: m.matchId, config: m.config, you: m.you, mode: m.mode };
          setEnd(null);
          setMatch(current);
          setQueue({ status: "idle", waiting: 0, since: 0 });
          break;
        case "match.end":
          if (current) setEnd({ score: m.score, side: m.side, reward: m.reward, mode: m.mode, config: current.config });
          current = null;
          setMatch(null);
          void refresh();
          break;
      }
    });
  }, [socket, refresh]);

  return { socket, status, feed, lobby, queue, match, end, clearEnd: () => setEnd(null) };
}

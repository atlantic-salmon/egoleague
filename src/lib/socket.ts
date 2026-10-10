"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import type { ClientMsg, ServerMsg } from "@/shared/protocol";
import type { SnapFeed } from "@/components/game/match-view";

type Listener = (m: ServerMsg) => void;

export class GameSocket {
  private ws: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private closed = false;
  status: "connecting" | "open" | "closed" | "replaced" = "connecting";
  onStatus?: (s: GameSocket["status"]) => void;

  async connect() {
    this.closed = false;
    this.setStatus("connecting");
    try {
      const { ticket } = await api<{ ticket: string }>("/ws-ticket");
      if (this.closed) return;
      const proto = location.protocol === "https:" ? "wss" : "ws";
      const ws = new WebSocket(`${proto}://${location.host}/ws?ticket=${encodeURIComponent(ticket)}`);
      this.ws = ws;
      ws.onopen = () => this.setStatus("open");
      ws.onclose = (e) => {
        this.setStatus(e.code === 4000 ? "replaced" : "closed");
        if (e.code === 4000) this.closed = true;
        if (!this.closed) setTimeout(() => void this.connect(), 2000);
      };
      ws.onmessage = (e) => {
        let m: ServerMsg;
        try {
          m = JSON.parse(e.data as string);
        } catch {
          return;
        }
        for (const l of this.listeners) l(m);
      };
    } catch {
      this.setStatus("closed");
      if (!this.closed) setTimeout(() => void this.connect(), 3000);
    }
  }

  private setStatus(s: GameSocket["status"]) {
    this.status = s;
    this.onStatus?.(s);
  }

  send(m: ClientMsg) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(m));
  }

  on(l: Listener) {
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  }

  close() {
    this.closed = true;
    this.ws?.close();
  }
}

export function useGameSocket(enabled: boolean) {
  const [status, setStatus] = useState<GameSocket["status"]>("connecting");
  const [sock, setSock] = useState<GameSocket | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const s = new GameSocket();
    s.onStatus = (st) => {
      setStatus(st);
      setSock(s);
    };
    void s.connect();
    return () => s.close();
  }, [enabled]);
  return { socket: sock, status };
}

export function useSnapFeed(socket: GameSocket | null): SnapFeed | null {
  return useMemo(() => {
    if (!socket) return null;
    return {
      subscribe: (cb) =>
        socket.on((m) => {
          if (m.t === "snap") cb(m.s, m.ev);
        }),
      sendInput: (b) => socket.send({ t: "in", b }),
    };
  }, [socket]);
}

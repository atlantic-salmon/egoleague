"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "./api";
import type { Profile } from "./types";

interface SessionCtx {
  user: Profile | null;
  loading: boolean;
  refresh: () => Promise<void>;
  setUser: (u: Profile | null) => void;
}

const Ctx = createContext<SessionCtx>({ user: null, loading: true, refresh: async () => {}, setUser: () => {} });

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    try {
      const r = await api<{ user: Profile | null }>("/me");
      setUser(r.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    api<{ user: Profile | null }>("/me")
      .then((r) => setUser(r.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);
  return <Ctx.Provider value={{ user, loading, refresh, setUser }}>{children}</Ctx.Provider>;
}

export function useSession() {
  return useContext(Ctx);
}

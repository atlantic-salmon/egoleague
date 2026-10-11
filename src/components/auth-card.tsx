"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import type { Profile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loading } from "./states";

export function AuthCard({ title = "Enter Blue Lock" }: { title?: string }) {
  const { setUser } = useSession();
  const [mode, setMode] = useState<"login" | "register">("register");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ user: Profile }>(`/auth/${mode}`, { body: { username, password } });
      setUser(r.user);
      toast.success(mode === "register" ? "Welcome to Blue Lock. Your starter squad is ready." : `Welcome back, ${r.user.username}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-2xl backdrop-blur">
      <div>
        <h2 className="font-heading text-2xl uppercase italic text-white">{title}</h2>
        <p className="text-sm text-slate-400">Your account keeps your players, gear and gems safe on the server.</p>
      </div>
      <Tabs value={mode} onValueChange={(v) => setMode(v as "login" | "register")}>
        <TabsList className="w-full">
          <TabsTrigger value="register" className="flex-1">
            New player
          </TabsTrigger>
          <TabsTrigger value="login" className="flex-1">
            Log in
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="space-y-1.5">
        <Label htmlFor="username">Username</Label>
        <Input id="username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="isagi_yoichi" required minLength={3} maxLength={16} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete={mode === "register" ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          required
          minLength={8}
        />
      </div>
      {error && <p className="rounded-md bg-red-950/50 px-3 py-2 text-sm text-red-300">{error}</p>}
      <Button type="submit" className="w-full" size="lg" disabled={busy}>
        {busy ? "Please wait..." : mode === "register" ? "Create account and get starter pack" : "Log in"}
      </Button>
    </form>
  );
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useSession();
  if (loading) return <Loading />;
  if (!user)
    return (
      <div className="flex justify-center py-10">
        <AuthCard title="Log in to continue" />
      </div>
    );
  return <>{children}</>;
}

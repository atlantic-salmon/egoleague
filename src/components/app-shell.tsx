"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  BookOpen,
  Coins,
  Gem,
  Gamepad2,
  Sparkles,
  Users,
  Shirt,
  ScrollText,
  Store,
  ArrowLeftRight,
  Trophy,
  UserPlus,
  Menu,
  X,
  LogOut,
  Settings,
  Hexagon,
} from "lucide-react";
import { useSession } from "@/lib/session";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const NAV = [
  { href: "/story", label: "Isagi's Path", icon: BookOpen },
  { href: "/play", label: "Play", icon: Gamepad2 },
  { href: "/gacha", label: "Gacha", icon: Sparkles },
  { href: "/collection", label: "Collection", icon: Shirt },
  { href: "/teams", label: "Teams", icon: Users },
  { href: "/quests", label: "Quests", icon: ScrollText },
  { href: "/market", label: "Market", icon: Store },
  { href: "/trades", label: "Trades", icon: ArrowLeftRight },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/friends", label: "Friends", icon: UserPlus },
];

export function Currency({ icon: Icon, value, className, label }: { icon: typeof Coins; value: number; className?: string; label: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-2 py-0.5 text-xs font-semibold tabular-nums ring-1 ring-white/10", className)} title={label}>
      <Icon className="size-3.5" aria-hidden />
      <span className="sr-only">{label}</span>
      {value.toLocaleString()}
    </span>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, setUser } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const inMatch = /^\/(story\/[^/]+|play\/(local|lobby|ranked|ghost).*)$/.test(pathname);

  const logout = async () => {
    await api("/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
    router.push("/");
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-3 sm:px-4">
          <Link href="/" className="flex shrink-0 items-center gap-2" onClick={() => setOpen(false)}>
            <span className="grid size-8 place-items-center rounded-md bg-blue-600 font-heading text-lg italic text-white shadow-[0_0_20px_rgba(37,99,235,0.6)]">BL</span>
            <span className="hidden font-heading text-lg uppercase italic tracking-wide sm:inline">
              Egoist <span className="text-blue-400">Pitch</span>
            </span>
          </Link>
          {user && (
            <nav className="hidden flex-1 items-center gap-0.5 overflow-x-auto xl:flex" aria-label="Main">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className={cn(
                    "rounded-md px-2.5 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white",
                    pathname.startsWith(n.href) && "bg-blue-600/20 text-blue-300",
                  )}
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          )}
          <div className="ml-auto flex items-center gap-2">
            {user ? (
              <>
                <div className="hidden items-center gap-1.5 sm:flex">
                  <Currency icon={Coins} value={user.coins} className="text-amber-300" label="Coins" />
                  <Currency icon={Gem} value={user.gems} className="text-cyan-300" label="Gems" />
                  <Currency icon={Hexagon} value={user.shards} className="text-violet-300" label="Shards" />
                </div>
                <Link href="/settings" className="hidden items-center gap-1 rounded-md px-2 py-1 text-sm text-slate-300 hover:bg-white/5 md:flex">
                  <span className="font-semibold text-white">{user.username}</span>
                  <span className="rounded bg-blue-600/30 px-1.5 text-xs text-blue-200">Lv {user.level}</span>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden md:inline-flex"
                  render={<Link href="/settings" />}
                  nativeButton={false}
                  aria-label="Settings"
                  title="Settings and log out"
                >
                  <Settings />
                </Button>
                <Button variant="ghost" size="icon" className="xl:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu" aria-expanded={open}>
                  {open ? <X /> : <Menu />}
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => router.push("/")}>
                Log in
              </Button>
            )}
          </div>
        </div>
        {user && open && (
          <div className="border-t border-white/10 bg-slate-950 xl:hidden">
            <div className="mx-auto grid max-w-7xl grid-cols-2 gap-1 p-3 sm:grid-cols-4">
              <div className="col-span-full mb-1 flex flex-wrap items-center gap-1.5 sm:hidden">
                <Currency icon={Coins} value={user.coins} className="text-amber-300" label="Coins" />
                <Currency icon={Gem} value={user.gems} className="text-cyan-300" label="Gems" />
                <Currency icon={Hexagon} value={user.shards} className="text-violet-300" label="Shards" />
              </div>
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-200 hover:bg-white/5",
                    pathname.startsWith(n.href) && "bg-blue-600/20 text-blue-200",
                  )}
                >
                  <n.icon className="size-4" /> {n.label}
                </Link>
              ))}
              <Link href="/settings" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-200 hover:bg-white/5">
                <Settings className="size-4" /> Settings
              </Link>
              <button onClick={logout} className="flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/5">
                <LogOut className="size-4" /> Log out
              </button>
            </div>
          </div>
        )}
      </header>
      <main className={cn("mx-auto w-full flex-1 px-3 py-5 sm:px-4 sm:py-8", inMatch ? "max-w-[1400px]" : "max-w-7xl")}>{children}</main>
      <footer className="border-t border-white/5 py-4 text-center text-xs text-slate-500">
        Fan-made game inspired by Blue Lock. All progress is stored and verified on the server.
      </footer>
    </div>
  );
}

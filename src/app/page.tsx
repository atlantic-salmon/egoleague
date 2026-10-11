"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { BookOpen, Gamepad2, Sparkles, Users, Store, ScrollText, Trophy, Zap, Swords, Medal } from "lucide-react";
import { useSession } from "@/lib/session";
import { AuthCard } from "@/components/auth-card";
import { Loading } from "@/components/states";
import { Portrait } from "@/components/game/portrait";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useApi } from "@/lib/use-api";
import { STAGES, CHAPTERS } from "@/shared/story";

function Hero() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-950 via-slate-950 to-slate-950 p-6 sm:p-10">
      <div className="speedlines absolute inset-0 opacity-20" />
      <div className="relative grid items-center gap-6 lg:grid-cols-[1fr_auto]">
        <div>
          <motion.div initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="text-xs font-semibold uppercase tracking-[0.35em] text-blue-300">
            300 strikers. One survives.
          </motion.div>
          <motion.h1
            initial={{ x: -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mt-2 font-heading text-5xl uppercase italic leading-none text-white text-glow sm:text-7xl"
          >
            Blue Lock
            <br />
            <span className="text-blue-400">Egoist Pitch</span>
          </motion.h1>
          <p className="mt-4 max-w-xl text-slate-300">
            A top-down football game. Walk Isagi&apos;s path through the manga, pull rare egoists and gear, build your squad and beat the Blue Lock Man
            in goal. Play on one keyboard with a friend, or online against friends and bots.
          </p>
        </div>
        <div className="relative hidden h-64 w-64 lg:block">
          <Portrait id="blm" className="absolute -right-4 top-0 h-56 w-56 opacity-80" />
          <Portrait id="isagi" expr="ego" className="absolute bottom-0 left-0 h-56 w-56 drop-shadow-[0_0_30px_rgba(59,130,246,0.7)]" />
        </div>
      </div>
    </div>
  );
}

const tiles = [
  { href: "/story", label: "Isagi's Path", desc: "Story mode through the manga arcs, with cutscenes.", icon: BookOpen, color: "from-blue-600 to-indigo-700" },
  { href: "/league", label: "League", desc: "Climb escalating teams. Replay any unlocked side.", icon: Medal, color: "from-amber-500 to-orange-700" },
  { href: "/play", label: "Play", desc: "Local 2P, friendly lobbies, ranked and ghost matches.", icon: Gamepad2, color: "from-emerald-600 to-teal-700" },
  { href: "/gacha", label: "Gacha", desc: "8 rarities from Common to #1. Characters and gear.", icon: Sparkles, color: "from-fuchsia-600 to-purple-700" },
  { href: "/teams", label: "Teams", desc: "Build lineups from players you've unlocked.", icon: Users, color: "from-sky-600 to-blue-700" },
  { href: "/market", label: "Market", desc: "Buy and sell players and gear for gems.", icon: Store, color: "from-cyan-600 to-blue-700" },
  { href: "/quests", label: "Quests", desc: "Daily and lifetime goals for gems.", icon: ScrollText, color: "from-rose-600 to-red-700" },
];

function Hub() {
  const { user } = useSession();
  const { data } = useApi<{ stages: { id: string; stars: number; unlocked: boolean; cleared: boolean }[] }>("/story");
  const next = data?.stages.find((s) => s.unlocked && !s.cleared) ?? data?.stages.filter((s) => s.unlocked).at(-1);
  const stage = next ? STAGES.find((s) => s.id === next.id) : null;
  if (!user) return null;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="relative overflow-hidden rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-900/60 to-slate-950 p-5">
          <div className="speedlines absolute inset-0 opacity-10" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
            <Portrait id="isagi" expr="ego" className="h-28 w-28 shrink-0" />
            <div className="flex-1">
              <div className="text-xs uppercase tracking-[0.25em] text-blue-300">Continue Isagi&apos;s Path</div>
              {stage ? (
                <>
                  <div className="font-heading text-2xl uppercase italic text-white">
                    {stage.id} · {stage.title}
                  </div>
                  <div className="text-sm text-slate-300">
                    Chapter {stage.chapter}: {CHAPTERS[stage.chapter - 1].title}
                  </div>
                </>
              ) : (
                <div className="font-heading text-2xl uppercase italic text-white">Loading your path...</div>
              )}
            </div>
            <Button size="lg" render={<Link href={stage ? `/story/${stage.id}` : "/story"} />} nativeButton={false}>
              <Swords /> Play stage
            </Button>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
          <div className="flex items-baseline justify-between">
            <div className="font-heading text-xl uppercase italic text-white">{user.username}</div>
            <div className="text-sm text-blue-300">Level {user.level}</div>
          </div>
          <Progress value={(user.xp / Math.max(1, user.xpNext)) * 100} className="mt-2" />
          <div className="mt-1 text-xs text-slate-400">
            {user.xp} / {user.xpNext} XP
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-lg bg-slate-950/60 p-2">
              <div className="font-heading text-lg text-white">{user.rating}</div>
              <div className="text-slate-400">Rating</div>
            </div>
            <div className="rounded-lg bg-slate-950/60 p-2">
              <div className="font-heading text-lg text-white">{user.storyStars}</div>
              <div className="text-slate-400">Stars</div>
            </div>
            <div className="rounded-lg bg-slate-950/60 p-2">
              <div className="font-heading text-lg text-white">{user.goals}</div>
              <div className="text-slate-400">Goals</div>
            </div>
          </div>
          {user.earlyBoost && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              <Zap className="size-4" /> Rookie boost: rewards are multiplied until level 9.
            </div>
          )}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t, i) => (
          <motion.div key={t.href} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.04 }}>
            <Link
              href={t.href}
              className="group flex h-full items-start gap-3 rounded-2xl border border-white/10 bg-slate-900/70 p-4 transition hover:-translate-y-0.5 hover:border-blue-500/40"
            >
              <span className={`grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${t.color} text-white shadow-lg`}>
                <t.icon className="size-5" />
              </span>
              <span>
                <span className="block font-heading text-lg uppercase italic text-white">{t.label}</span>
                <span className="text-sm text-slate-400">{t.desc}</span>
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
      <div className="flex justify-center">
        <Link href="/leaderboard" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
          <Trophy className="size-4" /> See who&apos;s #1 on the leaderboard
        </Link>
      </div>
    </div>
  );
}

export default function Home() {
  const { user, loading } = useSession();
  if (loading) return <Loading />;
  if (user) return <Hub />;
  return (
    <div className="space-y-8">
      <Hero />
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_auto]">
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ["Isagi's Path", "Eight stages from the First Selection to the Neo Egoist League, with animated cutscenes."],
            ["Gacha with permanent rolls", "Every pull rolls Talent and Quality from 0 to 100. They can never be changed."],
            ["Two players, one laptop", "WASD vs arrow keys. No account needed for local play."],
            ["Online lobbies", "Mix friends and bots on either side, or queue for ranked 3v3."],
            ["Market and trades", "Sell players for gems or swap directly with friends."],
            ["Cheat-proof", "The server owns your items and replays every match to verify results."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
              <div className="font-heading uppercase italic text-white">{t}</div>
              <div className="text-sm text-slate-400">{d}</div>
            </div>
          ))}
          <Button size="lg" variant="secondary" className="sm:col-span-2" render={<Link href="/play/local" />} nativeButton={false}>
            <Gamepad2 /> Play local 2P as a guest
          </Button>
        </div>
        <AuthCard />
      </div>
    </div>
  );
}

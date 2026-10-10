"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Ghost, Keyboard, Trophy, Users, BookOpen } from "lucide-react";
import { PageHeader } from "@/components/states";
import { useSession } from "@/lib/session";

const MODES = [
  {
    href: "/play/local",
    title: "Local 2 players",
    desc: "Two players on one laptop. WASD vs arrow keys, head to head or co-op against bots. No account needed.",
    icon: Keyboard,
    color: "from-cyan-600 to-blue-700",
    auth: false,
  },
  {
    href: "/play/lobby",
    title: "Friendly lobby",
    desc: "Play online from different laptops. Any mix of friends and bots on either side, up to 5v5.",
    icon: Users,
    color: "from-emerald-600 to-teal-700",
    auth: true,
  },
  {
    href: "/play/ranked",
    title: "Ranked",
    desc: "Queue for a 3v3 against another player's lineup. Win to climb the rating leaderboard.",
    icon: Trophy,
    color: "from-amber-500 to-orange-700",
    auth: true,
  },
  {
    href: "/play/ghost",
    title: "Ghost match",
    desc: "Challenge a friend's saved team any time, even when they're offline.",
    icon: Ghost,
    color: "from-violet-600 to-fuchsia-700",
    auth: true,
  },
  {
    href: "/story",
    title: "Isagi's Path",
    desc: "Story mode through the manga, from the First Selection to the Neo Egoist League.",
    icon: BookOpen,
    color: "from-blue-600 to-indigo-700",
    auth: true,
  },
];

export default function PlayHub() {
  const { user } = useSession();
  return (
    <div>
      <PageHeader title="Play" kicker="Choose a mode" />
      <div className="grid gap-3 sm:grid-cols-2">
        {MODES.map((m, i) => (
          <motion.div key={m.href} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Link
              href={m.href}
              className="group relative flex h-full items-start gap-4 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 p-5 transition hover:-translate-y-0.5 hover:border-blue-500/40"
            >
              <span className={`grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${m.color} text-white shadow-lg transition group-hover:scale-105`}>
                <m.icon className="size-7" />
              </span>
              <span>
                <span className="block font-heading text-2xl uppercase italic text-white">{m.title}</span>
                <span className="text-sm text-slate-400">{m.desc}</span>
                {m.auth && !user && <span className="mt-1 block text-xs text-amber-300">Requires an account</span>}
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

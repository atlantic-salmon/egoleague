"use client";

import { AnimatePresence, motion } from "motion/react";
import { SKILLS, type AbilityFx } from "@/shared/catalog";
import { Portrait } from "./portrait";

export interface AbilityCue {
  id: number;
  charId: string;
  skillId: string;
  name: string;
  teamColor: string;
}

function FxLayer({ fx }: { fx: AbilityFx[] }) {
  return (
    <>
      {fx.includes("speedlines") && <div className="speedlines pointer-events-none absolute inset-0 opacity-50" />}
      {fx.includes("metavision") && (
        <motion.div
          className="pointer-events-none absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.85, 0.35] }}
          transition={{ duration: 1.4 }}
          style={{
            background:
              "repeating-linear-gradient(0deg, rgba(34,211,238,0.14) 0 1px, transparent 1px 34px), repeating-linear-gradient(90deg, rgba(34,211,238,0.14) 0 1px, transparent 1px 34px), radial-gradient(circle at 50% 50%, rgba(34,211,238,0.3), transparent 55%)",
          }}
        />
      )}
      {fx.includes("chains") && (
        <motion.div
          className="pointer-events-none absolute inset-0"
          initial={{ opacity: 0, scale: 1.15 }}
          animate={{ opacity: 0.55, scale: 1 }}
          style={{
            background:
              "repeating-linear-gradient(35deg, transparent 0 40px, rgba(148,163,184,0.28) 40px 46px), repeating-linear-gradient(-35deg, transparent 0 40px, rgba(148,163,184,0.28) 40px 46px)",
          }}
        />
      )}
      {fx.includes("flash") && (
        <motion.div className="pointer-events-none absolute inset-0 bg-white" initial={{ opacity: 0.85 }} animate={{ opacity: 0 }} transition={{ duration: 0.55 }} />
      )}
      {fx.includes("impact") && (
        <motion.div
          className="pointer-events-none absolute inset-0"
          initial={{ opacity: 0.95, scale: 0.35 }}
          animate={{ opacity: 0, scale: 2 }}
          transition={{ duration: 0.7 }}
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(34,211,238,0.55) 18%, transparent 50%)" }}
        />
      )}
      {fx.includes("glitch") && (
        <motion.div
          className="pointer-events-none absolute inset-0 mix-blend-screen"
          animate={{ x: [0, -8, 5, -3, 0], opacity: [0.55, 0.2, 0.5, 0.1, 0] }}
          transition={{ duration: 0.65 }}
          style={{ background: "repeating-linear-gradient(0deg, rgba(34,211,238,0.28) 0 2px, transparent 2px 6px)" }}
        />
      )}
    </>
  );
}

/** Full-width ability banner: enters from the left edge, spans the screen, then exits right. */
export function AbilityOverlay({ cue }: { cue: AbilityCue | null }) {
  const skill = cue ? SKILLS[cue.skillId] ?? SKILLS.none : null;

  return (
    <AnimatePresence>
      {cue && skill && (
        <motion.div
          key={cue.id}
          className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
        >
          <div className="absolute inset-0 bg-slate-950/40" />
          <FxLayer fx={skill.ability.fx} />

          {/* Full-bleed ribbon that covers left → right */}
          <motion.div
            className="absolute top-[28%] left-0 w-full sm:top-[30%]"
            initial={{ x: "-105%" }}
            animate={{ x: ["-105%", "0%", "0%", "105%"] }}
            transition={{ duration: 2.8, times: [0, 0.18, 0.72, 1], ease: ["easeOut", "linear", "easeIn"] }}
          >
            <div
              className="relative flex w-full items-stretch gap-3 border-y-2 border-white/25 py-2 pl-3 pr-4 shadow-[0_12px_50px_rgba(0,0,0,0.55)] sm:gap-5 sm:py-3 sm:pl-6 sm:pr-8"
              style={{
                background: `linear-gradient(90deg, ${cue.teamColor}f2 0%, ${cue.teamColor}cc 38%, #020617ee 78%, #020617aa 100%)`,
              }}
            >
              <div className="pointer-events-none absolute inset-y-0 left-0 w-2" style={{ background: cue.teamColor }} />
              <div className="speedlines pointer-events-none absolute inset-0 opacity-20" />
              <Portrait
                id={cue.charId}
                expr="ego"
                className="relative z-10 h-28 w-28 shrink-0 drop-shadow-[0_0_40px_rgba(34,211,238,0.55)] sm:h-40 sm:w-40"
              />
              <div className="relative z-10 flex min-w-0 flex-1 flex-col justify-center py-1">
                <div className="inline-flex w-fit -skew-x-12 bg-slate-950/75 px-3 py-0.5 font-heading text-xs uppercase tracking-[0.28em] text-white sm:text-sm">
                  {cue.name}
                </div>
                <div
                  className="mt-1 font-heading text-3xl uppercase italic leading-none text-white text-glow sm:text-5xl md:text-6xl"
                  style={{ WebkitTextStroke: `2px ${cue.teamColor}` }}
                >
                  {skill.ability.title}
                </div>
                <p className="mt-1.5 max-w-3xl truncate text-sm text-slate-100 sm:text-lg">“{skill.ability.line}”</p>
                <div className="mt-0.5 text-[10px] uppercase tracking-[0.35em] text-cyan-300 sm:text-xs">{skill.name}</div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

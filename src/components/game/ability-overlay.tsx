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

/** Ability banner: slides in from the left, holds, then exits off the right. */
export function AbilityOverlay({ cue }: { cue: AbilityCue | null }) {
  const skill = cue ? SKILLS[cue.skillId] ?? SKILLS.none : null;
  return (
    <AnimatePresence>
      {cue && skill && (
        <motion.div
          key={cue.id}
          className="pointer-events-none absolute inset-0 z-20 flex items-center overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <div className="absolute inset-0 bg-slate-950/45" />
          <FxLayer fx={skill.ability.fx} />
          <motion.div
            className="relative flex w-[min(100%,52rem)] items-end gap-3 px-3 sm:gap-5 sm:px-6"
            initial={{ x: "-110%", opacity: 0.85 }}
            animate={{ x: ["-110%", "0%", "0%", "120%"], opacity: [0.85, 1, 1, 0.9] }}
            transition={{ duration: 2.4, times: [0, 0.22, 0.72, 1], ease: ["easeOut", "linear", "easeIn"] }}
          >
            <div
              className="absolute inset-y-2 left-0 right-8 -skew-x-6 rounded-lg border border-white/15 shadow-2xl sm:inset-y-4"
              style={{ background: `linear-gradient(90deg, ${cue.teamColor}ee, ${cue.teamColor}99 45%, transparent)` }}
            />
            <Portrait id={cue.charId} expr="ego" className="relative z-10 h-36 w-36 shrink-0 drop-shadow-[0_0_40px_rgba(34,211,238,0.55)] sm:h-48 sm:w-48" />
            <div className="relative z-10 min-w-0 flex-1 pb-3 sm:pb-5">
              <div className="inline-block -skew-x-12 bg-slate-950/70 px-3 py-1 font-heading text-sm uppercase tracking-[0.25em] text-white sm:text-base">
                {cue.name}
              </div>
              <div
                className="mt-1 font-heading text-4xl uppercase italic leading-none text-white text-glow sm:text-6xl"
                style={{ WebkitTextStroke: `2px ${cue.teamColor}` }}
              >
                {skill.ability.title}
              </div>
              <p className="mt-2 max-w-xl text-sm text-slate-100 sm:text-lg">“{skill.ability.line}”</p>
              <div className="mt-1 text-xs uppercase tracking-widest text-cyan-300">{skill.name}</div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

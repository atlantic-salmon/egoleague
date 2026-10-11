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

/** Full-screen cutscene flash when a player activates their skill ability. */
export function AbilityOverlay({ cue }: { cue: AbilityCue | null }) {
  const skill = cue ? SKILLS[cue.skillId] ?? SKILLS.none : null;
  return (
    <AnimatePresence>
      {cue && skill && (
        <motion.div
          key={cue.id}
          className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="absolute inset-0 bg-slate-950/55" />
          <FxLayer fx={skill.ability.fx} />
          <motion.div
            className="relative flex w-full max-w-3xl items-end gap-4 px-4 sm:gap-6"
            initial={{ scale: skill.ability.fx.includes("zoom") ? 1.35 : 1.1, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 18 }}
          >
            <Portrait id={cue.charId} expr="ego" className="h-40 w-40 shrink-0 drop-shadow-[0_0_40px_rgba(34,211,238,0.55)] sm:h-56 sm:w-56" />
            <div className="min-w-0 flex-1 pb-4">
              <motion.div
                className="inline-block -skew-x-12 px-3 py-1 font-heading text-sm uppercase tracking-[0.25em] text-white sm:text-base"
                style={{ background: cue.teamColor }}
                initial={{ x: -40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
              >
                {cue.name}
              </motion.div>
              <motion.div
                className="mt-1 font-heading text-5xl uppercase italic leading-none text-white text-glow sm:text-7xl"
                style={{ WebkitTextStroke: `2px ${cue.teamColor}` }}
                initial={{ letterSpacing: "0.4em", opacity: 0 }}
                animate={{ letterSpacing: "0.04em", opacity: 1 }}
                transition={{ delay: 0.08, duration: 0.45 }}
              >
                {skill.ability.title}
              </motion.div>
              <motion.p
                className="mt-2 max-w-xl text-base text-slate-100 sm:text-xl"
                initial={{ y: 16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.18 }}
              >
                “{skill.ability.line}”
              </motion.p>
              <div className="mt-1 text-xs uppercase tracking-widest text-cyan-300">{skill.name}</div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

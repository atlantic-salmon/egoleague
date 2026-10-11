"use client";

import { useMemo } from "react";
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

type Lane = "left" | "right" | "top" | "bottom";

function pickLane(seed: number): Lane {
  const lanes: Lane[] = ["left", "right", "top", "bottom"];
  return lanes[Math.abs(seed) % lanes.length];
}

function motionFor(lane: Lane) {
  // Land somewhere on screen, hold, then fly off the opposite side.
  switch (lane) {
    case "left":
      return {
        initial: { x: "-120%", y: "18%", opacity: 0.7 },
        animate: { x: ["-120%", "8%", "8%", "130%"], y: ["18%", "18%", "22%", "10%"], opacity: [0.7, 1, 1, 0.85] },
      };
    case "right":
      return {
        initial: { x: "120%", y: "28%", opacity: 0.7 },
        animate: { x: ["120%", "12%", "12%", "-130%"], y: ["28%", "24%", "30%", "40%"], opacity: [0.7, 1, 1, 0.85] },
      };
    case "top":
      return {
        initial: { x: "10%", y: "-120%", opacity: 0.7 },
        animate: { x: ["10%", "14%", "18%", "40%"], y: ["-120%", "16%", "16%", "140%"], opacity: [0.7, 1, 1, 0.85] },
      };
    case "bottom":
      return {
        initial: { x: "20%", y: "140%", opacity: 0.7 },
        animate: { x: ["20%", "10%", "6%", "-40%"], y: ["140%", "30%", "30%", "-120%"], opacity: [0.7, 1, 1, 0.85] },
      };
  }
}

/** Ability banner: lands at a random screen edge/lane, holds, then exits off-screen. */
export function AbilityOverlay({ cue }: { cue: AbilityCue | null }) {
  const skill = cue ? SKILLS[cue.skillId] ?? SKILLS.none : null;
  const lane = useMemo(() => (cue ? pickLane(cue.id * 17 + cue.charId.length * 3) : "left"), [cue]);
  const path = useMemo(() => motionFor(lane), [lane]);

  // Vary vertical/horizontal offset per cue so it doesn't always hit the same spot.
  const offsetStyle = useMemo(() => {
    if (!cue) return undefined;
    const n = Math.abs((cue.id * 2654435761) % 1000) / 1000;
    if (lane === "left" || lane === "right") return { top: `${10 + n * 45}%` };
    return { left: `${4 + n * 40}%` };
  }, [cue, lane]);

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
          <div className="absolute inset-0 bg-slate-950/35" />
          <FxLayer fx={skill.ability.fx} />
          <motion.div
            className="absolute flex w-[min(92%,36rem)] items-end gap-3 sm:w-[min(88%,48rem)] sm:gap-5"
            style={offsetStyle}
            initial={path.initial}
            animate={path.animate}
            transition={{ duration: 2.5, times: [0, 0.2, 0.7, 1], ease: ["easeOut", "linear", "easeIn"] }}
          >
            <div
              className="absolute inset-y-1 left-0 right-6 -skew-x-6 rounded-lg border border-white/15 shadow-2xl sm:inset-y-2"
              style={{ background: `linear-gradient(90deg, ${cue.teamColor}ee, ${cue.teamColor}99 45%, transparent)` }}
            />
            <Portrait id={cue.charId} expr="ego" className="relative z-10 h-32 w-32 shrink-0 drop-shadow-[0_0_40px_rgba(34,211,238,0.55)] sm:h-44 sm:w-44" />
            <div className="relative z-10 min-w-0 flex-1 pb-2 sm:pb-4">
              <div className="inline-block -skew-x-12 bg-slate-950/70 px-3 py-1 font-heading text-sm uppercase tracking-[0.25em] text-white sm:text-base">
                {cue.name}
              </div>
              <div
                className="mt-1 font-heading text-3xl uppercase italic leading-none text-white text-glow sm:text-5xl"
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

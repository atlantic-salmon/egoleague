"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronRight, FastForward } from "lucide-react";
import { CUTSCENES, type Backdrop, type CutsceneFrame } from "@/shared/cutscenes";
import { Portrait } from "./portrait";
import { Button } from "@/components/ui/button";
import { uiBlip } from "@/game/sfx";
import { cn } from "@/lib/utils";

const BACKDROPS: Record<Backdrop, string> = {
  void: "radial-gradient(ellipse at center, #0b1530 0%, #02040a 70%)",
  facility: "linear-gradient(180deg, #0a1a3d 0%, #0b2a5e 45%, #06102a 100%)",
  pitch: "linear-gradient(180deg, #052e1c 0%, #0b5132 50%, #04261a 100%)",
  stadium: "radial-gradient(ellipse at 50% 0%, #1e3a8a 0%, #0b1530 50%, #020617 100%)",
  crimson: "radial-gradient(ellipse at center, #7f1d1d 0%, #1c0507 75%)",
  monitor: "linear-gradient(180deg, #001b2e 0%, #003049 50%, #001b2e 100%)",
  night: "linear-gradient(180deg, #020617 0%, #0f172a 60%, #1e1b4b 100%)",
};

const POS: Record<"left" | "right" | "center", string> = {
  left: "left-[2%] sm:left-[6%]",
  right: "right-[2%] sm:right-[6%]",
  center: "left-1/2 -translate-x-1/2",
};

function useTypewriter(text: string, speed = 26) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setN(text.length);
      return;
    }
    const id = setInterval(() => setN((v) => (v >= text.length ? v : v + 1)), speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return { shown: text.slice(0, n), done: n >= text.length, finish: () => setN(text.length) };
}

function Fx({ frame }: { frame: CutsceneFrame }) {
  const fx = frame.fx ?? [];
  return (
    <>
      {fx.includes("speedlines") && <div className="speedlines pointer-events-none absolute inset-0 opacity-40" />}
      {fx.includes("metavision") && (
        <motion.div
          className="pointer-events-none absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.8, 0.4] }}
          transition={{ duration: 1.2 }}
          style={{
            background:
              "repeating-linear-gradient(0deg, rgba(34,211,238,0.12) 0 1px, transparent 1px 36px), repeating-linear-gradient(90deg, rgba(34,211,238,0.12) 0 1px, transparent 1px 36px), radial-gradient(circle at 50% 50%, rgba(34,211,238,0.25), transparent 60%)",
          }}
        />
      )}
      {fx.includes("chains") && (
        <motion.div
          className="pointer-events-none absolute inset-0"
          initial={{ opacity: 0, scale: 1.2 }}
          animate={{ opacity: 0.6, scale: 1 }}
          style={{
            background:
              "repeating-linear-gradient(35deg, transparent 0 40px, rgba(148,163,184,0.25) 40px 46px), repeating-linear-gradient(-35deg, transparent 0 40px, rgba(148,163,184,0.25) 40px 46px)",
          }}
        />
      )}
      {fx.includes("flash") && (
        <motion.div className="pointer-events-none absolute inset-0 bg-white" initial={{ opacity: 0.9 }} animate={{ opacity: 0 }} transition={{ duration: 0.5 }} />
      )}
      {fx.includes("impact") && (
        <motion.div
          className="pointer-events-none absolute inset-0"
          initial={{ opacity: 0.9, scale: 0.4 }}
          animate={{ opacity: 0, scale: 1.8 }}
          transition={{ duration: 0.7 }}
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(59,130,246,0.6) 20%, transparent 50%)" }}
        />
      )}
      {fx.includes("glitch") && (
        <motion.div
          className="pointer-events-none absolute inset-0 mix-blend-screen"
          animate={{ x: [0, -6, 4, -2, 0], opacity: [0.5, 0.2, 0.5, 0.1, 0] }}
          transition={{ duration: 0.6 }}
          style={{ background: "repeating-linear-gradient(0deg, rgba(34,211,238,0.25) 0 2px, transparent 2px 6px)" }}
        />
      )}
    </>
  );
}

/** Data-driven visual-novel style cutscene. Click, Space or Enter advances; Esc skips. */
export function Cutscene({ id, onDone }: { id: string; onDone: () => void }) {
  const frames = CUTSCENES[id] ?? [];
  const [i, setI] = useState(0);
  const frame = frames[i];
  const { shown, done, finish } = useTypewriter(frame?.text ?? "");
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  const next = useCallback(() => {
    if (!done) return finish();
    uiBlip("tick");
    if (i + 1 >= frames.length) doneRef.current();
    else setI(i + 1);
  }, [done, finish, i, frames.length]);

  useEffect(() => {
    if (!frames.length) doneRef.current();
  }, [frames.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        next();
      } else if (e.key === "Escape") doneRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next]);

  if (!frame) return null;
  const shake = frame.fx?.includes("shake");
  const zoom = frame.fx?.includes("zoom");
  const speakerPos = frame.portraits?.find((p) => p.id === frame.speaker)?.pos;

  return (
    <div className="fixed inset-0 z-50 flex select-none flex-col bg-black" onClick={next} role="dialog" aria-label="Cutscene">
      <motion.div
        key={i}
        className="relative flex-1 overflow-hidden"
        style={{ background: BACKDROPS[frame.bg] }}
        initial={{ opacity: 0.4 }}
        animate={shake ? { opacity: 1, x: [0, -10, 9, -6, 4, 0], y: [0, 6, -5, 3, 0] } : { opacity: 1 }}
        transition={{ duration: 0.45 }}
      >
        <div className="bl-grid absolute inset-0 opacity-20" />
        {frame.bg === "monitor" && <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(0,0,0,0.25)_0_2px,transparent_2px_4px)]" />}
        <Fx frame={frame} />

        <AnimatePresence>
          {frame.title && (
            <motion.div
              key={`t${i}`}
              className="absolute inset-x-0 top-[18%] text-center"
              initial={{ opacity: 0, scale: 1.6, letterSpacing: "0.6em" }}
              animate={{ opacity: 1, scale: 1, letterSpacing: "0.15em" }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <div className="font-heading text-6xl uppercase italic text-white text-glow sm:text-8xl">{frame.title}</div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div className="absolute inset-0" animate={{ scale: zoom ? 1.12 : 1 }} transition={{ duration: 2.4, ease: "easeOut" }}>
          {frame.portraits?.map((p) => {
            const speaking = p.id === frame.speaker;
            return (
              <motion.div
                key={`${p.id}-${p.pos}`}
                className={cn("absolute bottom-0 h-[62%] max-h-[520px] w-[46%] max-w-[420px] sm:w-[34%]", POS[p.pos])}
                initial={{ opacity: 0, x: p.pos === "left" ? -60 : p.pos === "right" ? 60 : 0, y: p.pos === "center" ? 40 : 0 }}
                animate={{ opacity: speaking || !frame.speaker ? 1 : 0.45, x: 0, y: 0, scale: speaking ? 1.03 : 0.96 }}
                transition={{ type: "spring", stiffness: 160, damping: 20 }}
              >
                {p.expr === "ego" && speaking && (
                  <div className="absolute inset-0 rounded-full bg-cyan-400/20 blur-3xl" />
                )}
                <Portrait id={p.id} expr={p.expr} flip={p.pos === "right"} className="relative h-full w-full drop-shadow-[0_0_30px_rgba(37,99,235,0.45)]" />
              </motion.div>
            );
          })}
        </motion.div>
      </motion.div>

      <div className="relative border-t-2 border-blue-500/60 bg-slate-950/95 px-4 pb-6 pt-4 sm:px-10">
        {frame.name && (
          <motion.div
            key={`n${i}`}
            initial={{ opacity: 0, x: speakerPos === "right" ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={cn(
              "absolute -top-5 inline-block -skew-x-12 bg-blue-600 px-4 py-1 font-heading text-lg uppercase tracking-wide text-white",
              speakerPos === "right" ? "right-6 sm:right-12" : "left-6 sm:left-12",
            )}
          >
            {frame.name}
          </motion.div>
        )}
        <p className={cn("mx-auto min-h-[4.5rem] max-w-4xl text-lg leading-relaxed text-slate-100 sm:text-xl", !frame.name && "text-center italic text-slate-300")}>
          {shown}
          {!done && <span className="ml-0.5 inline-block h-5 w-2 animate-pulse bg-blue-400 align-middle" />}
        </p>
        <div className="mx-auto mt-2 flex max-w-4xl items-center justify-between text-xs text-slate-500">
          <span>
            {i + 1} / {frames.length}
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                doneRef.current();
              }}
            >
              <FastForward /> Skip
            </Button>
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
            >
              {done && i + 1 >= frames.length ? "Continue" : "Next"} <ChevronRight />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

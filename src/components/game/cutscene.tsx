"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronRight, FastForward } from "lucide-react";
import { CUTSCENES, type Backdrop, type CutsceneFrame } from "@/shared/cutscenes";
import { Portrait } from "./portrait";
import { Button } from "@/components/ui/button";
import { uiBlip } from "@/game/sfx";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/lib/prefs";

const BACKDROPS: Record<Backdrop, string> = {
  void: "radial-gradient(ellipse at 50% 40%, #12244a 0%, #060b18 45%, #010205 100%)",
  facility:
    "linear-gradient(180deg, #071428 0%, #0c2460 28%, #123a7a 52%, #0a1f4a 78%, #040a1a 100%)",
  pitch:
    "linear-gradient(180deg, #0a3d28 0%, #0f6b3e 22%, #12804a 48%, #0b5a35 72%, #052418 100%)",
  stadium:
    "radial-gradient(ellipse at 50% -10%, #3b82f6 0%, #1e3a8a 28%, #0f172a 62%, #020617 100%)",
  crimson: "radial-gradient(ellipse at 50% 30%, #b91c1c 0%, #7f1d1d 35%, #450a0a 70%, #140202 100%)",
  monitor: "linear-gradient(180deg, #00263d 0%, #00506e 40%, #00384f 70%, #001420 100%)",
  night: "linear-gradient(180deg, #020617 0%, #0f172a 40%, #1e1b4b 75%, #312e81 100%)",
};

/** Extra layered scenery so cutscenes feel like places, not flat color washes. */
function BackdropArt({ bg }: { bg: Backdrop }) {
  if (bg === "facility") {
    return (
      <>
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "repeating-linear-gradient(90deg, transparent 0 72px, rgba(56,189,248,0.07) 72px 74px), repeating-linear-gradient(0deg, transparent 0 56px, rgba(59,130,246,0.06) 56px 58px)",
          }}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[18%] bg-gradient-to-b from-cyan-400/15 to-transparent" />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-[28%] bg-gradient-to-t from-slate-950/80 via-slate-900/30 to-transparent" />
        <div className="pointer-events-none absolute left-[8%] top-[22%] h-24 w-40 rounded-sm border border-cyan-400/20 bg-cyan-400/5 blur-[1px] sm:h-32 sm:w-56" />
        <div className="pointer-events-none absolute right-[10%] top-[30%] h-20 w-28 rounded-sm border border-blue-300/15 bg-blue-400/5 sm:h-28 sm:w-40" />
        <div
          className="pointer-events-none absolute inset-x-[12%] top-[12%] h-px opacity-50"
          style={{ background: "linear-gradient(90deg, transparent, rgba(34,211,238,0.55), transparent)" }}
        />
      </>
    );
  }
  if (bg === "pitch") {
    return (
      <>
        <div
          className="pointer-events-none absolute inset-0 opacity-35"
          style={{
            background:
              "repeating-linear-gradient(90deg, rgba(255,255,255,0.04) 0 48px, rgba(0,0,0,0.08) 48px 96px)",
          }}
        />
        <div className="pointer-events-none absolute left-1/2 top-[18%] h-[55%] w-[72%] -translate-x-1/2 rounded-[40%] border-2 border-white/15" />
        <div className="pointer-events-none absolute left-1/2 top-[38%] size-24 -translate-x-1/2 rounded-full border border-white/20 sm:size-32" />
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-white/20" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[22%] bg-gradient-to-t from-black/50 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[16%] bg-gradient-to-b from-emerald-200/10 to-transparent" />
      </>
    );
  }
  if (bg === "stadium") {
    return (
      <>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[38%] bg-gradient-to-b from-blue-300/20 via-blue-600/10 to-transparent" />
        <div
          className="pointer-events-none absolute inset-x-0 top-[8%] h-[26%] opacity-50"
          style={{
            background:
              "repeating-linear-gradient(90deg, rgba(255,255,255,0.08) 0 10px, transparent 10px 22px)",
            maskImage: "linear-gradient(180deg, black, transparent)",
          }}
        />
        <div className="pointer-events-none absolute inset-x-[6%] bottom-[18%] h-[42%] rounded-t-[50%] border border-white/10 bg-emerald-900/25" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[30%] bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
        <div className="pointer-events-none absolute left-[15%] top-[20%] size-2 rounded-full bg-amber-200/80 blur-[1px]" />
        <div className="pointer-events-none absolute right-[22%] top-[16%] size-1.5 rounded-full bg-white/70" />
        <div className="pointer-events-none absolute left-[40%] top-[12%] size-1 rounded-full bg-cyan-200/80" />
      </>
    );
  }
  if (bg === "crimson") {
    return (
      <>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_60%,rgba(248,113,113,0.25),transparent_55%)]" />
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background:
              "repeating-conic-gradient(from 0deg at 50% 50%, transparent 0 12deg, rgba(127,29,29,0.35) 12deg 14deg)",
          }}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[35%] bg-gradient-to-t from-black/70 to-transparent" />
        <div className="pointer-events-none absolute left-1/2 top-[20%] h-40 w-40 -translate-x-1/2 rounded-full bg-red-500/20 blur-3xl sm:h-56 sm:w-56" />
      </>
    );
  }
  if (bg === "monitor") {
    return (
      <>
        <div className="pointer-events-none absolute inset-[6%] rounded-lg border border-cyan-400/25 bg-cyan-950/20 shadow-[inset_0_0_60px_rgba(34,211,238,0.12)]" />
        <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(0,0,0,0.28)_0_2px,transparent_2px_4px)] opacity-70" />
        <div className="pointer-events-none absolute inset-x-[10%] top-[14%] h-px bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent" />
        <div className="pointer-events-none absolute left-[12%] top-[18%] font-mono text-[10px] uppercase tracking-[0.35em] text-cyan-300/50">
          Blue Lock // Feed
        </div>
        <div className="pointer-events-none absolute bottom-[16%] right-[12%] size-16 rounded-full border border-cyan-400/20 sm:size-24" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,20,40,0.55)_100%)]" />
      </>
    );
  }
  if (bg === "night") {
    return (
      <>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(129,140,248,0.25),transparent_40%)]" />
        <div className="pointer-events-none absolute left-[18%] top-[16%] size-1 rounded-full bg-white/80" />
        <div className="pointer-events-none absolute left-[55%] top-[22%] size-0.5 rounded-full bg-white/70" />
        <div className="pointer-events-none absolute right-[20%] top-[14%] size-1.5 rounded-full bg-indigo-100/80" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-t from-indigo-950/80 via-slate-950/40 to-transparent" />
      </>
    );
  }
  // void
  return (
    <>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(59,130,246,0.22),transparent_55%)]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          background:
            "repeating-linear-gradient(115deg, transparent 0 40px, rgba(56,189,248,0.06) 40px 41px)",
        }}
      />
    </>
  );
}

const POS: Record<"left" | "right" | "center", string> = {
  left: "left-[2%] sm:left-[6%]",
  right: "right-[2%] sm:right-[6%]",
  center: "left-1/2 -translate-x-1/2",
};

function useTypewriter(text: string, speed = 26) {
  const [st, setSt] = useState({ text, n: 0 });
  const reduce = useMediaQuery("(prefers-reduced-motion: reduce)");
  const n = reduce ? text.length : st.text === text ? st.n : 0;
  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setSt((p) => (p.text !== text ? { text, n: 1 } : p.n >= text.length ? p : { text, n: p.n + 1 })), speed);
    return () => clearInterval(id);
  }, [text, speed, reduce]);
  return { shown: text.slice(0, n), done: n >= text.length, finish: () => setSt({ text, n: text.length }) };
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
  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  const next = () => {
    if (!done) return finish();
    uiBlip("tick");
    if (i + 1 >= frames.length) doneRef.current();
    else setI(i + 1);
  };
  const nextRef = useRef(next);
  useEffect(() => {
    nextRef.current = next;
  });

  useEffect(() => {
    if (!frames.length) doneRef.current();
  }, [frames.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        nextRef.current();
      } else if (e.key === "Escape") doneRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
        <BackdropArt bg={frame.bg} />
        <div className="bl-grid absolute inset-0 opacity-15" />
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

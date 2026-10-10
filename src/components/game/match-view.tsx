"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Maximize2, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { createMatch, DT, step, stateFromSnapshot, TICK_RATE, type Snapshot } from "@/game/engine";
import { applyEvents, createFx, render, HUMAN_COLORS } from "@/game/render";
import { KeyboardInput, CONTROL_HELP, type Scheme } from "@/game/input";
import { playEvents } from "@/game/sfx";
import { usePref } from "@/lib/prefs";
import type { MatchConfig, MatchEvent, MatchState } from "@/game/types";
import { TouchControls } from "./touch-controls";
import { Button } from "@/components/ui/button";

interface Banner {
  id: number;
  kind: "goal" | "save" | "kickoff" | "end" | "tackle";
  text: string;
  sub?: string;
  color: string;
}

function useSettings() {
  const [shake] = usePref("bl_shake");
  const [sound, setSound] = usePref("bl_sound");
  return { shake, sound, toggleSound: () => setSound(!sound) };
}

function fmtClock(clockTicks: number, durationSec: number) {
  const left = Math.max(0, durationSec - Math.floor(clockTicks / TICK_RATE));
  return `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
}

function Hud({
  cfg,
  score,
  clock,
  banners,
  paused,
  countdown,
}: {
  cfg: MatchConfig;
  score: [number, number];
  clock: number;
  banners: Banner[];
  paused: boolean;
  countdown: number;
}) {
  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center px-2">
        <div className="flex items-stretch overflow-hidden rounded-xl border border-white/10 bg-slate-950/80 text-sm shadow-xl backdrop-blur sm:text-base">
          <div className="flex items-center gap-2 px-3 py-1.5" style={{ borderBottom: `3px solid ${cfg.teams[0].color}` }}>
            <span className="max-w-[9rem] truncate font-semibold text-slate-200">{cfg.teams[0].name}</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-900 px-3 font-heading text-2xl tabular-nums tracking-wider text-white">
            <span>{score[0]}</span>
            <span className="text-slate-500">-</span>
            <span>{score[1]}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5" style={{ borderBottom: `3px solid ${cfg.teams[1].color}` }}>
            <span className="max-w-[9rem] truncate font-semibold text-slate-200">{cfg.teams[1].name}</span>
          </div>
          <div className="flex items-center bg-blue-600 px-3 font-mono font-bold tabular-nums text-white">{fmtClock(clock, cfg.durationSec)}</div>
        </div>
      </div>
      <AnimatePresence>
        {banners.map((b) =>
          b.kind === "goal" ? (
            <motion.div
              key={b.id}
              className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="speedlines absolute inset-0 opacity-60" />
              <motion.div
                className="relative font-heading text-7xl italic tracking-tight text-white drop-shadow-[0_6px_0_rgba(0,0,0,0.6)] sm:text-9xl"
                style={{ WebkitTextStroke: `3px ${b.color}` }}
                initial={{ scale: 3, rotate: -8, opacity: 0 }}
                animate={{ scale: 1, rotate: -4, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 14 }}
              >
                {b.text}
              </motion.div>
              {b.sub && (
                <motion.div
                  className="relative mt-2 rounded bg-slate-950/80 px-4 py-1 font-heading text-xl uppercase tracking-widest text-white sm:text-2xl"
                  initial={{ x: -200, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  {b.sub}
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key={b.id}
              className="pointer-events-none absolute inset-x-0 top-1/3 flex justify-center"
              initial={{ y: 20, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div
                className="skew-x-[-8deg] rounded-md px-5 py-2 font-heading text-3xl uppercase tracking-wider text-white shadow-2xl sm:text-4xl"
                style={{ background: b.color }}
              >
                {b.text}
                {b.sub && <span className="ml-3 text-lg opacity-80">{b.sub}</span>}
              </div>
            </motion.div>
          ),
        )}
      </AnimatePresence>
      {countdown > 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <motion.div
            key={countdown}
            initial={{ scale: 2.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="font-heading text-9xl italic text-white drop-shadow-[0_6px_0_rgba(37,99,235,0.9)]"
          >
            {countdown}
          </motion.div>
        </div>
      )}
      {paused && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm">
          <div className="font-heading text-6xl italic tracking-wide text-white">PAUSED</div>
        </div>
      )}
    </>
  );
}

function useBanners(cfg: MatchConfig) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const idRef = useRef(0);
  const push = useCallback((b: Omit<Banner, "id">, ms: number) => {
    const id = ++idRef.current;
    setBanners((prev) => [...prev.filter((x) => x.kind !== b.kind), { ...b, id }]);
    setTimeout(() => setBanners((prev) => prev.filter((x) => x.id !== id)), ms);
  }, []);
  const onEvents = useCallback(
    (events: MatchEvent[]) => {
      for (const e of events) {
        if (e.t === "goal") {
          const scorer = e.scorer >= 0 ? cfg.players[e.scorer]?.name : null;
          push({ kind: "goal", text: "GOAL!!", sub: scorer ? `${scorer} scores` : cfg.teams[e.side].name, color: cfg.teams[e.side].color }, 2300);
        } else if (e.t === "save") {
          push({ kind: "save", text: "Blue Lock Man", sub: e.catch ? "CATCHES IT" : "PARRIES", color: "#0e7490" }, 1200);
        } else if (e.t === "end") push({ kind: "end", text: "Full Time", color: "#1d4ed8" }, 4000);
      }
    },
    [cfg, push],
  );
  return { banners, onEvents };
}

function Frame({
  children,
  wrapRef,
  onPauseToggle,
  paused,
  sound,
  toggleSound,
  help,
}: {
  children: React.ReactNode;
  wrapRef: React.RefObject<HTMLDivElement | null>;
  onPauseToggle?: () => void;
  paused?: boolean;
  sound: boolean;
  toggleSound: () => void;
  help: string;
}) {
  return (
    <div className="flex w-full flex-col gap-2">
      <div ref={wrapRef} className="relative aspect-[1268/808] w-full select-none overflow-hidden rounded-2xl border border-blue-500/20 bg-slate-950 shadow-[0_0_60px_-15px_rgba(37,99,235,0.6)]">
        {children}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <span className="hidden sm:inline">{help}</span>
        <div className="ml-auto flex gap-1">
          {onPauseToggle && (
            <Button size="sm" variant="ghost" onClick={onPauseToggle} aria-label={paused ? "Resume" : "Pause"}>
              {paused ? <Play /> : <Pause />} {paused ? "Resume" : "Pause"} <kbd className="ml-1 hidden rounded bg-slate-800 px-1 sm:inline">Esc</kbd>
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={toggleSound} aria-label="Toggle sound">
            {sound ? <Volume2 /> : <VolumeX />}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => wrapRef.current?.requestFullscreen?.()} aria-label="Fullscreen">
            <Maximize2 />
          </Button>
        </div>
      </div>
    </div>
  );
}

function useCanvas(wrapRef: React.RefObject<HTMLDivElement | null>) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const r = wrap.getBoundingClientRect();
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      canvas.style.width = `${r.width}px`;
      canvas.style.height = `${r.height}px`;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [wrapRef]);
  return canvasRef;
}

export interface LocalMatchResult {
  state: MatchState;
  log: number[];
}

/** Runs the deterministic engine in the browser. Records slot 0's inputs for server verification. */
export function LocalMatch({ config, schemes, onEnd }: { config: MatchConfig; schemes: Scheme[]; onEnd: (r: LocalMatchResult) => void }) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useCanvas(wrapRef);
  const { shake, sound, toggleSound } = useSettings();
  const { banners, onEvents } = useBanners(config);
  const [score, setScore] = useState<[number, number]>([0, 0]);
  const [clock, setClock] = useState(0);
  const [paused, setPaused] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const pausedRef = useRef(false);
  const kbRef = useRef<KeyboardInput | null>(null);
  const onEndRef = useRef(onEnd);
  const onEventsRef = useRef(onEvents);
  const shakeRef = useRef(shake);

  useEffect(() => {
    onEndRef.current = onEnd;
    onEventsRef.current = onEvents;
    shakeRef.current = shake;
  }, [onEnd, onEvents, shake]);

  useEffect(() => {
    pausedRef.current = paused || countdown > 0;
  }, [paused, countdown]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 700);
    return () => clearTimeout(t);
  }, [countdown]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape" || e.code === "KeyP") setPaused((p) => !p);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const kb = new KeyboardInput(schemes);
    kbRef.current = kb;
    kb.attach();
    const s = createMatch(config);
    const fx = createFx();
    const log: number[] = [];
    const inputs = new Array(config.humanCount).fill(0);
    let last = performance.now();
    let acc = 0;
    let raf = 0;
    let ended = false;
    let hudT = 0;
    const you = schemes.map((_, i) => i);
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (!pausedRef.current && !ended) {
        acc += dt;
        while (acc >= DT) {
          acc -= DT;
          for (let h = 0; h < config.humanCount; h++) inputs[h] = kb.bits(h);
          log.push(inputs[0] ?? 0);
          step(s, config, inputs);
          if (s.events.length) {
            applyEvents(fx, s.events, s, { shake: shakeRef.current });
            playEvents(s.events);
            onEventsRef.current(s.events);
            if (s.events.some((e) => e.t === "goal")) setScore([s.score[0], s.score[1]]);
          }
          if (s.phase === 3) {
            ended = true;
            setScore([s.score[0], s.score[1]]);
            setClock(s.clock);
            setTimeout(() => onEndRef.current({ state: s, log }), 1600);
            break;
          }
        }
      }
      hudT += dt;
      if (hudT > 0.2) {
        hudT = 0;
        setClock(s.clock);
      }
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) render(ctx, canvas.width, canvas.height, config, s, fx, dt, you);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      kb.detach();
    };
  }, [config, schemes, canvasRef]);

  const help =
    schemes.length > 1
      ? schemes.map((sc, i) => `P${i + 1}: ${CONTROL_HELP[sc].move}, shoot ${CONTROL_HELP[sc].shoot.split(" (")[0]}, pass ${CONTROL_HELP[sc].pass}`).join("   |   ")
      : `Move ${CONTROL_HELP.solo.move}. Shoot/tackle ${CONTROL_HELP.solo.shoot}. Pass ${CONTROL_HELP.solo.pass}.`;

  return (
    <Frame wrapRef={wrapRef} onPauseToggle={() => setPaused((p) => !p)} paused={paused} sound={sound} toggleSound={toggleSound} help={help}>
      <canvas ref={canvasRef} className="absolute inset-0" />
      <Hud cfg={config} score={score} clock={clock} banners={banners} paused={paused} countdown={countdown} />
      <TouchControls onBits={(b) => kbRef.current && (kbRef.current.touchBits = b)} color={HUMAN_COLORS[0]} />
    </Frame>
  );
}

export interface SnapFeed {
  subscribe: (cb: (s: Snapshot, ev: MatchEvent[]) => void) => () => void;
  sendInput: (bits: number) => void;
}

/** Renders a server-authoritative match from interpolated snapshots and streams inputs back. */
export function OnlineMatch({ config, you, feed }: { config: MatchConfig; you: number; feed: SnapFeed }) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useCanvas(wrapRef);
  const { shake, sound, toggleSound } = useSettings();
  const { banners, onEvents } = useBanners(config);
  const [score, setScore] = useState<[number, number]>([0, 0]);
  const [clock, setClock] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const kbRef = useRef<KeyboardInput | null>(null);
  const onEventsRef = useRef(onEvents);
  const shakeRef = useRef(shake);

  useEffect(() => {
    onEventsRef.current = onEvents;
    shakeRef.current = shake;
  }, [onEvents, shake]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  useEffect(() => {
    const kb = new KeyboardInput(["solo"]);
    kbRef.current = kb;
    kb.attach();
    const base = createMatch(config);
    const fx = createFx();
    const buf: { s: Snapshot; at: number }[] = [];
    const unsub = feed.subscribe((snap, ev) => {
      buf.push({ s: snap, at: performance.now() });
      if (buf.length > 30) buf.shift();
      if (ev.length) {
        stateFromSnapshot(base, snap, null, 0);
        applyEvents(fx, ev, base, { shake: shakeRef.current });
        playEvents(ev);
        onEventsRef.current(ev);
      }
      setScore([snap.sc[0], snap.sc[1]]);
    });
    let raf = 0;
    let last = performance.now();
    let lastBits = -1;
    let lastSent = 0;
    let hudT = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const bits = kb.bits(0);
      if (bits !== lastBits || now - lastSent > 120) {
        feed.sendInput(bits);
        lastBits = bits;
        lastSent = now;
      }
      const target = now - 110;
      let a = buf[0];
      let b: (typeof buf)[number] | null = null;
      for (let i = 0; i < buf.length - 1; i++) {
        if (buf[i].at <= target && buf[i + 1].at >= target) {
          a = buf[i];
          b = buf[i + 1];
          break;
        }
      }
      if (!b && buf.length) a = buf[buf.length - 1];
      if (a) {
        const t = b ? Math.min(1, Math.max(0, (target - a.at) / Math.max(1, b.at - a.at))) : 0;
        stateFromSnapshot(base, a.s, b?.s ?? null, t);
        hudT += dt;
        if (hudT > 0.2) {
          hudT = 0;
          setClock(base.clock);
        }
      }
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) render(ctx, canvas.width, canvas.height, config, base, fx, dt, [you]);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      unsub();
      kb.detach();
    };
  }, [config, you, feed, canvasRef]);

  return (
    <Frame wrapRef={wrapRef} sound={sound} toggleSound={toggleSound} help={`Move ${CONTROL_HELP.solo.move}. Shoot/tackle ${CONTROL_HELP.solo.shoot}. Pass ${CONTROL_HELP.solo.pass}.`}>
      <canvas ref={canvasRef} className="absolute inset-0" />
      <Hud cfg={config} score={score} clock={clock} banners={banners} paused={false} countdown={countdown} />
      <TouchControls onBits={(b) => kbRef.current && (kbRef.current.touchBits = b)} color={HUMAN_COLORS[you % HUMAN_COLORS.length]} />
    </Frame>
  );
}

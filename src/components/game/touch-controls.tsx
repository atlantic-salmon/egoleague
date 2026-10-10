"use client";

import { useEffect, useRef, useState } from "react";
import { IN } from "@/game/engine";

/** On-screen joystick plus shoot/pass buttons, shown only on touch devices. */
export function TouchControls({ onBits, color }: { onBits: (bits: number) => void; color: string }) {
  const [enabled, setEnabled] = useState(false);
  const stick = useRef({ id: -1, ox: 0, oy: 0, dx: 0, dy: 0 });
  const buttons = useRef({ shoot: false, pass: false });
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setEnabled(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  const emit = () => {
    const { dx, dy } = stick.current;
    let b = 0;
    const dead = 14;
    if (dy < -dead) b |= IN.UP;
    if (dy > dead) b |= IN.DOWN;
    if (dx < -dead) b |= IN.LEFT;
    if (dx > dead) b |= IN.RIGHT;
    if (buttons.current.shoot) b |= IN.SHOOT;
    if (buttons.current.pass) b |= IN.PASS;
    onBits(b);
  };

  if (!enabled) return null;

  return (
    <div className="pointer-events-none absolute inset-0 touch-none">
      <div
        className="pointer-events-auto absolute bottom-3 left-3 size-32 rounded-full border-2 border-white/20 bg-white/5"
        onPointerDown={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          stick.current = { id: e.pointerId, ox: r.left + r.width / 2, oy: r.top + r.height / 2, dx: 0, dy: 0 };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (e.pointerId !== stick.current.id) return;
          let dx = e.clientX - stick.current.ox;
          let dy = e.clientY - stick.current.oy;
          const l = Math.hypot(dx, dy);
          if (l > 48) {
            dx = (dx / l) * 48;
            dy = (dy / l) * 48;
          }
          stick.current.dx = dx;
          stick.current.dy = dy;
          setKnob({ x: dx, y: dy });
          emit();
        }}
        onPointerUp={() => {
          stick.current = { id: -1, ox: 0, oy: 0, dx: 0, dy: 0 };
          setKnob({ x: 0, y: 0 });
          emit();
        }}
      >
        <div
          className="absolute left-1/2 top-1/2 size-14 rounded-full border-2 bg-white/20"
          style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))`, borderColor: color }}
        />
      </div>
      <div className="pointer-events-auto absolute bottom-4 right-4 flex items-end gap-3">
        {(["pass", "shoot"] as const).map((k) => (
          <button
            key={k}
            className={`rounded-full border-2 border-white/30 font-heading uppercase tracking-wider text-white active:scale-95 ${
              k === "shoot" ? "size-20 bg-blue-600/70 text-lg" : "size-14 bg-slate-700/70 text-sm"
            }`}
            onPointerDown={(e) => {
              e.preventDefault();
              buttons.current[k] = true;
              emit();
            }}
            onPointerUp={() => {
              buttons.current[k] = false;
              emit();
            }}
            onPointerLeave={() => {
              buttons.current[k] = false;
              emit();
            }}
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}

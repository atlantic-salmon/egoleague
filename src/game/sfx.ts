import type { MatchEvent } from "./types";

let ctx: AudioContext | null = null;

function ac() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number) {
  const a = ac();
  if (!a) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, a.currentTime);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, a.currentTime + dur);
  g.gain.setValueAtTime(vol, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
  o.connect(g).connect(a.destination);
  o.start();
  o.stop(a.currentTime + dur);
}

function noise(dur: number, vol: number, filterFreq: number) {
  const a = ac();
  if (!a) return;
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = filterFreq;
  const g = a.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(a.destination);
  src.start();
}

export function sfxEnabled() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("bl_sound") !== "off";
}

export function playEvents(events: MatchEvent[]) {
  if (!sfxEnabled()) return;
  for (const e of events) {
    if (e.t === "kick") tone(140, 0.08, "triangle", 0.25, 60);
    else if (e.t === "shot") {
      tone(90, 0.18, "sawtooth", 0.18, 40);
      noise(0.15, 0.25, 1200);
    } else if (e.t === "goal") {
      noise(1.6, 0.35, 700);
      tone(523, 0.35, "square", 0.08);
      setTimeout(() => tone(659, 0.35, "square", 0.08), 120);
      setTimeout(() => tone(784, 0.6, "square", 0.08), 240);
    } else if (e.t === "save") {
      tone(70, 0.2, "sine", 0.4, 40);
      noise(0.1, 0.2, 400);
    } else if (e.t === "tackle") noise(0.12, 0.3, 300);
    else if (e.t === "fumble") {
      noise(0.2, 0.35, 500);
      tone(120, 0.25, "sawtooth", 0.15, 80);
    } else if (e.t === "ability") {
      tone(220, 0.18, "sawtooth", 0.12, 900);
      tone(660, 0.35, "square", 0.1, 400);
      setTimeout(() => tone(990, 0.45, "square", 0.08, 600), 80);
      noise(0.25, 0.18, 900);
    } else if (e.t === "post") tone(880, 0.25, "triangle", 0.15, 600);
    else if (e.t === "kickoff" || e.t === "end") {
      tone(2600, 0.25, "sine", 0.08, 2400);
      if (e.t === "end") setTimeout(() => tone(2600, 0.6, "sine", 0.08, 2300), 300);
    }
  }
}

export function uiBlip(kind: "pull" | "reveal" | "rare" | "tick" = "pull") {
  if (!sfxEnabled()) return;
  if (kind === "tick") tone(880, 0.04, "sine", 0.05);
  else if (kind === "pull") tone(300, 0.15, "triangle", 0.12, 900);
  else if (kind === "reveal") tone(660, 0.12, "sine", 0.12);
  else {
    tone(523, 0.2, "square", 0.08);
    setTimeout(() => tone(784, 0.2, "square", 0.08), 100);
    setTimeout(() => tone(1046, 0.5, "square", 0.08), 200);
  }
}

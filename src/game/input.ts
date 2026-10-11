import { IN } from "./engine";

export type Scheme = "solo" | "p1" | "p2";

const MAPS: Record<Scheme, Record<string, number>> = {
  solo: {
    KeyW: IN.UP,
    KeyS: IN.DOWN,
    KeyA: IN.LEFT,
    KeyD: IN.RIGHT,
    ArrowUp: IN.UP,
    ArrowDown: IN.DOWN,
    ArrowLeft: IN.LEFT,
    ArrowRight: IN.RIGHT,
    Space: IN.SHOOT,
    KeyJ: IN.SHOOT,
    KeyE: IN.PASS,
    KeyK: IN.PASS,
    ShiftLeft: IN.PASS,
    KeyQ: IN.ABILITY,
  },
  p1: { KeyW: IN.UP, KeyS: IN.DOWN, KeyA: IN.LEFT, KeyD: IN.RIGHT, Space: IN.SHOOT, KeyE: IN.PASS, KeyQ: IN.ABILITY },
  p2: {
    ArrowUp: IN.UP,
    ArrowDown: IN.DOWN,
    ArrowLeft: IN.LEFT,
    ArrowRight: IN.RIGHT,
    Enter: IN.SHOOT,
    NumpadEnter: IN.SHOOT,
    ShiftRight: IN.PASS,
    Slash: IN.PASS,
    KeyU: IN.ABILITY,
  },
};

export const CONTROL_HELP: Record<Scheme, { move: string; shoot: string; pass: string; ability: string }> = {
  solo: { move: "WASD / Arrows", shoot: "Space / J (hold to charge)", pass: "E / K / Left Shift", ability: "Q" },
  p1: { move: "WASD", shoot: "Space (hold to charge)", pass: "E", ability: "Q" },
  p2: { move: "Arrow keys", shoot: "Enter (hold to charge)", pass: "Right Shift or /", ability: "U" },
};

export class KeyboardInput {
  private down = new Set<string>();
  private onDown = (e: KeyboardEvent) => {
    if (this.isGameKey(e.code)) {
      e.preventDefault();
      this.down.add(e.code);
    }
  };
  private onUp = (e: KeyboardEvent) => {
    this.down.delete(e.code);
  };
  private onBlur = () => this.down.clear();
  touchBits = 0;

  constructor(private schemes: Scheme[]) {}

  private isGameKey(code: string) {
    return this.schemes.some((s) => code in MAPS[s]);
  }

  attach() {
    window.addEventListener("keydown", this.onDown);
    window.addEventListener("keyup", this.onUp);
    window.addEventListener("blur", this.onBlur);
  }

  detach() {
    window.removeEventListener("keydown", this.onDown);
    window.removeEventListener("keyup", this.onUp);
    window.removeEventListener("blur", this.onBlur);
  }

  bits(slot: number) {
    const scheme = this.schemes[slot];
    let b = 0;
    if (scheme) {
      const m = MAPS[scheme];
      for (const code of this.down) b |= m[code] ?? 0;
    }
    if (slot === 0) b |= this.touchBits;
    b |= gamepadBits(slot);
    // Keep all action bits including ABILITY (64). Masking with 63 stripped Q.
    return b & 127;
  }
}

function gamepadBits(slot: number) {
  if (typeof navigator === "undefined" || !navigator.getGamepads) return 0;
  const pads = navigator.getGamepads().filter(Boolean);
  const gp = pads[slot];
  if (!gp) return 0;
  let b = 0;
  const ax = gp.axes[0] ?? 0;
  const ay = gp.axes[1] ?? 0;
  if (ay < -0.4 || gp.buttons[12]?.pressed) b |= IN.UP;
  if (ay > 0.4 || gp.buttons[13]?.pressed) b |= IN.DOWN;
  if (ax < -0.4 || gp.buttons[14]?.pressed) b |= IN.LEFT;
  if (ax > 0.4 || gp.buttons[15]?.pressed) b |= IN.RIGHT;
  if (gp.buttons[0]?.pressed || gp.buttons[7]?.pressed) b |= IN.SHOOT;
  if (gp.buttons[2]?.pressed || gp.buttons[1]?.pressed) b |= IN.PASS;
  if (gp.buttons[3]?.pressed) b |= IN.ABILITY;
  return b;
}

/** Run-length encodes a per-tick input log as (value, count) byte pairs in base64. */
export function encodeInputLog(log: number[]) {
  const bytes: number[] = [];
  let i = 0;
  while (i < log.length) {
    const v = log[i] & 127;
    let n = 1;
    while (i + n < log.length && (log[i + n] & 127) === v && n < 255) n++;
    bytes.push(v, n);
    i += n;
  }
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

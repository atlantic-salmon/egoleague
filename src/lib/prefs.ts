"use client";

import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

/** Boolean on/off preference persisted in localStorage, shared live across components. */
export function usePref(key: "bl_sound" | "bl_shake") {
  const value = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(key) !== "off",
    () => true,
  );
  const set = (v: boolean) => {
    localStorage.setItem(key, v ? "on" : "off");
    for (const l of listeners) l();
  };
  return [value, set] as const;
}

export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

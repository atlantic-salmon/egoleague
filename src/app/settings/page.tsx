"use client";

import { useRouter } from "next/navigation";
import { Gamepad2, Keyboard, LogOut, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CONTROL_HELP, type Scheme } from "@/game/input";
import { uiBlip } from "@/game/sfx";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import { usePref } from "@/lib/prefs";

const SCHEMES: { id: Scheme; label: string }[] = [
  { id: "solo", label: "Solo (story, online, ghost)" },
  { id: "p1", label: "Local Player 1" },
  { id: "p2", label: "Local Player 2" },
];

function Toggle({ id, label, desc, value, onChange }: { id: string; label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <label htmlFor={id}>
        <div className="font-semibold text-white">{label}</div>
        <div className="text-sm text-slate-400">{desc}</div>
      </label>
      <Switch id={id} checked={value} onCheckedChange={onChange} />
    </div>
  );
}

export default function SettingsPage() {
  const { user, setUser } = useSession();
  const router = useRouter();
  const [sound, setSound] = usePref("bl_sound");
  const [shake, setShake] = usePref("bl_shake");

  const logout = async () => {
    await api("/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
    toast.success("Logged out");
    router.push("/");
  };

  return (
    <div className="max-w-3xl">
      <PageHeader title="Settings" kicker={user ? user.username : "Guest"} />
      <section className="rounded-2xl border border-white/10 bg-slate-900/70 px-4">
        <Toggle
          id="sound"
          label="Sound effects"
          desc="Kicks, goals, whistles and gacha reveals."
          value={sound}
          onChange={(v) => {
            setSound(v);
            if (v) uiBlip("reveal");
          }}
        />
        <div className="h-px bg-white/5" />
        <Toggle
          id="shake"
          label="Screen shake"
          desc="Camera shake on goals, saves and hard tackles."
          value={shake}
          onChange={(v) => {
            setShake(v);
          }}
        />
      </section>

      <section className="mt-6 rounded-2xl border border-white/10 bg-slate-900/70 p-4">
        <h2 className="mb-3 flex items-center gap-2 font-heading text-xl uppercase italic text-white">
          <Keyboard className="size-5 text-blue-300" /> Controls
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-slate-400">
              <tr>
                <th className="py-1 pr-3">Scheme</th>
                <th className="py-1 pr-3">Move</th>
                <th className="py-1 pr-3">Shoot / tackle</th>
                <th className="py-1">Pass</th>
              </tr>
            </thead>
            <tbody>
              {SCHEMES.map((s) => (
                <tr key={s.id} className="border-t border-white/5">
                  <td className="py-2 pr-3 font-semibold text-white">{s.label}</td>
                  <td className="py-2 pr-3 text-slate-300">{CONTROL_HELP[s.id].move}</td>
                  <td className="py-2 pr-3 text-slate-300">{CONTROL_HELP[s.id].shoot}</td>
                  <td className="py-2 text-slate-300">{CONTROL_HELP[s.id].pass}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="mt-3 space-y-1 text-sm text-slate-400">
          <li>There is no sprint button. Hold a direction and your player winds up to top speed; how fast depends on their Acceleration.</li>
          <li>Turning sharply bleeds momentum. Agile players keep more speed through turns.</li>
          <li>Hold shoot to charge a stronger shot. Pressing shoot without the ball is a sliding tackle.</li>
          <li>Esc or P pauses local matches.</li>
        </ul>
        <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-400">
          <span className="inline-flex items-center gap-1">
            <Gamepad2 className="size-4" /> Gamepads work automatically (left stick, A to shoot, B or X to pass).
          </span>
          <span className="inline-flex items-center gap-1">
            <Smartphone className="size-4" /> On touch screens an on-screen joystick appears.
          </span>
        </div>
      </section>

      {user && (
        <section className="mt-6 flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/70 p-4">
          <div className="text-sm text-slate-400">
            Signed in as <span className="font-semibold text-white">{user.username}</span>
          </div>
          <Button variant="outline" onClick={logout}>
            <LogOut /> Log out
          </Button>
        </section>
      )}
    </div>
  );
}

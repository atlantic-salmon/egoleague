import { all, get } from "./db";
import { HttpError } from "./http";
import { T, type ItemRow } from "./economy";
import type { RosterEntry } from "@/game/setup";
import type { Formation } from "@/game/types";

export interface TeamRow {
  id: number;
  user_id: number;
  name: string;
  formation: Formation;
  slots: string;
  is_default: number;
}

export const TRAINEE: RosterEntry = { variantId: "igaguri.base", level: 1, talent: 10, quality: 10 };

export function getTeam(userId: number, teamId: number | null | undefined) {
  const t =
    teamId != null
      ? get<TeamRow>("SELECT * FROM teams WHERE id = ? AND user_id = ?", teamId, userId)
      : (get<TeamRow>("SELECT * FROM teams WHERE user_id = ? ORDER BY is_default DESC, id ASC LIMIT 1", userId) ?? undefined);
  if (teamId != null && !t) throw new HttpError(404, "Team not found");
  return t ?? null;
}

/**
 * Builds a match roster from a saved team, re-checking at match time that every
 * player and every piece of equipped gear is owned by this user and not locked.
 */
export function buildRoster(userId: number, teamId: number | null | undefined, size: number) {
  const team = getTeam(userId, teamId);
  const ids = team ? (JSON.parse(team.slots) as (number | null)[]).filter((x): x is number => typeof x === "number") : [];
  const entries: (RosterEntry & { itemId: number | null })[] = [];
  for (const id of ids) {
    if (entries.length >= size) break;
    const it = get<ItemRow>("SELECT * FROM items WHERE id = ?", id);
    if (!it || it.owner_id !== userId || it.kind !== "char") {
      throw new HttpError(409, "Your team contains a player you no longer own. Edit your team first.");
    }
    if (it.locked_by) throw new HttpError(409, "A player in your team is locked in a trade or listing.");
    const gear = all<ItemRow>("SELECT * FROM items WHERE equipped_to = ? AND kind = 'gear'", it.id);
    for (const g of gear) {
      if (g.owner_id !== userId || g.locked_by) throw new HttpError(409, "Equipped gear is locked or not yours.");
    }
    let traits: string[] = [];
    try {
      traits = JSON.parse(it.traits || "[]") as string[];
    } catch {
      traits = [];
    }
    entries.push({
      itemId: it.id,
      variantId: it.template_id,
      level: it.level,
      talent: it.talent,
      quality: it.quality,
      traits,
      gear: gear.map((g) => ({ templateId: g.template_id, talent: g.talent, quality: g.quality })),
    });
  }
  if (entries.length === 0) {
    const first = get<ItemRow>(
      "SELECT * FROM items WHERE owner_id = ? AND kind = 'char' AND locked_by IS NULL ORDER BY id LIMIT 1",
      userId,
    );
    if (first) {
      let traits: string[] = [];
      try {
        traits = JSON.parse(first.traits || "[]") as string[];
      } catch {
        traits = [];
      }
      entries.push({
        itemId: first.id,
        variantId: first.template_id,
        level: first.level,
        talent: first.talent,
        quality: first.quality,
        traits,
        gear: [],
      });
    }
  }
  while (entries.length < size) entries.push({ ...TRAINEE, itemId: null });
  return { team, entries, formation: (team?.formation ?? "balanced") as Formation, tuning: T };
}

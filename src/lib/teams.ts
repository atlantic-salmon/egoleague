import type { TeamView } from "./types";

export function defaultTeamId(teams: TeamView[] | undefined) {
  if (!teams?.length) return null;
  return (teams.find((t) => t.isDefault) ?? teams[0]).id;
}

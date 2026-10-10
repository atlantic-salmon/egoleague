export type QuestMetric =
  | "goals"
  | "wins"
  | "pulls"
  | "friendly"
  | "story_clear"
  | "ranked_win"
  | "market"
  | "levelups"
  | "stage:1-1"
  | "chapter:1"
  | "chapter:2"
  | "account_level"
  | "items";

export interface QuestDef {
  id: string;
  period: "daily" | "life";
  title: string;
  desc: string;
  metric: QuestMetric;
  target: number;
  reward: { gems?: number; coins?: number; shards?: number };
}

export const QUESTS: QuestDef[] = [
  { id: "d_goals", period: "daily", title: "Goal Hunger", desc: "Score 5 goals in any verified match.", metric: "goals", target: 5, reward: { gems: 60 } },
  { id: "d_wins", period: "daily", title: "Survive the Selection", desc: "Win 2 matches.", metric: "wins", target: 2, reward: { coins: 200 } },
  { id: "d_pulls", period: "daily", title: "Roll the Dice", desc: "Make 10 gacha pulls.", metric: "pulls", target: 10, reward: { coins: 150, shards: 5 } },
  { id: "d_friendly", period: "daily", title: "Rivals and Friends", desc: "Finish a friendly lobby match.", metric: "friendly", target: 1, reward: { gems: 40 } },
  { id: "d_story", period: "daily", title: "Follow the Path", desc: "Clear any story stage.", metric: "story_clear", target: 1, reward: { gems: 50 } },
  { id: "d_level", period: "daily", title: "Train Hard", desc: "Level up a player or gear 3 times.", metric: "levelups", target: 3, reward: { coins: 120 } },
  { id: "l_blm", period: "life", title: "Beat the Blue Lock Man", desc: "Clear stage 1-1 and score past the Blue Lock Man.", metric: "stage:1-1", target: 1, reward: { gems: 300 } },
  { id: "l_ch1", period: "life", title: "First Selection Survivor", desc: "Clear every stage in Chapter 1.", metric: "chapter:1", target: 1, reward: { gems: 500, coins: 500 } },
  { id: "l_ch2", period: "life", title: "Second Selection Survivor", desc: "Clear every stage in Chapter 2.", metric: "chapter:2", target: 1, reward: { gems: 800 } },
  { id: "l_lvl5", period: "life", title: "Rising Egoist", desc: "Reach account level 5.", metric: "account_level", target: 5, reward: { gems: 200 } },
  { id: "l_lvl15", period: "life", title: "Seasoned Egoist", desc: "Reach account level 15.", metric: "account_level", target: 15, reward: { gems: 600 } },
  { id: "l_items", period: "life", title: "Collector", desc: "Own 25 players or gear.", metric: "items", target: 25, reward: { gems: 250 } },
  { id: "l_market", period: "life", title: "Market Debut", desc: "Buy or sell something on the market.", metric: "market", target: 1, reward: { coins: 300 } },
  { id: "l_ranked", period: "life", title: "Top of the Rankings", desc: "Win a ranked match.", metric: "ranked_win", target: 1, reward: { gems: 300 } },
];

export const QUEST_BY_ID: Record<string, QuestDef> = Object.fromEntries(QUESTS.map((q) => [q.id, q]));

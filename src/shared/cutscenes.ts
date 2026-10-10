export type CutsceneFx = "speedlines" | "shake" | "flash" | "metavision" | "zoom" | "chains" | "impact" | "glitch";
export type Backdrop = "void" | "facility" | "pitch" | "stadium" | "crimson" | "monitor" | "night";

export interface CutscenePortrait {
  id: string;
  pos: "left" | "right" | "center";
  expr?: "normal" | "ego" | "shock" | "smirk";
}

export interface CutsceneFrame {
  bg: Backdrop;
  speaker?: string;
  name?: string;
  text: string;
  portraits?: CutscenePortrait[];
  fx?: CutsceneFx[];
  title?: string;
}

export const CUTSCENES: Record<string, CutsceneFrame[]> = {
  c1_intro: [
    { bg: "void", title: "BLUE LOCK", text: "300 high school strikers have been summoned to a facility in the mountains.", fx: ["flash"] },
    { bg: "monitor", speaker: "ego", name: "Ego Jinpachi", portraits: [{ id: "ego", pos: "center" }], text: "Good evening, you diamonds in the rough. Japan has never won a World Cup. I know why.", fx: ["glitch"] },
    { bg: "monitor", speaker: "ego", name: "Ego Jinpachi", portraits: [{ id: "ego", pos: "center", expr: "smirk" }], text: "Japan has no egoists. So I built a prison to manufacture one.", fx: ["zoom"] },
    { bg: "facility", speaker: "isagi", name: "Isagi Yoichi", portraits: [{ id: "isagi", pos: "left", expr: "shock" }], text: "One striker survives... and the other 299 never play for Japan again?" },
    { bg: "facility", speaker: "blm", name: "Blue Lock Man", portraits: [{ id: "blm", pos: "right" }], text: "TARGET ACQUIRED. GOALKEEPER PROTOCOL ONLINE. SCORE, OR BE ELIMINATED.", fx: ["shake", "glitch"] },
    { bg: "pitch", speaker: "isagi", name: "Isagi Yoichi", portraits: [{ id: "isagi", pos: "left", expr: "ego" }, { id: "blm", pos: "right" }], text: "Fine. If it's a machine, I'll read it. Three goals. Let's go.", fx: ["speedlines"] },
  ],
  c1_intro_after: [
    { bg: "pitch", speaker: "blm", name: "Blue Lock Man", portraits: [{ id: "blm", pos: "right" }], text: "...GOAL THRESHOLD EXCEEDED. SUBJECT ISAGI: PASS.", fx: ["glitch"] },
    { bg: "pitch", speaker: "isagi", name: "Isagi Yoichi", portraits: [{ id: "isagi", pos: "left", expr: "ego" }], text: "That feeling when the net ripples... I want more of it.", fx: ["speedlines", "flash"] },
    { bg: "monitor", speaker: "ego", name: "Ego Jinpachi", portraits: [{ id: "ego", pos: "center", expr: "smirk" }], text: "Good. Now go to Team Z. You start at the very bottom of the rankings." },
  ],
  c1_teamy: [
    { bg: "facility", speaker: "bachira", name: "Bachira Meguru", portraits: [{ id: "bachira", pos: "right", expr: "smirk" }, { id: "isagi", pos: "left" }], text: "Isagi! You smelled the goal back there, right? Let's play together, the monster inside me says so." },
    { bg: "facility", speaker: "kunigami", name: "Kunigami Rensuke", portraits: [{ id: "kunigami", pos: "right" }, { id: "isagi", pos: "left" }], text: "Team Y beat everyone with simple football. No tricks. Let's crush them head-on." },
    { bg: "pitch", speaker: "isagi", name: "Isagi Yoichi", portraits: [{ id: "isagi", pos: "left", expr: "ego" }], text: "Pass when it creates space. Shoot when the space is mine.", fx: ["metavision"] },
  ],
  c1_teamy_after: [
    { bg: "pitch", speaker: "chigiri", name: "Chigiri Hyoma", portraits: [{ id: "chigiri", pos: "right" }], text: "I was scared to run full speed again... but that win felt good." },
    { bg: "pitch", speaker: "isagi", name: "Isagi Yoichi", portraits: [{ id: "isagi", pos: "left" }], text: "Next is Team V. They say a genius plays for them." },
  ],
  c1_teamv: [
    { bg: "stadium", speaker: "reo", name: "Mikage Reo", portraits: [{ id: "reo", pos: "right", expr: "smirk" }, { id: "nagi", pos: "left" }], text: "Nagi, these guys are next. We win, we stay together. Easy." },
    { bg: "stadium", speaker: "nagi", name: "Nagi Seishiro", portraits: [{ id: "nagi", pos: "left" }], text: "Ugh... football is such a hassle. Fine. Just pass it to me.", fx: ["zoom"] },
    { bg: "stadium", speaker: "isagi", name: "Isagi Yoichi", portraits: [{ id: "isagi", pos: "left", expr: "ego" }, { id: "nagi", pos: "right" }], text: "A genius trap... then I'll take the moment before it.", fx: ["speedlines", "metavision"] },
  ],
  c1_teamv_after: [
    { bg: "stadium", speaker: "nagi", name: "Nagi Seishiro", portraits: [{ id: "nagi", pos: "right", expr: "shock" }], text: "...This is the first time I've wanted to win so badly.", fx: ["flash"] },
    { bg: "monitor", speaker: "ego", name: "Ego Jinpachi", portraits: [{ id: "ego", pos: "center" }], text: "First Selection complete. Those who remain, proceed to the Second Selection." },
  ],
  c2_rin: [
    { bg: "night", title: "SECOND SELECTION", text: "The Fourth Stage. A team of three is waiting for challengers.", fx: ["flash"] },
    { bg: "facility", speaker: "rin", name: "Itoshi Rin", portraits: [{ id: "rin", pos: "right", expr: "ego" }], text: "You're all just extras. Try to score on me. One goal and you earn the right to breathe here.", fx: ["chains"] },
    { bg: "facility", speaker: "isagi", name: "Isagi Yoichi", portraits: [{ id: "isagi", pos: "left", expr: "ego" }, { id: "rin", pos: "right" }], text: "Rin... I'll take that number one spot from you.", fx: ["speedlines", "shake"] },
  ],
  c2_rin_after: [
    { bg: "facility", speaker: "rin", name: "Itoshi Rin", portraits: [{ id: "rin", pos: "right" }], text: "Hmph. Don't get comfortable. You're still not worth looking at." },
  ],
  c2_barou: [
    { bg: "crimson", speaker: "barou", name: "Barou Shoei", portraits: [{ id: "barou", pos: "right", expr: "ego" }], text: "The pitch is my kingdom. You peasants exist to give me the ball.", fx: ["impact", "shake"] },
    { bg: "crimson", speaker: "isagi", name: "Isagi Yoichi", portraits: [{ id: "isagi", pos: "left", expr: "ego" }, { id: "barou", pos: "right" }], text: "Then I'll steal your crown. A two-goal margin, so there's no doubt.", fx: ["speedlines"] },
  ],
  c2_barou_after: [
    { bg: "crimson", speaker: "barou", name: "Barou Shoei", portraits: [{ id: "barou", pos: "right", expr: "shock" }], text: "Tch... Fine. Next time I'll devour YOU." },
    { bg: "monitor", speaker: "ego", name: "Ego Jinpachi", portraits: [{ id: "ego", pos: "center", expr: "smirk" }], text: "Excellent. Now we bet everything on one match. Blue Lock versus the U-20 Japan team." },
  ],
  c3_u20: [
    { bg: "stadium", title: "BLUE LOCK vs U-20 JAPAN", text: "Lose, and Blue Lock is shut down forever.", fx: ["flash", "shake"] },
    { bg: "stadium", speaker: "sae", name: "Itoshi Sae", portraits: [{ id: "sae", pos: "right" }], text: "Japan's football is a field of corpses. Let's see if any of you are alive." },
    { bg: "stadium", speaker: "shidou", name: "Shidou Ryusei", portraits: [{ id: "shidou", pos: "right", expr: "ego" }], text: "Sae-chan's passes are MINE. Get out of my way, Blue Lock!", fx: ["impact"] },
    { bg: "stadium", speaker: "isagi", name: "Isagi Yoichi", portraits: [{ id: "isagi", pos: "left", expr: "ego" }], text: "I can see all twenty-two players. Every line, every gap.", fx: ["metavision", "speedlines"] },
  ],
  c3_u20_after: [
    { bg: "stadium", speaker: "sae", name: "Itoshi Sae", portraits: [{ id: "sae", pos: "right", expr: "smirk" }], text: "...Isagi Yoichi. Remember that name, Rin." },
    { bg: "stadium", title: "BLUE LOCK WINS", text: "The world has started paying attention.", fx: ["flash"] },
  ],
  c4_manshine: [
    { bg: "night", title: "NEO EGOIST LEAGUE", text: "Five top clubs. The highest bidder gets you.", fx: ["flash"] },
    { bg: "stadium", speaker: "kaiser", name: "Michael Kaiser", portraits: [{ id: "kaiser", pos: "right", expr: "smirk" }], text: "Isagi, was it? You're just a clown in my show." },
    { bg: "stadium", speaker: "nagi", name: "Nagi Seishiro", portraits: [{ id: "nagi", pos: "right" }, { id: "isagi", pos: "left" }], text: "Isagi. This time I'm the one who's going to win." },
  ],
  c4_manshine_after: [
    { bg: "stadium", speaker: "isagi", name: "Isagi Yoichi", portraits: [{ id: "isagi", pos: "left", expr: "ego" }], text: "My value just went up. Next, the Emperor.", fx: ["speedlines"] },
  ],
  c4_kaiser: [
    { bg: "crimson", speaker: "kaiser", name: "Michael Kaiser", portraits: [{ id: "kaiser", pos: "right", expr: "ego" }], text: "Kneel. A world-class team, assembled to bury you.", fx: ["chains", "shake"] },
    { bg: "crimson", speaker: "rin", name: "Itoshi Rin", portraits: [{ id: "rin", pos: "right", expr: "ego" }], text: "Isagi. I'll destroy you myself.", fx: ["glitch"] },
    { bg: "crimson", speaker: "isagi", name: "Isagi Yoichi", portraits: [{ id: "isagi", pos: "left", expr: "ego" }], text: "Then I'll devour all of you. I'm going to be the world's number one striker.", fx: ["metavision", "speedlines", "impact"] },
  ],
  c4_kaiser_after: [
    { bg: "void", title: "WORLD'S #1", text: "The egoist who devoured the world.", fx: ["flash", "speedlines"] },
    { bg: "monitor", speaker: "ego", name: "Ego Jinpachi", portraits: [{ id: "ego", pos: "center", expr: "smirk" }], text: "This is what I wanted to see. But a striker is never finished. Keep evolving." },
  ],
};

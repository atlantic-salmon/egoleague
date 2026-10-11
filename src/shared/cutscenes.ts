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
    { bg: "pitch", speaker: "isagi", name: "Isagi Yoichi", portraits: [{ id: "isagi", pos: "left" }], text: "Team W is next. They press like wolves." },
  ],
  c1_teamw: [
    { bg: "facility", speaker: "kunigami", name: "Kunigami Rensuke", portraits: [{ id: "kunigami", pos: "right" }, { id: "isagi", pos: "left" }], text: "No dirty tricks. We win with honest football — and we win hard." },
    { bg: "pitch", speaker: "raichi", name: "Raichi Jingo", portraits: [{ id: "raichi", pos: "right", expr: "ego" }], text: "We'll crush you into the wall! Team W doesn't blink!", fx: ["impact", "shake"] },
    { bg: "pitch", speaker: "isagi", name: "Isagi Yoichi", portraits: [{ id: "isagi", pos: "left", expr: "ego" }], text: "High press means gaps behind. I'll take the second ball.", fx: ["metavision"] },
  ],
  c1_teamw_after: [
    { bg: "pitch", speaker: "chigiri", name: "Chigiri Hyoma", portraits: [{ id: "chigiri", pos: "right", expr: "smirk" }], text: "That sprint... yeah. My legs still remember how." },
    { bg: "facility", speaker: "isagi", name: "Isagi Yoichi", portraits: [{ id: "isagi", pos: "left" }], text: "Next is Team V. They say a genius plays for them." },
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
    { bg: "monitor", speaker: "ego", name: "Ego Jinpachi", portraits: [{ id: "ego", pos: "center" }], text: "Chemical reactions next. Find the ego that multiplies yours — or disappear." },
  ],
  c2_chem: [
    { bg: "night", title: "THIRD SELECTION", text: "Pair. Clash. Evolve. Only synchronized egos advance.", fx: ["flash"] },
    { bg: "facility", speaker: "reo", name: "Mikage Reo", portraits: [{ id: "reo", pos: "right", expr: "smirk" }, { id: "nagi", pos: "left" }], text: "Isagi. If we sync, nobody in this prison can stop us." },
    { bg: "facility", speaker: "isagi", name: "Isagi Yoichi", portraits: [{ id: "isagi", pos: "left", expr: "ego" }, { id: "bachira", pos: "right" }], text: "Four goals. I'll read every link until the net is ours.", fx: ["metavision", "speedlines"] },
  ],
  c2_chem_after: [
    { bg: "facility", speaker: "nagi", name: "Nagi Seishiro", portraits: [{ id: "nagi", pos: "right", expr: "smirk" }], text: "...That felt good. Annoying how good." },
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
    { bg: "stadium", title: "BLUE LOCK WINS", text: "But the U-20 wants a rematch. Overtime egos don't sleep.", fx: ["flash"] },
  ],
  c3_ot: [
    { bg: "stadium", title: "OVERTIME", text: "Same pitch. Sharper knives.", fx: ["shake", "flash"] },
    { bg: "stadium", speaker: "shidou", name: "Shidou Ryusei", portraits: [{ id: "shidou", pos: "right", expr: "ego" }], text: "Again! Feed me, Sae-chan — I'll explode the net!", fx: ["impact"] },
    { bg: "stadium", speaker: "rin", name: "Itoshi Rin", portraits: [{ id: "rin", pos: "left", expr: "ego" }, { id: "isagi", pos: "right" }], text: "Isagi. Don't drag me down. We end this by two.", fx: ["chains"] },
  ],
  c3_ot_after: [
    { bg: "stadium", speaker: "isagi", name: "Isagi Yoichi", portraits: [{ id: "isagi", pos: "left", expr: "ego" }], text: "We held the line. Blue Lock lives — and the world is bidding.", fx: ["speedlines"] },
    { bg: "monitor", speaker: "ego", name: "Ego Jinpachi", portraits: [{ id: "ego", pos: "center", expr: "smirk" }], text: "Neo Egoist League. Five clubs. One marketplace of monsters." },
  ],
  c4_manshine: [
    { bg: "night", title: "NEO EGOIST LEAGUE", text: "Five top clubs. The highest bidder gets you.", fx: ["flash"] },
    { bg: "stadium", speaker: "kaiser", name: "Michael Kaiser", portraits: [{ id: "kaiser", pos: "right", expr: "smirk" }], text: "Isagi, was it? You're just a clown in my show." },
    { bg: "stadium", speaker: "nagi", name: "Nagi Seishiro", portraits: [{ id: "nagi", pos: "right" }, { id: "isagi", pos: "left" }], text: "Isagi. This time I'm the one who's going to win." },
  ],
  c4_manshine_after: [
    { bg: "stadium", speaker: "isagi", name: "Isagi Yoichi", portraits: [{ id: "isagi", pos: "left", expr: "ego" }], text: "My value just went up. PXG is next — Rin won't wait.", fx: ["speedlines"] },
  ],
  c4_pxg: [
    { bg: "night", title: "PARIS X GEN", text: "Two demons. One locker room. Zero mercy.", fx: ["flash", "glitch"] },
    { bg: "stadium", speaker: "rin", name: "Itoshi Rin", portraits: [{ id: "rin", pos: "right", expr: "ego" }], text: "Bastard München. I'll erase every formula you've built.", fx: ["chains"] },
    { bg: "stadium", speaker: "shidou", name: "Shidou Ryusei", portraits: [{ id: "shidou", pos: "right", expr: "smirk" }], text: "Midair fireworks! Don't blink, little egoists!", fx: ["impact", "shake"] },
    { bg: "stadium", speaker: "kaiser", name: "Michael Kaiser", portraits: [{ id: "kaiser", pos: "left", expr: "smirk" }, { id: "isagi", pos: "right" }], text: "Clown. Try to keep up with an emperor for once." },
  ],
  c4_pxg_after: [
    { bg: "stadium", speaker: "isagi", name: "Isagi Yoichi", portraits: [{ id: "isagi", pos: "left", expr: "ego" }], text: "Metavision sharper. Heart louder. Next is everyone at once.", fx: ["metavision"] },
  ],
  c4_kaiser: [
    { bg: "crimson", speaker: "kaiser", name: "Michael Kaiser", portraits: [{ id: "kaiser", pos: "right", expr: "ego" }], text: "Kneel. A world-class team, assembled to bury you.", fx: ["chains", "shake"] },
    { bg: "crimson", speaker: "rin", name: "Itoshi Rin", portraits: [{ id: "rin", pos: "right", expr: "ego" }], text: "Isagi. I'll destroy you myself.", fx: ["glitch"] },
    { bg: "crimson", speaker: "isagi", name: "Isagi Yoichi", portraits: [{ id: "isagi", pos: "left", expr: "ego" }], text: "Then I'll devour all of you. I'm going to be the world's number one striker.", fx: ["metavision", "speedlines", "impact"] },
  ],
  c4_kaiser_after: [
    { bg: "void", title: "WORLD'S #1", text: "The egoist who devoured the league.", fx: ["flash", "speedlines"] },
    { bg: "monitor", speaker: "ego", name: "Ego Jinpachi", portraits: [{ id: "ego", pos: "center", expr: "smirk" }], text: "Japan was the lab. The world is the exam. Don't stagnate." },
  ],
  c5_opener: [
    { bg: "stadium", title: "U-20 WORLD CUP", text: "Flags. Cameras. Predators from every continent.", fx: ["flash"] },
    { bg: "stadium", speaker: "ego", name: "Ego Jinpachi", portraits: [{ id: "ego", pos: "center" }], text: "Win ugly. Win beautiful. Just win — Japan is watching live." },
    { bg: "stadium", speaker: "isagi", name: "Isagi Yoichi", portraits: [{ id: "isagi", pos: "left", expr: "ego" }, { id: "rin", pos: "right", expr: "ego" }], text: "No extras. Only the goal.", fx: ["speedlines", "metavision"] },
  ],
  c5_opener_after: [
    { bg: "stadium", speaker: "bachira", name: "Bachira Meguru", portraits: [{ id: "bachira", pos: "right", expr: "smirk" }], text: "The monster's laughing. One more stage — the biggest." },
  ],
  c5_final: [
    { bg: "void", title: "THE FINAL DEVOUR", text: "Every apex egoist. One pitch. No tomorrow.", fx: ["flash", "shake", "glitch"] },
    { bg: "crimson", speaker: "sae", name: "Itoshi Sae", portraits: [{ id: "sae", pos: "right", expr: "ego" }], text: "Prove you're alive. Or join the corpses of Japanese football.", fx: ["chains"] },
    { bg: "stadium", speaker: "isagi", name: "Isagi Yoichi", portraits: [{ id: "isagi", pos: "left", expr: "ego" }], text: "I'm taking the world's number one. Right now.", fx: ["metavision", "speedlines", "impact"] },
  ],
  c5_final_after: [
    { bg: "void", title: "EGOIST", text: "The name on the scoreboard is yours.", fx: ["flash", "speedlines"] },
    { bg: "monitor", speaker: "ego", name: "Ego Jinpachi", portraits: [{ id: "ego", pos: "center", expr: "smirk" }], text: "Good. A striker is never finished — but tonight, the world knows your ego." },
  ],
};

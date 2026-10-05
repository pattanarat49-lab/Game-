// PvP player select, fighting-game style: your pick (1P) on the left, your opponent's (2P) on the
// right, every hero in a grid between them. Both players see each other's cursor move live, then
// press READY; the match starts when everyone is ready.
// PvE Squad uses the same screen with four player slots (1P-4P), a small bot slot at the top centre
// (tap it, then a hero, to choose who the bot plays) and the bot's difficulty under it.

import { BOT_LEVELS, HEROES, HERO_CLASSES, HERO_IDS, HeroId, heroClass, heroOf, heroRatings } from "../../shared/game";
import { heroPortrait, paintPortrait } from "./heroArt";
import { showHeroInfo } from "./heroInfo";

const CSS = `
#lobby { position: fixed; inset: 0; z-index: 20; display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 1.2vh; padding: 8px 12px; box-sizing: border-box; color: #fff;
  font-family: "Press Start 2P", monospace; background: radial-gradient(ellipse at 50% 30%, #1d1a3a 0%, #0a0812 70%); }
#lobby[hidden] { display: none; }
#lobby .title { font-size: clamp(14px, 4.5vh, 30px); color: #b8ff5a; text-shadow: 0 0 10px #7adf5a, 3px 3px 0 #1a3a10; text-align: center; }
#lobby .title small { display: block; font-size: 0.45em; color: #9fd8ff; margin-top: 0.6vh; text-shadow: none; }
#lobby .row { display: flex; align-items: stretch; justify-content: center; gap: 1.5vw; width: 100%; max-width: 1200px; min-height: 0; }
#lobby .side { flex: 0 0 22%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.8vh;
  background: #15121e; border: 3px solid #2a2440; border-radius: 6px; padding: 1vh 0.5vw; min-width: 0; }
#lobby .side .tag { font-size: clamp(18px, 7vh, 46px); font-weight: bold; }
#lobby .p1 .tag { color: #3ad8ff; text-shadow: 3px 3px 0 #0a3a5a; }
#lobby .p2 .tag { color: #ff3a4a; text-shadow: 3px 3px 0 #5a0a14; }
#lobby .side .who { font-size: clamp(7px, 1.6vh, 11px); color: #c9b8c0; text-align: center; overflow-wrap: anywhere; }
#lobby .side canvas { width: min(18vh, 16vw); height: auto; image-rendering: pixelated; }
#lobby .side .hname { font-size: clamp(9px, 2.4vh, 16px); color: #ffd23f; text-align: center; }
#lobby .classes { display: flex; gap: 4px; flex-wrap: wrap; justify-content: center; }
#lobby .classes button { font: inherit; font-size: clamp(6px, 1.4vh, 10px); padding: 0.6vh 0.8vw; cursor: pointer; color: var(--c);
  background: #15121e; border: 2px solid var(--c); border-radius: 4px; }
#lobby .classes button.on { background: var(--c); color: #1a0f14; }
#lobby .tile.off { display: none; }
#lobby .grid { background: #2a2440; align-content: start; }
#lobby .cls { display: inline-block; font-size: 0.7em; padding: 1px 3px; margin-top: 0.4vh; color: #1a0f14; background: var(--c); border-radius: 2px; }
#lobby .side .rates { display: grid; grid-template-columns: auto 1fr auto; gap: 2px 4px; align-items: center; width: 92%;
  font-size: clamp(5px, 1.2vh, 8px); color: #c9b8c0; }
#lobby .side .rates b { height: 5px; background: #ffd23f; border-radius: 2px; }
#lobby .side .rates i { font-style: normal; color: #fff; }
#lobby .col .side .rates { width: 80%; gap: 1px 3px; }
#lobby .side .status { font-size: clamp(7px, 1.8vh, 12px); padding: 0.6vh 0.8vw; border-radius: 4px; background: #2a2440; }
#lobby .side .status:empty { display: none; }
#lobby .side .status.ready { background: #2fae6a; color: #fff; }
#lobby .grid { flex: 1 1 auto; display: grid; grid-template-columns: repeat(8, 1fr); gap: 3px; align-content: center;
  background: #8a8a9a; padding: 3px; border-radius: 4px; max-width: 62vw; }
#lobby .tile { position: relative; background: #1a1622; border: 0; padding: 2px; cursor: pointer; aspect-ratio: 1; min-width: 0;
  display: flex; align-items: center; justify-content: center; }
#lobby .tile canvas { width: 82%; height: auto; image-rendering: pixelated; }
#lobby .tile:hover { background: #2a2440; }
#lobby .tile.me { outline: 3px solid #3ad8ff; outline-offset: -3px; background: #10304a; }
#lobby .tile.foe { outline: 3px solid #ff3a4a; outline-offset: -3px; background: #4a1018; }
#lobby .tile.me.foe { outline-color: #c97aff; background: #3a1a4a; }
#lobby .tile .mark { position: absolute; top: 0; font-size: clamp(6px, 1.4vh, 9px); padding: 1px 2px; }
#lobby .tile .mark.p1 { left: 0; background: #3ad8ff; color: #04202e; }
#lobby .tile .mark.p2 { right: 0; background: #ff3a4a; color: #2e040a; }
#lobby .tile:disabled { cursor: default; }
#lobby .bottom { display: flex; flex-direction: column; align-items: center; gap: 0.8vh; }
#lobby .notice { font-size: clamp(8px, 2vh, 13px); color: #ff8a6a; min-height: 1em; text-align: center; }
#lobby .readyBtn { font: inherit; font-size: clamp(12px, 3.4vh, 20px); padding: 1.2vh 4vw; border: 3px solid #1a0f14; border-radius: 6px;
  background: #ffd23f; color: #1a0f14; cursor: pointer; box-shadow: 0 4px 0 #8a6a10; }
#lobby .readyBtn.cancel { background: #c9b8c0; box-shadow: 0 4px 0 #5a4a50; }
#lobby .hint { font-size: clamp(6px, 1.5vh, 10px); color: #8a7a90; }
#lobby .col { flex: 0 0 18%; display: flex; flex-direction: column; gap: 1vh; min-width: 0; }
#lobby .col .side { flex: 1 1 0; padding: 0.5vh 0.3vw; gap: 0.3vh; }
#lobby .col .side .tag { font-size: clamp(12px, 3.6vh, 26px); }
#lobby .col .side canvas { width: min(9vh, 8vw); }
#lobby .col .side .hname { font-size: clamp(7px, 1.7vh, 12px); }
#lobby .col .side .status { font-size: clamp(6px, 1.4vh, 10px); padding: 0.3vh 0.5vw; }
#lobby .p3 .tag { color: #5aff7a; text-shadow: 3px 3px 0 #0a4a1a; }
#lobby .p4 .tag { color: #ffd23f; text-shadow: 3px 3px 0 #5a4a0a; }
#lobby .side.you { border-color: #ffffff; }
#lobby .tile.p3 { outline: 3px solid #5aff7a; outline-offset: -3px; background: #10401a; }
#lobby .tile.p4 { outline: 3px solid #ffd23f; outline-offset: -3px; background: #403a10; }
#lobby .tile.bot { outline: 3px solid #c97aff; outline-offset: -3px; background: #2a1040; }
#lobby .tile .mark.p3 { left: 0; bottom: 0; top: auto; background: #5aff7a; color: #04200a; }
#lobby .tile .mark.p4 { right: 0; bottom: 0; top: auto; background: #ffd23f; color: #2e2604; }
#lobby .tile .mark.bot { left: 50%; transform: translateX(-50%); background: #c97aff; color: #1a0428; }
#lobby .botbox { display: flex; align-items: center; gap: 1vw; }
#lobby .botslot { font: inherit; display: flex; align-items: center; gap: 0.6vw; padding: 0.4vh 1vw; cursor: pointer; color: #fff;
  background: #1e1430; border: 3px solid #6a4a9a; border-radius: 6px; }
#lobby .botslot.on { border-color: #c97aff; box-shadow: 0 0 10px #c97aff; background: #2a1a44; }
#lobby .botslot canvas { width: min(6vh, 6vw); height: auto; image-rendering: pixelated; }
#lobby .botslot .bt { font-size: clamp(7px, 1.6vh, 11px); text-align: left; line-height: 1.6; }
#lobby .botslot .bt b { color: #c97aff; }
#lobby .levels { display: flex; gap: 3px; }
#lobby .levels button { font: inherit; font-size: clamp(6px, 1.4vh, 10px); padding: 0.7vh 0.6vw; cursor: pointer; border: 2px solid #2a2440;
  border-radius: 4px; background: #15121e; color: #8a7a90; }
#lobby .levels button.on { color: #1a0f14; border-color: #1a0f14; }
#lobby .levels button.on.l0 { background: #5aff7a; }
#lobby .levels button.on.l1 { background: #ffd23f; }
#lobby .levels button.on.l2 { background: #ff8a3a; }
#lobby .levels button.on.l3 { background: #ff3a4a; color: #fff; }
`;

interface Side {
  root: HTMLElement;
  who: HTMLElement;
  art: HTMLCanvasElement;
  hero: HTMLElement;
  status: HTMLElement;
  rates: HTMLElement;
  shown?: string;
}

/** What the lobby can ask the room to do. */
export interface LobbyActions {
  pick: (hero: HeroId) => void;
  setReady: (ready: boolean) => void;
  botHero?: (hero: HeroId) => void;
  botLevel?: (level: number) => void;
}

const SLOT_TAGS = ["1P", "2P", "3P", "4P"];

export class Lobby {
  private root: HTMLElement;
  private tiles = new Map<string, HTMLButtonElement>();
  private p1: Side;
  private p2: Side;
  private slots: Side[] = []; // PvE Squad: 1P, 2P, 3P, 4P
  private readyBtn: HTMLButtonElement;
  private notice: HTMLElement;
  private me?: { hero: string; ready: boolean };
  private pick: (hero: HeroId) => void;
  private setReady: (ready: boolean) => void;
  private pve: boolean;
  private botSlot?: { button: HTMLButtonElement; art: HTMLCanvasElement; name: HTMLElement; shown?: string };
  private levelButtons: HTMLButtonElement[] = [];
  /** PvE: tapping a hero picks it for the bot instead of for me. */
  private botMode = false;

  constructor(private actions: LobbyActions, mode: "pvp" | "pve" = "pvp") {
    this.pick = actions.pick;
    this.setReady = actions.setReady;
    this.pve = mode === "pve";
    if (!document.getElementById("lobby-style")) {
      const style = document.createElement("style");
      style.id = "lobby-style";
      style.textContent = CSS;
      document.head.append(style);
    }
    this.root = document.createElement("div");
    this.root.id = "lobby";
    this.root.hidden = true;
    const sub = this.pve ? "PVE SQUAD - 1 TO 4 PLAYERS VS BOT" : "PVP ARENA - 1 VS 1";
    this.root.innerHTML = `<div class="title">PLAYER SELECT<small>${sub}</small></div><div class="row"></div><div class="bottom"></div>`;
    const row = this.root.querySelector(".row")!;
    // Class filter over the hero grid.
    const classes = document.createElement("div");
    classes.className = "classes";
    for (const c of [{ id: "all", name: "ALL", color: "#ffd23f" }, ...HERO_CLASSES]) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = c.name;
      b.style.setProperty("--c", c.color);
      b.classList.toggle("on", c.id === "all");
      b.addEventListener("click", () => {
        classes.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
        for (const [id, tile] of this.tiles) tile.classList.toggle("off", c.id !== "all" && heroClass(id) !== c.id);
      });
      classes.append(b);
    }
    row.before(classes);
    this.p1 = this.side("p1", "1P");
    if (this.pve) this.buildBotBox();
    const grid = document.createElement("div");
    grid.className = "grid";
    for (const id of HERO_IDS) {
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = "tile";
      tile.title = HEROES[id].name;
      tile.append(heroPortrait(id));
      tile.addEventListener("click", () => {
        if (this.botMode) {
          this.actions.botHero?.(id);
          this.botMode = false;
        } else this.pick(id);
        showHeroInfo(id);
      });
      grid.append(tile);
      this.tiles.set(id, tile);
    }
    this.p2 = this.side("p2", "2P");
    if (this.pve) {
      this.slots = SLOT_TAGS.map((tag, i) => (i === 0 ? this.p1 : i === 1 ? this.p2 : this.side(`p${i + 1}`, tag)));
      const left = document.createElement("div");
      left.className = "col";
      left.append(this.slots[0].root, this.slots[2].root);
      const right = document.createElement("div");
      right.className = "col";
      right.append(this.slots[1].root, this.slots[3].root);
      row.append(left, grid, right);
    } else row.append(this.p1.root, grid, this.p2.root);
    const bottom = this.root.querySelector(".bottom")!;
    this.notice = document.createElement("div");
    this.notice.className = "notice";
    this.readyBtn = document.createElement("button");
    this.readyBtn.type = "button";
    this.readyBtn.className = "readyBtn";
    this.readyBtn.addEventListener("click", () => this.setReady(!this.me?.ready));
    const hint = document.createElement("div");
    hint.className = "hint";
    hint.textContent = this.pve
      ? "Pick a hero, then READY. Tap the BOT slot, then a hero, to choose who the bot plays."
      : "Pick a hero, then press READY. The fight starts when both players are ready.";
    bottom.append(this.notice, this.readyBtn, hint);
    document.body.append(this.root);
  }

  /** PvE: the small bot slot at the top centre, with its difficulty under it. */
  private buildBotBox() {
    const box = document.createElement("div");
    box.className = "botbox";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "botslot";
    button.innerHTML = `<canvas></canvas><div class="bt"><b>BOT</b><br><span></span></div>`;
    button.addEventListener("click", () => (this.botMode = !this.botMode));
    const levels = document.createElement("div");
    levels.className = "levels";
    BOT_LEVELS.forEach((lv, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = `l${i}`;
      b.textContent = lv.name;
      b.addEventListener("click", () => this.actions.botLevel?.(i));
      levels.append(b);
      this.levelButtons.push(b);
    });
    box.append(button, levels);
    this.botSlot = { button, art: button.querySelector("canvas")!, name: button.querySelector("span")! };
    this.root.querySelector(".title")!.after(box);
  }

  private side(cls: string, tag: string): Side {
    const root = document.createElement("div");
    root.className = `side ${cls}`;
    root.innerHTML = `<div class="tag">${tag}</div><div class="who"></div><canvas></canvas><div class="hname"></div><div class="rates"></div><div class="status"></div>`;
    return {
      root,
      who: root.querySelector(".who")!,
      art: root.querySelector("canvas")!,
      hero: root.querySelector(".hname")!,
      status: root.querySelector(".status")!,
      rates: root.querySelector(".rates")!,
    };
  }

  /** Called every frame with the room state: shows the screen during PvP player select. */
  update(state: any, myId: string) {
    const show = (state?.stage === "pvp" || state?.stage === "pve") && state.phase === "select";
    this.root.hidden = !show;
    if (!show) return;
    if (this.pve) return this.updatePve(state, myId);
    const me = state.players.get(myId);
    let foe: any;
    state.players.forEach((p: any, id: string) => {
      if (id !== myId && !p.owner && !foe) foe = p;
    });
    this.me = me ? { hero: me.hero, ready: me.ready } : undefined;
    this.fill(this.p1, me, "");
    this.fill(this.p2, foe, "Waiting for a challenger...");
    for (const [id, tile] of this.tiles) {
      const mine = me?.hero === id;
      const theirs = foe?.hero === id;
      tile.classList.toggle("me", mine);
      tile.classList.toggle("foe", theirs);
      tile.disabled = !!me?.ready;
      const marks = `${mine ? '<span class="mark p1">1P</span>' : ""}${theirs ? '<span class="mark p2">2P</span>' : ""}`;
      if (tile.dataset.marks !== marks) {
        tile.dataset.marks = marks;
        tile.querySelectorAll(".mark").forEach((m) => m.remove());
        tile.insertAdjacentHTML("beforeend", marks);
      }
    }
    const ready = !!me?.ready;
    this.readyBtn.textContent = ready ? "CANCEL READY" : "READY";
    this.readyBtn.classList.toggle("cancel", ready);
    this.notice.textContent = state.notice || (!foe ? "Share the link with a friend to fight." : ready && !foe.ready ? "Waiting for 2P to get ready..." : "");
  }

  /** PvE Squad: four player slots in join order, plus the bot's hero and difficulty. */
  private updatePve(state: any, myId: string) {
    const team: [string, any][] = [];
    state.players.forEach((p: any, id: string) => {
      if (!p.owner && id !== "bot") team.push([id, p]);
    });
    const me = state.players.get(myId);
    this.me = me ? { hero: me.hero, ready: me.ready } : undefined;
    this.slots.forEach((side, i) => {
      const [id, p] = team[i] ?? [];
      this.fill(side, p, i === 0 ? "" : "Open slot");
      side.root.classList.toggle("you", id === myId);
      side.who.textContent = p ? `${p.name}${id === myId ? " (YOU)" : ""}` : "Open slot";
    });
    const botHero = state.botHero || "superman";
    const slot = this.botSlot!;
    if (slot.shown !== botHero) {
      slot.shown = botHero;
      paintPortrait(slot.art, botHero);
      slot.art.style.transform = "scaleX(-1)";
      slot.name.textContent = heroOf(botHero).name;
    }
    slot.button.classList.toggle("on", this.botMode);
    this.levelButtons.forEach((b, i) => b.classList.toggle("on", i === (state.botLevel ?? 2)));
    for (const [id, tile] of this.tiles) {
      const slotsHere = team.map(([, p], i) => (p.hero === id ? i : -1)).filter((i) => i >= 0);
      const bot = botHero === id;
      ["me", "foe", "p3", "p4"].forEach((c, i) => tile.classList.toggle(c, slotsHere.includes(i)));
      tile.classList.toggle("bot", bot);
      tile.disabled = !this.botMode && !!me?.ready;
      const marks = slotsHere.map((i) => `<span class="mark p${i + 1}">${SLOT_TAGS[i]}</span>`).join("") + (bot ? '<span class="mark bot">BOT</span>' : "");
      if (tile.dataset.marks !== marks) {
        tile.dataset.marks = marks;
        tile.querySelectorAll(".mark").forEach((m) => m.remove());
        tile.insertAdjacentHTML("beforeend", marks);
      }
    }
    const ready = !!me?.ready;
    this.readyBtn.textContent = ready ? "CANCEL READY" : "READY";
    this.readyBtn.classList.toggle("cancel", ready);
    const waiting = team.filter(([, p]) => !p.ready).length;
    this.notice.textContent = this.botMode
      ? "Tap a hero for the BOT to play"
      : state.notice || (ready && waiting ? `Waiting for ${waiting} player${waiting > 1 ? "s" : ""} to get ready...` : "");
  }

  private fill(side: Side, p: any, empty: string) {
    side.root.style.opacity = p ? "1" : "0.5";
    side.who.textContent = p ? p.name : empty;
    const hero = p?.hero ?? "";
    if (side.shown !== hero) {
      side.shown = hero;
      if (hero) {
        paintPortrait(side.art, hero);
        if (side.root.classList.contains("p2") || side.root.classList.contains("p4")) side.art.style.transform = "scaleX(-1)"; // 2P faces 1P
      } else {
        side.art.dataset.hero = "";
        side.art.width = 16;
        side.art.height = 18;
      }
      const cls = hero ? HERO_CLASSES.find((c) => c.id === heroClass(hero)) : undefined;
      side.hero.innerHTML = hero ? `${heroOf(hero).name}<br><span class="cls" style="--c:${cls!.color}">${cls!.name}</span>` : "";
      const r = hero ? heroRatings(hero) : undefined;
      side.rates.innerHTML = r
        ? [["HP", r.hp], ["DMG", r.damage], ["ATK SPD", r.speed], ["RANGE", r.range]]
            .map(([k, v]) => `<span>${k}</span><b style="width:${(v as number) * 10}%"></b><i>${v}</i>`)
            .join("")
        : "";
    }
    side.status.textContent = !p ? "" : p.ready ? "READY!" : "PICKING...";
    side.status.classList.toggle("ready", !!p?.ready);
  }

  destroy() {
    this.root.remove();
  }
}

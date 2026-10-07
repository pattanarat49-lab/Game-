// Ranked player select (user request 2026-10-07): everyone presses READY, then the draft. First every
// player bans 3 heroes (all at once, against the clock); then the two sides take turns picking one hero
// each. A banned or already picked hero can't be picked. Tap a hero, then BAN or LOCK IN.

import { DRAFT_BANS, HEROES, HERO_CLASSES, HERO_IDS, HeroId, heroClass, rankTier } from "../../shared/game";
import { heroLocked } from "./account";
import { heroPortrait } from "./heroArt";
import { showHeroInfo } from "./heroInfo";

interface DraftData {
  stage: "ban" | "pick";
  order: string[];
  turn: number;
  bans: Record<string, string[]>;
  picks: Record<string, string>;
}

const CSS = `
#draft { position: fixed; inset: 0; z-index: 20; display: flex; flex-direction: column; align-items: center; gap: 1vh; padding: 8px 12px; box-sizing: border-box;
  color: #fff; font-family: "Press Start 2P", monospace; background: radial-gradient(ellipse at 50% 25%, #2a1630 0%, #0a0812 72%); }
#draft[hidden] { display: none; }
#draft .title { font-size: clamp(14px, 4.2vh, 28px); color: #ffd23f; text-shadow: 0 0 10px #ff9a3a, 3px 3px 0 #5a2a0a; text-align: center; }
#draft .phase { font-size: clamp(8px, 2vh, 13px); color: #9fd8ff; text-align: center; min-height: 1.2em; }
#draft .phase b { color: #ffd23f; font-weight: normal; }
#draft .classes { display: flex; gap: 4px; flex-wrap: wrap; justify-content: center; }
#draft .classes button { font: inherit; font-size: clamp(6px, 1.4vh, 10px); padding: 0.6vh 0.8vw; cursor: pointer; color: var(--c); background: #15121e; border: 2px solid var(--c); border-radius: 4px; }
#draft .classes button.on { background: var(--c); color: #1a0f14; }
#draft .row { display: flex; gap: 1.2vw; width: 100%; max-width: 1200px; flex: 1 1 0; min-height: 0; }
#draft .col { flex: 0 0 19%; display: flex; flex-direction: column; gap: 0.8vh; min-width: 0; }
#draft .card { flex: 1 1 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5vh; padding: 0.5vh 0.4vw;
  background: #15121e; border: 3px solid #2a2440; border-radius: 6px; min-height: 0; }
#draft .col.a .card { border-color: #1a3a6a; }
#draft .col.b .card { border-color: #6a1a24; }
#draft .card.turn { border-color: #ffd23f !important; box-shadow: 0 0 12px #ffd23f; }
#draft .card.you .nm { color: #ffd23f; }
#draft .card .nm { font-size: clamp(6px, 1.5vh, 10px); text-align: center; overflow-wrap: anywhere; }
#draft .card .rk { font-size: clamp(5px, 1.2vh, 8px); }
#draft .card .pk { width: min(9vh, 8vw); aspect-ratio: 8 / 9; display: flex; align-items: center; justify-content: center; background: #0a0812; border-radius: 4px;
  font-size: clamp(10px, 3vh, 20px); color: #4a4060; }
#draft .card .pk canvas { width: 100%; image-rendering: pixelated; }
#draft .card .bans { display: flex; gap: 2px; }
#draft .card .bans span { position: relative; width: min(3.6vh, 3.4vw); aspect-ratio: 8 / 9; background: #0a0812; border-radius: 2px; overflow: hidden; }
#draft .card .bans canvas { width: 100%; image-rendering: pixelated; filter: grayscale(1) brightness(0.6); }
#draft .card .bans span.x::after, #draft .tile.banned::after { content: ""; position: absolute; inset: 0;
  background: linear-gradient(45deg, transparent 44%, #ff3a4a 44% 56%, transparent 56%), linear-gradient(-45deg, transparent 44%, #ff3a4a 44% 56%, transparent 56%); }
#draft .grid { flex: 1 1 auto; display: grid; grid-template-columns: repeat(8, 1fr); gap: 3px; align-content: start; background: #2a2440; padding: 3px; border-radius: 4px;
  min-height: 0; overflow-y: auto; overscroll-behavior: contain; touch-action: pan-y; }
#draft .tile { position: relative; background: #1a1622; border: 0; padding: 2px; cursor: pointer; aspect-ratio: 1; min-width: 0; display: flex; align-items: center; justify-content: center; }
#draft .tile canvas { width: 82%; image-rendering: pixelated; }
#draft .tile.off { display: none; }
#draft .tile.sel { outline: 3px solid #ffd23f; outline-offset: -3px; background: #4a3a10; }
#draft .tile.banned canvas, #draft .tile.picked canvas, #draft .tile.locked canvas { filter: grayscale(1) brightness(0.4); }
#draft .tile.picked::after { content: "PICKED"; position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); font-size: clamp(5px, 1.1vh, 7px); color: #9fd8ff; background: #000b; padding: 2px; }
#draft .tile.locked::after { content: "LOCK"; position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); font-size: clamp(5px, 1.1vh, 7px); color: #ffd23f; background: #000b; padding: 2px; }
#draft .bottom { display: flex; align-items: center; gap: 2vw; }
#draft .go { font: inherit; font-size: clamp(11px, 3vh, 18px); padding: 1.2vh 3.5vw; border: 3px solid #1a0f14; border-radius: 6px; cursor: pointer; background: #ffd23f; color: #1a0f14; box-shadow: 0 4px 0 #8a6a10; }
#draft .go.ban { background: #ff5a6a; box-shadow: 0 4px 0 #8a1a2a; color: #fff; }
#draft .go:disabled { opacity: 0.4; cursor: default; }
#draft .clock { font-size: clamp(14px, 4vh, 26px); color: #fff; min-width: 2.5em; text-align: center; }
#draft .note { font-size: clamp(6px, 1.5vh, 10px); color: #ff8a6a; text-align: center; min-height: 1em; }
`;

export interface DraftActions {
  ban(hero: string): void;
  pick(hero: string): void;
  setReady(ready: boolean): void;
}

interface Card {
  root: HTMLElement;
  name: HTMLElement;
  rank: HTMLElement;
  pick: HTMLElement;
  bans: HTMLElement;
  shown: string;
  shownBans: string;
}

export class DraftScreen {
  private root: HTMLElement;
  private phase: HTMLElement;
  private cols: HTMLElement[];
  private cards = new Map<string, Card>();
  private tiles = new Map<string, HTMLButtonElement>();
  private go: HTMLButtonElement;
  private clock: HTMLElement;
  private note: HTMLElement;
  private selected = "";
  private mode: "ban" | "pick" | "ready" | "wait" = "wait";
  private ready = false;

  constructor(private actions: DraftActions, private size: 1 | 3, private myRank: () => number | undefined) {
    if (!document.getElementById("draft-css")) {
      const s = document.createElement("style");
      s.id = "draft-css";
      s.textContent = CSS;
      document.head.append(s);
    }
    this.root = document.createElement("div");
    this.root.id = "draft";
    this.root.hidden = true;
    this.root.innerHTML = `<div class="title">RANKED ${size}V${size}</div><div class="phase"></div><div class="classes"></div><div class="row"></div><div class="note"></div><div class="bottom"></div>`;
    this.phase = this.root.querySelector(".phase")!;
    this.note = this.root.querySelector(".note")!;
    const classes = this.root.querySelector(".classes")!;
    for (const c of [{ id: "all", name: "ALL", color: "#ffd23f" }, ...HERO_CLASSES]) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = c.name;
      b.style.setProperty("--c", c.color);
      b.classList.toggle("on", c.id === "all");
      b.addEventListener("click", () => {
        classes.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
        for (const [id, t] of this.tiles) t.classList.toggle("off", c.id !== "all" && heroClass(id) !== c.id);
      });
      classes.append(b);
    }
    const row = this.root.querySelector(".row")!;
    this.cols = ["a", "b"].map((k) => {
      const col = document.createElement("div");
      col.className = `col ${k}`;
      return col;
    });
    const grid = document.createElement("div");
    grid.className = "grid";
    for (const id of HERO_IDS) {
      const t = document.createElement("button");
      t.type = "button";
      t.className = "tile";
      t.title = HEROES[id].name;
      t.append(heroPortrait(id));
      t.addEventListener("click", () => {
        if (t.classList.contains("banned") || t.classList.contains("picked")) return;
        if (this.mode === "pick" && heroLocked(id)) return void showHeroInfo(id);
        this.selected = this.selected === id ? "" : id;
        for (const [hid, x] of this.tiles) x.classList.toggle("sel", hid === this.selected);
      });
      t.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        showHeroInfo(id as HeroId);
      });
      grid.append(t);
      this.tiles.set(id, t);
    }
    row.append(this.cols[0], grid, this.cols[1]);
    const bottom = this.root.querySelector(".bottom")!;
    this.clock = document.createElement("div");
    this.clock.className = "clock";
    this.go = document.createElement("button");
    this.go.type = "button";
    this.go.className = "go";
    this.go.addEventListener("click", () => {
      if (this.mode === "ready") return this.actions.setReady(!this.ready);
      if (!this.selected) return;
      if (this.mode === "ban") this.actions.ban(this.selected);
      if (this.mode === "pick") this.actions.pick(this.selected);
      this.selected = "";
      for (const x of this.tiles.values()) x.classList.remove("sel");
    });
    bottom.append(this.clock, this.go);
    document.body.append(this.root);
  }

  private card(id: string): Card {
    let c = this.cards.get(id);
    if (!c) {
      const root = document.createElement("div");
      root.className = "card";
      root.innerHTML = `<div class="nm"></div><div class="rk"></div><div class="pk">?</div><div class="bans"></div>`;
      c = { root, name: root.querySelector(".nm")!, rank: root.querySelector(".rk")!, pick: root.querySelector(".pk")!, bans: root.querySelector(".bans")!, shown: "", shownBans: "" };
      this.cards.set(id, c);
    }
    return c;
  }

  update(state: any, myId: string) {
    const show = !!state?.ranked && (state.phase === "select" || state.phase === "draft");
    this.root.hidden = !show;
    if (!show) return;
    let d: DraftData | undefined;
    try {
      d = state.draft ? (JSON.parse(state.draft) as DraftData) : undefined;
    } catch {
      d = undefined;
    }
    // The two sides: by team in 3v3; in 1v1 the first and second player.
    const sides: [string, any][][] = [[], []];
    state.players.forEach((p: any, id: string) => {
      if (p.owner) return;
      const s = this.size === 3 ? (p.team === 2 ? 1 : 0) : d ? (d.order.indexOf(id) % 2 === 1 ? 1 : 0) : sides[0].length ? 1 : 0;
      sides[s].push([id, p]);
    });
    const me = state.players.get(myId);
    const used = new Set<string>();
    sides.forEach((list, s) => {
      const col = this.cols[s];
      list.forEach(([id, p], i) => {
        used.add(id);
        const c = this.card(id);
        if (col.children[i] !== c.root) col.insertBefore(c.root, col.children[i] ?? null);
        const nm = `${p.name}${id === myId ? " (YOU)" : ""}`;
        if (c.name.textContent !== nm) c.name.textContent = nm;
        c.root.classList.toggle("you", id === myId);
        c.root.classList.toggle("turn", !!d && d.stage === "pick" && d.order[d.turn] === id);
        const r = id === myId ? this.myRank() : undefined;
        const tier = r === undefined ? undefined : rankTier(r);
        c.rank.textContent = tier ? `${tier.name.toUpperCase()} ${r} RP` : id.startsWith("bot") ? "BOT" : "";
        c.rank.style.color = tier?.color ?? "#8a7a90";
        const picked = d?.picks[id] ?? "";
        const placeholder = state.phase === "select" ? (p.ready ? "OK" : "...") : "?";
        const key = picked || placeholder;
        if (c.shown !== key) {
          c.shown = key;
          c.pick.innerHTML = "";
          if (picked) c.pick.append(heroPortrait(picked));
          else c.pick.textContent = placeholder;
        }
        const bans = (d?.bans[id] ?? []).join(",");
        if (c.shownBans !== bans || !c.bans.children.length) {
          c.shownBans = bans;
          c.bans.innerHTML = "";
          for (let k = 0; k < (id.startsWith("bot") ? 0 : DRAFT_BANS); k++) {
            const span = document.createElement("span");
            const h = d?.bans[id]?.[k];
            if (h) {
              span.className = "x";
              span.append(heroPortrait(h));
            }
            c.bans.append(span);
          }
        }
      });
    });
    for (const [id, c] of this.cards) if (!used.has(id)) (c.root.remove(), this.cards.delete(id));

    // The hero grid: banned and picked heroes are out.
    const banned = new Set(Object.values(d?.bans ?? {}).flat());
    const picked = new Set(Object.values(d?.picks ?? {}));
    for (const [id, t] of this.tiles) {
      t.classList.toggle("banned", banned.has(id));
      t.classList.toggle("picked", picked.has(id));
      t.classList.toggle("locked", d?.stage === "pick" && heroLocked(id));
      if ((banned.has(id) || picked.has(id)) && this.selected === id) {
        this.selected = "";
        t.classList.remove("sel");
      }
    }

    // What we can do now.
    const left = Math.ceil(state.draftTimer ?? 0);
    this.ready = !!me?.ready;
    if (!d) {
      this.mode = "ready";
      const need = this.size === 3 ? "one player on each side" : "2 players";
      const count = sides[0].length + sides[1].length;
      this.phase.innerHTML = `Waiting for players <b>${count}/${this.size * 2}</b> · starts with ${need}, all READY`;
      this.go.textContent = this.ready ? "CANCEL READY" : "READY";
      this.go.className = "go";
      this.go.disabled = false;
      this.clock.textContent = "";
      this.note.textContent = state.notice || (this.size === 3 ? "Empty seats are filled by bots when the draft starts." : "");
      return;
    }
    this.clock.textContent = String(left);
    if (d.stage === "ban") {
      const mine = d.bans[myId]?.length ?? 0;
      this.mode = mine < DRAFT_BANS ? "ban" : "wait";
      this.phase.innerHTML = `BAN PHASE · everyone bans <b>${DRAFT_BANS}</b> heroes`;
      this.go.textContent = mine < DRAFT_BANS ? `BAN (${mine}/${DRAFT_BANS})` : "BANS DONE";
      this.go.className = "go ban";
      this.go.disabled = mine >= DRAFT_BANS;
      this.note.textContent = mine < DRAFT_BANS ? "Tap a hero, then BAN" : "Waiting for the others to ban...";
    } else {
      const turn = d.order[d.turn];
      const mine = turn === myId;
      this.mode = mine ? "pick" : "wait";
      this.phase.innerHTML = mine ? "<b>YOUR PICK</b> · tap a hero, then LOCK IN" : `PICK PHASE · <b>${state.players.get(turn)?.name ?? ""}</b> is picking`;
      this.go.textContent = "LOCK IN";
      this.go.className = "go";
      this.go.disabled = !mine;
      this.note.textContent = mine && left <= 5 ? "Hurry! A random hero is picked when time runs out" : "";
    }
  }

  destroy() {
    this.root.remove();
  }
}

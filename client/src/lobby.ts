// PvP player select, fighting-game style: your pick (1P) on the left, your opponent's (2P) on the
// right, every hero in a grid between them. Both players see each other's cursor move live, then
// press READY; the match starts when everyone is ready.

import { HEROES, HERO_IDS, HeroId, heroOf } from "../../shared/game";
import { HERO_SPRITES, renderPixelSprite } from "./art";

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
`;

interface Side {
  root: HTMLElement;
  who: HTMLElement;
  art: HTMLCanvasElement;
  hero: HTMLElement;
  status: HTMLElement;
  shown?: string;
}

export class Lobby {
  private root: HTMLElement;
  private tiles = new Map<string, HTMLButtonElement>();
  private p1: Side;
  private p2: Side;
  private readyBtn: HTMLButtonElement;
  private notice: HTMLElement;
  private me?: { hero: string; ready: boolean };

  constructor(
    private pick: (hero: HeroId) => void,
    private setReady: (ready: boolean) => void,
  ) {
    if (!document.getElementById("lobby-style")) {
      const style = document.createElement("style");
      style.id = "lobby-style";
      style.textContent = CSS;
      document.head.append(style);
    }
    this.root = document.createElement("div");
    this.root.id = "lobby";
    this.root.hidden = true;
    this.root.innerHTML = `<div class="title">PLAYER SELECT<small>PVP ARENA - 1 VS 1</small></div><div class="row"></div><div class="bottom"></div>`;
    const row = this.root.querySelector(".row")!;
    this.p1 = this.side("p1", "1P");
    const grid = document.createElement("div");
    grid.className = "grid";
    for (const id of HERO_IDS) {
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = "tile";
      tile.title = HEROES[id].name;
      tile.append(renderPixelSprite(HERO_SPRITES[id]));
      tile.addEventListener("click", () => this.pick(id));
      grid.append(tile);
      this.tiles.set(id, tile);
    }
    this.p2 = this.side("p2", "2P");
    row.append(this.p1.root, grid, this.p2.root);
    const bottom = this.root.querySelector(".bottom")!;
    this.notice = document.createElement("div");
    this.notice.className = "notice";
    this.readyBtn = document.createElement("button");
    this.readyBtn.type = "button";
    this.readyBtn.className = "readyBtn";
    this.readyBtn.addEventListener("click", () => this.setReady(!this.me?.ready));
    const hint = document.createElement("div");
    hint.className = "hint";
    hint.textContent = "Pick a hero, then press READY. The fight starts when both players are ready.";
    bottom.append(this.notice, this.readyBtn, hint);
    document.body.append(this.root);
  }

  private side(cls: string, tag: string): Side {
    const root = document.createElement("div");
    root.className = `side ${cls}`;
    root.innerHTML = `<div class="tag">${tag}</div><div class="who"></div><canvas></canvas><div class="hname"></div><div class="status"></div>`;
    return {
      root,
      who: root.querySelector(".who")!,
      art: root.querySelector("canvas")!,
      hero: root.querySelector(".hname")!,
      status: root.querySelector(".status")!,
    };
  }

  /** Called every frame with the room state: shows the screen during PvP player select. */
  update(state: any, myId: string) {
    const show = state?.stage === "pvp" && state.phase === "select";
    this.root.hidden = !show;
    if (!show) return;
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

  private fill(side: Side, p: any, empty: string) {
    side.root.style.opacity = p ? "1" : "0.5";
    side.who.textContent = p ? p.name : empty;
    const hero = p?.hero ?? "";
    if (side.shown !== hero) {
      side.shown = hero;
      const ctx = side.art.getContext("2d")!;
      if (hero) {
        const sprite = renderPixelSprite(HERO_SPRITES[hero]);
        side.art.width = sprite.width;
        side.art.height = sprite.height;
        ctx.drawImage(sprite, 0, 0);
        if (side.root.classList.contains("p2")) side.art.style.transform = "scaleX(-1)"; // 2P faces 1P
      } else {
        side.art.width = 16;
        side.art.height = 18;
      }
      side.hero.textContent = hero ? heroOf(hero).name : "";
    }
    side.status.textContent = !p ? "" : p.ready ? "READY!" : "PICKING...";
    side.status.classList.toggle("ready", !!p?.ready);
  }

  destroy() {
    this.root.remove();
  }
}

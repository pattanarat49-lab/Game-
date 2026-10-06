// Open World screens (2026-10-06): the chat, the dungeon portal's READY panel, a player's profile
// with their record and a duel button, and the duel request popup. Plain HTML over the game.

import { heroOf } from "../../shared/game";
import { heroPortrait } from "./heroArt";
import { Stats, parseStats } from "./stats";

export interface WorldUiActions {
  chat(text: string): void;
  ready(ready: boolean): void;
  duel(id: string): void;
  answer(from: string, ok: boolean): void;
}

const CSS = `
#wu { position: fixed; inset: 0; pointer-events: none; z-index: 20; font-family: "Press Start 2P", monospace; color: #fff; }
#wu button { pointer-events: auto; font: inherit; cursor: pointer; }
#wu-chat { position: absolute; left: 10px; bottom: 54px; width: min(46vw, 420px); }
#wu-log { display: flex; flex-direction: column; gap: 3px; font-size: 9px; line-height: 1.5; }
#wu-log div { background: rgba(10, 6, 14, 0.62); padding: 3px 6px; border-radius: 3px; transition: opacity 1s; word-break: break-word; }
#wu-log b { color: #ffd23f; font-weight: normal; }
#wu-log .me b { color: #7dff8a; }
#wu-row { display: none; gap: 4px; margin-top: 5px; pointer-events: auto; }
#wu-row.open { display: flex; }
#wu-input { flex: 1; font: inherit; font-size: 10px; padding: 7px; background: #1a1220; color: #fff; border: 2px solid #6b5842; border-radius: 3px; min-width: 0; }
#wu-send, #wu-chatbtn { background: #2fae6a; color: #fff; border: 2px solid #1d7a48; border-radius: 3px; padding: 6px 9px; font-size: 9px; }
#wu-chatbtn { position: absolute; left: 10px; bottom: 16px; pointer-events: auto; }
#wu-portal { position: absolute; left: 50%; top: 70px; transform: translateX(-50%); background: rgba(14, 10, 30, 0.88); border: 2px solid #5a8aff; border-radius: 6px; padding: 10px 14px; text-align: center; font-size: 10px; display: none; pointer-events: auto; }
#wu-portal.show { display: block; }
#wu-portal .t { color: #8ab4ff; margin-bottom: 6px; }
#wu-portal .n { font-size: 8px; color: #c9b8c0; margin-bottom: 8px; line-height: 1.6; }
#wu-portal button { background: #ffd23f; color: #1a1220; border: 2px solid #b8901a; border-radius: 3px; padding: 7px 16px; font-size: 10px; }
#wu-portal button.on { background: #7a6a8a; color: #fff; border-color: #4a3e56; }
.wu-modal { position: absolute; inset: 0; display: none; align-items: center; justify-content: center; background: rgba(0,0,0,0.45); pointer-events: auto; }
.wu-modal.show { display: flex; }
.wu-card { background: #1e1626; border: 3px solid #6b5842; border-radius: 6px; padding: 14px; width: min(86vw, 340px); max-height: 86vh; overflow-y: auto; font-size: 9px; line-height: 1.7; }
.wu-card h3 { margin: 0 0 6px; font-size: 12px; color: #ffd23f; font-weight: normal; }
.wu-card .hero { display: flex; gap: 10px; align-items: center; margin-bottom: 8px; color: #c9b8c0; }
.wu-card .hero canvas { width: 40px; height: 45px; image-rendering: pixelated; }
.wu-card .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 10px; margin: 8px 0; }
.wu-card .grid span:nth-child(odd) { color: #c9b8c0; }
.wu-card ul { list-style: none; padding: 0; margin: 4px 0 10px; }
.wu-card li { padding: 2px 0; border-bottom: 1px solid #2e2438; }
.wu-card .w { color: #7dff8a; } .wu-card .l { color: #ff6a6a; } .wu-card .d { color: #ffd23f; }
.wu-card .btns { display: flex; gap: 6px; justify-content: flex-end; }
.wu-card .btns button { padding: 7px 10px; font-size: 9px; border-radius: 3px; border: 2px solid #4a3e56; background: #3a2e46; color: #fff; }
.wu-card .btns button.go { background: #e8483a; border-color: #a82a20; }
.wu-card .btns button.ok { background: #2fae6a; border-color: #1d7a48; }
#wu-toast { position: absolute; left: 50%; top: 20%; transform: translateX(-50%); background: rgba(10,6,14,0.85); padding: 8px 12px; border-radius: 4px; font-size: 10px; display: none; }
#wu-toast.show { display: block; }
`;

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export class WorldUi {
  private root: HTMLDivElement;
  private log: HTMLDivElement;
  private row: HTMLDivElement;
  private input: HTMLInputElement;
  private portal: HTMLDivElement;
  private portalBtn: HTMLButtonElement;
  private profile: HTMLDivElement;
  private duelBox: HTMLDivElement;
  private toastEl: HTMLDivElement;
  private toastTimer = 0;
  private meReady = false;
  private keyHandler: (e: KeyboardEvent) => void;

  constructor(private act: WorldUiActions, private typing: (on: boolean) => void, chat = true) {
    if (!document.getElementById("wu-css")) {
      const style = document.createElement("style");
      style.id = "wu-css";
      style.textContent = CSS;
      document.head.append(style);
    }
    this.root = document.createElement("div");
    this.root.id = "wu";
    this.root.innerHTML = `
      <div id="wu-chat"><div id="wu-log"></div><div id="wu-row"><input id="wu-input" maxlength="120" placeholder="Say something..." autocomplete="off" /><button id="wu-send">SEND</button></div></div>
      <button id="wu-chatbtn">CHAT</button>
      <div id="wu-portal"><div class="t">DUNGEON PORTAL</div><div class="n"></div><button>READY</button></div>
      <div class="wu-modal" id="wu-profile"><div class="wu-card"></div></div>
      <div class="wu-modal" id="wu-duel"><div class="wu-card"></div></div>
      <div id="wu-toast"></div>`;
    document.body.append(this.root);
    this.log = this.root.querySelector("#wu-log")!;
    this.row = this.root.querySelector("#wu-row")!;
    this.input = this.root.querySelector("#wu-input")!;
    this.portal = this.root.querySelector("#wu-portal")!;
    this.portalBtn = this.portal.querySelector("button")!;
    this.profile = this.root.querySelector("#wu-profile")!;
    this.duelBox = this.root.querySelector("#wu-duel")!;
    this.toastEl = this.root.querySelector("#wu-toast")!;
    if (!chat) (this.root.querySelector("#wu-chat") as HTMLElement).style.display = (this.root.querySelector("#wu-chatbtn") as HTMLElement).style.display = "none";

    const send = () => {
      const text = this.input.value.trim();
      if (text) this.act.chat(text);
      this.input.value = "";
      this.closeChat();
    };
    this.root.querySelector("#wu-send")!.addEventListener("click", send);
    this.input.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter") send();
      if (e.key === "Escape") this.closeChat();
    });
    this.input.addEventListener("focus", () => this.typing(true));
    this.input.addEventListener("blur", () => this.typing(false));
    this.root.querySelector("#wu-chatbtn")!.addEventListener("click", () => (this.row.classList.contains("open") ? this.closeChat() : this.openChat()));
    this.portalBtn.addEventListener("click", () => this.act.ready(!this.meReady));
    // Enter opens the chat on a keyboard.
    this.keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && document.activeElement !== this.input && chat) {
        e.preventDefault();
        this.openChat();
      }
    };
    window.addEventListener("keydown", this.keyHandler);
    for (const m of [this.profile, this.duelBox]) m.addEventListener("click", (e) => e.target === m && m.classList.remove("show"));
  }

  private openChat() {
    this.row.classList.add("open");
    this.input.focus();
    for (const d of Array.from(this.log.children) as HTMLElement[]) d.style.opacity = "1";
  }

  private closeChat() {
    this.row.classList.remove("open");
    this.input.blur();
  }

  addChat(name: string, text: string, mine: boolean) {
    const line = document.createElement("div");
    if (mine) line.className = "me";
    line.innerHTML = `<b>${esc(name)}:</b> ${esc(text)}`;
    this.log.append(line);
    while (this.log.children.length > 7) this.log.firstElementChild!.remove();
    setTimeout(() => {
      if (!this.row.classList.contains("open")) line.style.opacity = "0.25";
    }, 12000);
  }

  /** The portal panel: shown while standing at the portal. */
  setPortal(show: boolean, here: number, ready: number, meReady: boolean, notice: string) {
    this.portal.classList.toggle("show", show);
    if (!show) return;
    this.meReady = meReady;
    this.portal.querySelector(".n")!.innerHTML = notice
      ? esc(notice)
      : `${here} hero${here === 1 ? "" : "es"} at the portal &middot; ${ready} ready<br>Everyone here presses READY to go in together`;
    this.portalBtn.textContent = meReady ? "CANCEL" : "READY";
    this.portalBtn.classList.toggle("on", meReady);
  }

  showProfile(id: string, name: string, hero: string, statsJson: string, isMe: boolean) {
    const s: Stats = parseStats(statsJson) ?? { games: 0, wins: 0, losses: 0, dungeons: 0, recent: [] };
    const rate = s.wins + s.losses ? Math.round((s.wins / (s.wins + s.losses)) * 100) : 0;
    const card = this.profile.querySelector(".wu-card")!;
    card.innerHTML = `
      <h3>${esc(name)}${isMe ? " (YOU)" : ""}</h3>
      <div class="hero"><span class="art"></span><span>Playing<br>${esc(heroOf(hero).name)}</span></div>
      <div class="grid"><span>GAMES</span><span>${s.games}</span><span>WINS</span><span class="w">${s.wins}</span><span>LOSSES</span><span class="l">${s.losses}</span><span>WIN RATE</span><span>${rate}%</span><span>DUNGEONS</span><span>${s.dungeons}</span></div>
      <div>RECENT GAMES</div>
      <ul>${s.recent.length ? s.recent.map((r) => `<li><span class="${r.won === true ? "w" : r.won === false ? "l" : "d"}">${r.won === true ? "WIN " : r.won === false ? "LOSS" : "DRAW"}</span> ${esc(r.mode)} &middot; ${esc(r.hero)}</li>`).join("") : "<li>No games yet</li>"}</ul>
      <div class="btns">${isMe ? "" : '<button class="go">REQUEST DUEL</button>'}<button class="x">CLOSE</button></div>`;
    card.querySelector(".art")!.append(heroPortrait(hero));
    card.querySelector(".x")!.addEventListener("click", () => this.profile.classList.remove("show"));
    card.querySelector(".go")?.addEventListener("click", () => {
      this.act.duel(id);
      this.profile.classList.remove("show");
      this.toast(`Duel request sent to ${name}`);
    });
    this.profile.classList.add("show");
  }

  duelRequest(from: string, name: string, hero: string) {
    const card = this.duelBox.querySelector(".wu-card")!;
    card.innerHTML = `<h3>DUEL!</h3><p>${esc(name)} (${esc(heroOf(hero).name)}) challenges you to a 1v1 in the PvP Arena.</p><div class="btns"><button class="x">NO THANKS</button><button class="ok">ACCEPT</button></div>`;
    card.querySelector(".x")!.addEventListener("click", () => {
      this.act.answer(from, false);
      this.duelBox.classList.remove("show");
    });
    card.querySelector(".ok")!.addEventListener("click", () => {
      this.act.answer(from, true);
      this.duelBox.classList.remove("show");
    });
    this.duelBox.classList.add("show");
  }

  toast(text: string) {
    this.toastEl.textContent = text;
    this.toastEl.classList.add("show");
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toastEl.classList.remove("show"), 2600);
  }

  destroy() {
    window.removeEventListener("keydown", this.keyHandler);
    this.typing(false);
    this.root.remove();
  }
}

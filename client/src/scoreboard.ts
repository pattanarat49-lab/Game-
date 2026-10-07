// The end-of-match scores (user request 2026-10-07): every hero's KOs, assists, falls and damage, a
// score from 1.0 to 10.0, and an MVP on the winning side and on the losing side.

import { HEROES, HeroId } from "../../shared/game";
import { heroPortrait } from "./heroArt";

export interface ScoreRow {
  id: string;
  name: string;
  hero: string;
  won: boolean;
  side: number; // rows are grouped by side (team, or each player alone)
  sideName: string;
  kos: number;
  assists: number;
  falls: number;
  dealt: number;
  taken: number;
  rating: number;
  mvp: boolean;
}

const CSS = `
#scoreboard { position: fixed; inset: 0; z-index: 40; display: flex; align-items: center; justify-content: center; padding: 12px; box-sizing: border-box;
  background: rgba(6, 8, 20, 0.72); font-family: "Press Start 2P", monospace; color: #fff; }
#scoreboard .box { width: min(100%, 720px); max-height: 100%; overflow-y: auto; background: #141a30; border: 4px solid #4a5a8a; border-radius: 10px; padding: 14px; box-sizing: border-box;
  display: flex; flex-direction: column; gap: 10px; }
#scoreboard h2 { margin: 0; text-align: center; font-size: clamp(16px, 4vw, 26px); font-weight: normal; }
#scoreboard h2.win { color: #ffd23f; text-shadow: 0 3px 0 #8a5a12; }
#scoreboard h2.lose { color: #ff7a8a; text-shadow: 0 3px 0 #6a1a2a; }
#scoreboard .side { font-size: 9px; color: #8ad8ff; margin-top: 4px; }
#scoreboard .row { display: grid; grid-template-columns: 40px minmax(0, 1fr) 76px 64px 58px; align-items: center; gap: 8px; padding: 6px; border-radius: 6px; background: #1c2442; font-size: 9px; }
#scoreboard .row.me { outline: 2px solid #ffd23f; }
#scoreboard .row canvas { width: 36px; height: 36px; image-rendering: pixelated; object-fit: contain; }
#scoreboard .who { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
#scoreboard .who b { font-weight: normal; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#scoreboard .who i { font-style: normal; color: #9aa4c8; font-size: 7px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#scoreboard .kda, #scoreboard .dmg { text-align: center; line-height: 1.6; color: #c8cce0; font-variant-numeric: tabular-nums; }
#scoreboard .kda small, #scoreboard .dmg small { display: block; font-size: 6px; color: #7a84a8; }
#scoreboard .score { text-align: center; font-size: 15px; color: #fff; }
#scoreboard .mvp { display: inline-block; margin-top: 3px; font-size: 7px; padding: 2px 4px; border-radius: 3px; color: #1a1220; background: #ffd23f; }
#scoreboard .mvp.lose { background: #c8d0e0; }
#scoreboard .ok { align-self: center; font: inherit; font-size: 11px; padding: 10px 26px; color: #1a1220; background: #ffd23f; border: 3px solid #8a5a12; border-radius: 6px; cursor: pointer; }
@media (max-width: 480px) { #scoreboard .row { grid-template-columns: 32px minmax(0, 1fr) 60px 50px 44px; gap: 5px; font-size: 8px; } #scoreboard .row canvas { width: 30px; height: 30px; } }
`;

let open: HTMLDivElement | undefined;

export function closeScoreboard() {
  open?.remove();
  open = undefined;
}

/** `outcome` is the big line at the top (VICTORY, DEFEAT, DRAW). */
export function showScoreboard(rows: ScoreRow[], myId: string, outcome: "VICTORY" | "DEFEAT" | "DRAW") {
  closeScoreboard();
  if (!document.getElementById("scoreboard-css")) {
    const s = document.createElement("style");
    s.id = "scoreboard-css";
    s.textContent = CSS;
    document.head.append(s);
  }
  const el = document.createElement("div");
  el.id = "scoreboard";
  const box = document.createElement("div");
  box.className = "box";
  box.innerHTML = `<h2 class="${outcome === "VICTORY" ? "win" : "lose"}">${outcome}</h2>`;
  // Winners first, then by score.
  const sides = [...new Set(rows.map((r) => r.side))].sort((a, b) => {
    const ra = rows.find((r) => r.side === a)!;
    const rb = rows.find((r) => r.side === b)!;
    return Number(rb.won) - Number(ra.won);
  });
  for (const side of sides) {
    const list = rows.filter((r) => r.side === side).sort((a, b) => b.rating - a.rating);
    const head = document.createElement("div");
    head.className = "side";
    head.textContent = `${list[0].sideName}${list[0].won ? "  WIN" : ""}`;
    box.append(head);
    for (const r of list) {
      const row = document.createElement("div");
      row.className = `row${r.id === myId ? " me" : ""}`;
      row.append(heroPortrait(r.hero as HeroId));
      const who = document.createElement("div");
      who.className = "who";
      who.innerHTML = `<b></b><i></i>`;
      who.querySelector("b")!.textContent = r.name;
      who.querySelector("i")!.textContent = HEROES[r.hero as HeroId]?.name ?? r.hero;
      row.append(who);
      row.insertAdjacentHTML(
        "beforeend",
        `<div class="kda">${r.kos} / ${r.assists} / ${r.falls}<small>KO / AS / FALL</small></div>
         <div class="dmg">${Math.round(r.dealt)}<small>DAMAGE</small></div>
         <div class="score">${r.rating.toFixed(1)}${r.mvp ? `<br><span class="mvp${r.won ? "" : " lose"}">MVP</span>` : ""}</div>`,
      );
      box.append(row);
    }
  }
  const ok = document.createElement("button");
  ok.type = "button";
  ok.className = "ok";
  ok.textContent = "OK";
  ok.addEventListener("click", closeScoreboard);
  box.append(ok);
  el.append(box);
  document.body.append(el);
  open = el;
}

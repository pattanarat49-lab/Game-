// Hero unlocks on screen (2026-10-06): a new player's 3-of-10 starter pick, and the slot machine
// that spends a spin (earned by winning) to unlock a hero they don't have yet.

import { HEROES, HERO_CLASSES, HERO_IDS, heroClass } from "../../shared/game";
import { heroPortrait } from "./heroArt";
import { showHeroInfo } from "./heroInfo";

const CSS = `
.ul-back { position: fixed; inset: 0; z-index: 45; background: #120b0f; display: flex; align-items: safe center; justify-content: center; overflow-y: auto; padding: 14px; box-sizing: border-box;
  font-family: "Press Start 2P", monospace; color: #fff; }
.ul-back.dim { background: rgba(8, 4, 8, 0.95); }
.ul-box { width: min(96vw, 760px); text-align: center; }
.ul-box h2 { font-size: 16px; color: #ffd23f; margin: 0 0 8px; font-weight: normal; }
.ul-box p { font-size: 9px; color: #c9b8c0; line-height: 1.7; margin: 0 0 10px; }
.ul-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin: 8px 0 12px; }
@media (max-width: 560px) { .ul-grid { grid-template-columns: repeat(4, 1fr); } }
.ul-card { position: relative; background: #1e1626; border: 3px solid #3a2e46; border-radius: 6px; padding: 6px 4px; cursor: pointer; color: #fff; font: inherit; }
.ul-card canvas { width: 70%; height: auto; image-rendering: pixelated; display: block; margin: 0 auto 4px; }
.ul-card .ul-n { font-size: 8px; line-height: 1.4; min-height: 2.8em; }
.ul-card .ul-c { font-size: 7px; padding: 2px 4px; border-radius: 2px; color: #120b0f; display: inline-block; margin-top: 3px; }
.ul-card .ul-s { font-size: 8px; color: #ffd23f; margin-top: 3px; }
.ul-card.on { border-color: #7dff8a; background: #173a22; }
.ul-card .ul-i { position: absolute; top: 3px; right: 3px; font: inherit; font-size: 7px; padding: 2px 4px; background: #3a2e46; color: #fff; border: 1px solid #6b5842; border-radius: 2px; cursor: pointer; }
.ul-btn { font: inherit; font-size: 12px; padding: 11px 22px; border-radius: 4px; cursor: pointer; color: #fff; background: #2fae6a; border: 3px solid #1d7a48; }
.ul-btn:disabled { background: #3a2e46; border-color: #4a3e56; color: #8a7a96; cursor: default; }
.ul-btn.alt { background: #3a2e46; border-color: #4a3e56; font-size: 10px; }
.ul-err { color: #ff6a5a; font-size: 9px; min-height: 1.2em; margin: 6px 0; }
.ul-slot { position: relative; height: 92px; overflow: hidden; border: 4px solid #ffd23f; border-radius: 8px; background: #0a0610; margin: 10px auto 12px; width: min(90vw, 560px); box-shadow: 0 0 24px rgba(255, 210, 63, 0.35) inset; }
.ul-reel { position: absolute; left: 0; top: 8px; display: flex; gap: 6px; will-change: transform; }
.ul-reel div { width: 70px; height: 76px; flex: 0 0 70px; background: #1e1626; border-radius: 4px; display: flex; align-items: center; justify-content: center; }
.ul-reel canvas { width: 56px; height: auto; image-rendering: pixelated; }
.ul-mark { position: absolute; left: 50%; top: 0; bottom: 0; width: 76px; transform: translateX(-50%); border: 3px solid #7dff8a; border-radius: 6px; box-sizing: border-box; pointer-events: none; }
.ul-won { font-size: 12px; color: #7dff8a; min-height: 1.6em; line-height: 1.6; }
.ul-row { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
`;

function addCss() {
  if (document.getElementById("ul-css")) return;
  const style = document.createElement("style");
  style.id = "ul-css";
  style.textContent = CSS;
  document.head.append(style);
}

function card(id: string): HTMLButtonElement {
  const hero = HEROES[id as keyof typeof HEROES];
  const cls = HERO_CLASSES.find((c) => c.id === heroClass(id))!;
  const b = document.createElement("button");
  b.type = "button";
  b.className = "ul-card";
  b.dataset.id = id;
  b.append(heroPortrait(id));
  b.insertAdjacentHTML(
    "beforeend",
    `<div class="ul-n">${hero.name}</div><span class="ul-c" style="background:${cls.color}">${cls.name}</span><div class="ul-s">${"★".repeat(Math.min(5, hero.stars))}</div><span class="ul-i" role="button">INFO</span>`,
  );
  return b;
}

/** New player: pick 3 of the 10 heroes offered. Resolves once the server took the pick. */
export function showStarterPicker(offer: string[], confirm: (picks: string[]) => Promise<void>): Promise<void> {
  addCss();
  return new Promise((resolve) => {
    const back = document.createElement("div");
    back.className = "ul-back";
    back.id = "starter-pick";
    back.innerHTML = `<div class="ul-box"><h2>CHOOSE 3 STARTER HEROES</h2><p>Every hero is locked at first. Pick 3 of these 10 to start with.<br>Win games to earn spins and unlock the rest!</p><div class="ul-grid"></div><div class="ul-err"></div><button class="ul-btn" disabled>START (0/3)</button></div>`;
    const grid = back.querySelector(".ul-grid")!;
    const go = back.querySelector(".ul-btn") as HTMLButtonElement;
    const err = back.querySelector(".ul-err")!;
    const picked: string[] = [];
    const refresh = () => {
      go.disabled = picked.length !== 3;
      go.textContent = `START (${picked.length}/3)`;
      grid.querySelectorAll<HTMLElement>(".ul-card").forEach((c) => c.classList.toggle("on", picked.includes(c.dataset.id!)));
    };
    for (const id of offer) {
      const c = card(id);
      c.addEventListener("click", (e) => {
        if ((e.target as HTMLElement).classList.contains("ul-i")) return showHeroInfo(id);
        const at = picked.indexOf(id);
        if (at >= 0) picked.splice(at, 1);
        else if (picked.length < 3) picked.push(id);
        refresh();
      });
      grid.append(c);
    }
    go.addEventListener("click", async () => {
      go.disabled = true;
      err.textContent = "";
      try {
        await confirm([...picked]);
        back.remove();
        resolve();
      } catch (e) {
        err.textContent = (e as Error).message === "Failed to fetch" ? "Can't reach the server. Try again." : (e as Error).message;
        refresh();
      }
    });
    document.body.append(back);
  });
}

/** The slot machine: spend a spin, the reel rolls and stops on the hero unlocked. */
export function showSlot(spins: () => number, spin: () => Promise<string>, owned: () => string[]) {
  addCss();
  const back = document.createElement("div");
  back.className = "ul-back dim";
  back.id = "hero-slot";
  back.innerHTML = `<div class="ul-box"><h2>HERO SLOT</h2><p class="ul-left"></p><div class="ul-slot"><div class="ul-reel"></div><div class="ul-mark"></div></div><div class="ul-won"></div><div class="ul-err"></div><div class="ul-row"><button class="ul-btn ul-spin">SPIN!</button><button class="ul-btn alt ul-close">CLOSE</button></div></div>`;
  const reel = back.querySelector(".ul-reel") as HTMLDivElement;
  const won = back.querySelector(".ul-won")!;
  const err = back.querySelector(".ul-err")!;
  const left = back.querySelector(".ul-left")!;
  const spinBtn = back.querySelector(".ul-spin") as HTMLButtonElement;
  let rolling = false;
  const refresh = () => {
    const n = spins();
    const missing = HERO_IDS.length - owned().length;
    left.innerHTML = `Spins: <b style="color:#ffd23f">${n}</b> &middot; Heroes: ${owned().length} / ${HERO_IDS.length}<br>Win any game to earn a spin.`;
    spinBtn.disabled = rolling || n <= 0 || missing <= 0;
    spinBtn.textContent = n > 0 ? `SPIN! (${n})` : "NO SPINS";
  };
  const cell = (id: string) => {
    const d = document.createElement("div");
    d.append(heroPortrait(id));
    return d;
  };
  // A still reel to look at before spinning.
  const fill = (ids: string[]) => {
    reel.style.transition = "none";
    reel.style.transform = "translateX(0)";
    reel.innerHTML = "";
    for (const id of ids) reel.append(cell(id));
  };
  const randomIds = (n: number) => Array.from({ length: n }, () => HERO_IDS[Math.floor(Math.random() * HERO_IDS.length)]);
  fill(randomIds(12));

  spinBtn.addEventListener("click", async () => {
    rolling = true;
    refresh();
    won.textContent = "";
    err.textContent = "";
    let hero: string;
    try {
      hero = await spin();
    } catch (e) {
      rolling = false;
      err.textContent = (e as Error).message === "Failed to fetch" ? "Can't reach the server. Try again." : (e as Error).message;
      refresh();
      return;
    }
    // 40 heroes roll past, then the one unlocked lands under the green frame.
    const stopAt = 40;
    fill([...randomIds(stopAt), hero, ...randomIds(6)]);
    const step = 76; // cell + gap
    const view = (back.querySelector(".ul-slot") as HTMLElement).clientWidth;
    const target = stopAt * step + 35 - view / 2;
    void reel.offsetWidth; // start the roll from the left
    reel.style.transition = "transform 3.2s cubic-bezier(0.12, 0.7, 0.18, 1)";
    reel.style.transform = `translateX(${-target}px)`;
    setTimeout(() => {
      rolling = false;
      const h = HEROES[hero as keyof typeof HEROES];
      won.innerHTML = `UNLOCKED: ${h?.name ?? hero}!`;
      refresh();
    }, 3300);
  });
  back.querySelector(".ul-close")!.addEventListener("click", () => !rolling && back.remove());
  back.addEventListener("click", (e) => e.target === back && !rolling && back.remove());
  document.body.append(back);
  refresh();
}

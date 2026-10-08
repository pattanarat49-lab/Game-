// The home screen (2026-10-06): the user's picture (stained-glass hall since 2026-10-08) with the favourite hero on a pedestal,
// the profile box, and OPEN WORLD / START GAME / CHARACTER. START GAME opens the mode list (every mode
// then picks heroes on the PvP-style select screen); CHARACTER opens the hero gallery by class, where
// one hero can be made the favourite.

import { HEROES, HERO_CLASSES, HERO_IDS, HeroId, RANKED_CODE, StageId, heroClass, rankTier } from "../../shared/game";
import { heroPortrait, paintPortrait } from "./heroArt";
import { showHeroInfo } from "./heroInfo";
import { AttackMode, attackMode, setAttackMode } from "./settings";
import { audioLevels, setAudioLevels, uiClick } from "./audio";
import { heroMastery, loadProfile, masteryColor, wearTitle } from "./profile";

export interface HomeActions {
  online: boolean; // false in the solo build: no online modes, no account
  name(): string;
  fav(): HeroId;
  setFav(id: HeroId): void;
  locked(id: string): boolean;
  owned(): number; // heroes the player has (all of them when nothing is locked)
  spins(): number;
  openSlot(): void;
  openWorld(): void;
  /** Cthulhu's head in the stained glass: into the Sunken Temple. */
  abyss(): void;
  /** The God Knight's head in the right-hand window: into the Celestial Sanctum. */
  heaven(): void;
  /** The dark figure's head in the middle window: into The Rift. */
  glitch(): void;
  play(stage: StageId, solo: boolean, code: string): void;
  logout?(): void;
  rename?(): void;
  /** Ranked points for 1v1 and 3v3 (undefined = not signed in, so no Ranked). */
  rank?(): { r1: number; r3: number } | undefined;
}

const W = 1850;
const H = 850;

const CSS = `
#home-stage { position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; transform-origin: 0 0; }
#home-stage > img.bg { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; image-rendering: auto; }
#menu { padding: 0 !important; overflow: hidden !important; background: #120c10 !important; display: block !important; }
#menu.hidden { display: none !important; }
#menu::before { content: ""; position: absolute; inset: -20px; background: url(home-bg.jpg) center / cover; filter: blur(12px); }
.hm-hit { position: absolute; border-radius: 14px; cursor: pointer; background: transparent; border: 0; padding: 0; transition: box-shadow .15s, transform .1s; }
.hm-hit:hover { box-shadow: 0 0 0 4px rgba(255, 230, 120, 0.7), 0 0 30px rgba(255, 220, 100, 0.6); }
.hm-hit:active { transform: scale(0.97); }
/* Cthulhu's head in the stained glass is a secret door into the Sunken Temple. */
#hm-cthulhu { left: 515px; top: 293px; width: 140px; height: 144px; border-radius: 50%; }
#hm-note { position: absolute; left: 50%; top: 470px; transform: translateX(-50%); max-width: 760px; padding: 18px 26px; text-align: center;
  font-size: 20px; line-height: 1.6; color: #b8ffd8; background: rgba(4, 16, 12, .9); border: 3px solid #3ad88a; border-radius: 8px;
  box-shadow: 0 0 30px rgba(60, 255, 150, .35); pointer-events: none; opacity: 0; transition: opacity .3s; z-index: 5; }
#hm-note.on { opacity: 1; }
#hm-glitch { left: 857px; top: 305px; width: 130px; height: 130px; border-radius: 50%; }
#hm-glitch:hover { box-shadow: 0 0 0 4px rgba(255, 70, 70, 0.6), 0 0 40px rgba(255, 30, 30, 0.7); }
#hm-godknight { left: 1185px; top: 290px; width: 140px; height: 144px; border-radius: 50%; }
#hm-godknight:hover { box-shadow: 0 0 0 4px rgba(255, 220, 120, 0.7), 0 0 40px rgba(255, 210, 90, 0.8); }
#hm-cthulhu:hover { box-shadow: 0 0 0 4px rgba(120, 255, 160, 0.6), 0 0 40px rgba(80, 255, 140, 0.7); }
/* 2026-10-08 (user request): nothing stands in the middle of the stained-glass hall any more. */
#hm-ped, #hm-hero, #hm-heroname, #hm-title, #hm-mastery { display: none !important; }
/* The three main buttons (2026-10-08): drawn here now that the stained-glass picture has none of its own. */
.hm-main { position: absolute; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; cursor: pointer; padding: 0;
  font-family: "Press Start 2P", monospace; color: #ffe9a8; text-shadow: 0 3px 0 #000, 0 0 10px rgba(255, 190, 80, 0.7);
  background: linear-gradient(#2a1a22ee, #120a10f2); border: 4px solid #c9932e; border-radius: 6px;
  clip-path: polygon(16px 0, calc(100% - 16px) 0, 100% 16px, 100% calc(100% - 16px), calc(100% - 16px) 100%, 16px 100%, 0 calc(100% - 16px), 0 16px);
  box-shadow: inset 0 0 0 3px #3a2410, inset 0 0 24px rgba(255, 170, 60, 0.35); transition: filter .15s, transform .1s; }
.hm-main:hover { filter: brightness(1.25) drop-shadow(0 0 12px #ffcf6a); }
.hm-main:active { transform: scale(0.97); }
.hm-main .ic { font-size: 34px; line-height: 1; text-shadow: none; filter: drop-shadow(0 2px 0 #000); }
.hm-main .tx { font-size: 18px; }
#hm-start { border-color: #ffd23f; background: linear-gradient(#4a2a14f0, #1c0e08f4); box-shadow: inset 0 0 0 3px #6a3a0a, inset 0 0 30px rgba(255, 200, 80, 0.5), 0 0 26px rgba(255, 200, 90, 0.5); }
#hm-start .tx { font-size: 30px; color: #ffd23f; }
#hm-world { border-color: #3aa8c8; }
#hm-char { border-color: #8a5ad8; }
#hm-corner { position: absolute; left: 0; top: 0; width: 0; height: 0; z-index: 3; }
#hm-frame { position: absolute; left: 30px; top: 6px; width: 432px; height: 122px; pointer-events: none; }
#hm-pic { position: absolute; left: 60px; top: 26px; width: 90px; height: 86px; display: flex; align-items: flex-end; justify-content: center; overflow: hidden;
  background: radial-gradient(circle at 50% 40%, #f0a040, #b8401e 70%); }
#hm-pic canvas { height: 118%; image-rendering: pixelated; margin-bottom: -4px; }
#hm-name { position: absolute; left: 172px; top: 48px; width: 225px; font-size: 22px; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: left; text-shadow: 0 3px 0 #000; }
#hm-profile { left: 42px; top: 18px; width: 408px; height: 110px; }
#hm-spin { position: absolute; left: 60px; top: 136px; font: inherit; font-size: 18px; padding: 10px 16px; color: #1a1220; background: #ffd23f; border: 4px solid #8a5a12; border-radius: 8px; cursor: pointer;
  box-shadow: 0 5px 0 #8a5a12; animation: hm-glow 1s ease-in-out infinite alternate; }
@keyframes hm-glow { to { box-shadow: 0 5px 0 #8a5a12, 0 0 24px #ffe066; } }
#hm-drop { position: absolute; left: 160px; top: 132px; display: none; flex-direction: column; gap: 8px; padding: 12px; background: #141a30; border: 4px solid #4a5a8a; border-radius: 8px; z-index: 2; }
#hm-drop.show { display: flex; }
#hm-drop button { font: inherit; font-size: 16px; padding: 12px 18px; color: #fff; background: #2a3458; border: 3px solid #5a6aa0; border-radius: 6px; cursor: pointer; text-align: left; }
#hm-drop button:hover { background: #3a4878; }
#hm-ped { position: absolute; left: 832px; top: 520px; width: 164px; height: 46px; border-radius: 50%;
  background: radial-gradient(ellipse at 50% 40%, #e8e2d0 0 40%, #b8b0a0 55%, #7a7468 70%, #5a5448 100%);
  box-shadow: 0 6px 0 #4a443a, 0 0 0 4px #c9932e, 0 0 30px 6px rgba(255, 220, 120, 0.55); }
#hm-ped::after { content: ""; position: absolute; inset: 8px 22px; border-radius: 50%; border: 3px solid rgba(255, 210, 90, 0.8); }
#hm-hero { position: absolute; left: 834px; top: 352px; width: 160px; height: 180px; display: flex; align-items: flex-end; justify-content: center; pointer-events: none;
  animation: hm-bob 2.4s ease-in-out infinite; }
#hm-hero canvas { height: 100%; image-rendering: pixelated; filter: drop-shadow(0 4px 0 rgba(0,0,0,0.25)); }
@keyframes hm-bob { 50% { transform: translateY(-6px); } }
#hm-heroname { position: absolute; left: 712px; top: 572px; width: 400px; text-align: center; font-size: 20px; color: #fff; text-shadow: 0 2px 0 #000, 0 0 6px #000; pointer-events: none; }
#hm-title { position: absolute; left: 662px; top: 272px; width: 500px; text-align: center; font-size: 26px; color: #ffe27a; pointer-events: none;
  text-shadow: 0 2px 0 #6a3a0a, 0 0 8px rgba(255, 190, 60, 0.9); letter-spacing: 1px; }
#hm-mastery { position: absolute; left: 812px; top: 310px; width: 204px; display: flex; flex-direction: column; align-items: center; gap: 4px; pointer-events: none; }
#hm-mastery span { font-size: 19px; color: var(--mc); text-shadow: 0 2px 0 #000; }
#hm-mastery i { display: block; width: 160px; height: 10px; background: #000a; border: 2px solid #000; border-radius: 3px; overflow: hidden; }
#hm-mastery i b { display: block; height: 100%; background: var(--mc); }
#hm-titles { position: absolute; left: 60px; top: 136px; font: inherit; font-size: 15px; padding: 9px 14px; color: #fff; background: #7a3ab8; border: 4px solid #3e1a6a; border-radius: 8px; cursor: pointer;
  box-shadow: 0 5px 0 #3e1a6a; }
.hm-tlist { width: min(100%, 640px); display: flex; flex-direction: column; gap: 8px; }
.hm-tlist button { font: inherit; font-size: 12px; padding: 14px; text-align: left; color: #fff; background: #1c2442; border: 3px solid #3a4878; border-radius: 6px; cursor: pointer; }
.hm-tlist button.on { border-color: #ffd23f; color: #ffe27a; box-shadow: 0 0 10px rgba(255, 210, 60, 0.5); }
.hm-tlist p { margin: 0; font-size: 9px; line-height: 1.8; color: #c8cce0; text-align: center; }
#home-error { position: absolute; left: 0; right: 0; bottom: 30px; text-align: center; color: #ff6a5a; font-size: 18px; text-shadow: 0 2px 0 #000; pointer-events: none; }

.hm-screen { position: fixed; inset: 0; z-index: 15; display: flex; flex-direction: column; align-items: center; overflow-y: auto; padding: 14px; box-sizing: border-box; gap: 12px;
  background: linear-gradient(rgba(10, 16, 40, 0.86), rgba(10, 16, 40, 0.94)), url(home-bg.jpg) center / cover; color: #fff; font-family: "Press Start 2P", monospace; }
.hm-top { width: min(100%, 1100px); display: flex; align-items: center; gap: 10px; }
.hm-top h2 { flex: 1; margin: 0; font-size: clamp(14px, 2.6vw, 24px); color: #ffd23f; font-weight: normal; text-shadow: 0 3px 0 #8a5a12; text-align: center; }
.hm-back { font: inherit; font-size: 11px; padding: 9px 12px; color: #fff; background: #2a3458; border: 3px solid #5a6aa0; border-radius: 6px; cursor: pointer; }
.hm-gold { font: inherit; font-size: 11px; padding: 9px 12px; color: #1a1220; background: #ffd23f; border: 3px solid #8a5a12; border-radius: 6px; cursor: pointer; }
.hm-modes { width: min(100%, 1100px); display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 12px; }
.hm-mode { background: #141a30; border: 4px solid #4a5a8a; border-radius: 10px; padding: 14px; display: flex; flex-direction: column; gap: 10px; text-align: left; }
.hm-mode h3 { margin: 0; font-size: 14px; color: #ffd23f; font-weight: normal; }
.hm-mode p { margin: 0; font-size: 9px; line-height: 1.7; color: #c8cce0; flex: 1; }
.hm-mode .tag { font-size: 8px; color: #8ad8ff; }
.hm-mode .btns { display: flex; gap: 8px; flex-wrap: wrap; }
.hm-mode button { flex: 1; font: inherit; font-size: 11px; padding: 11px 8px; border-radius: 6px; cursor: pointer; color: #fff; }
.hm-mode button.solo { background: #2fae6a; border: 3px solid #1d7a48; }
.hm-mode button.online { background: #3a6ad8; border: 3px solid #1b3a9a; }
.hm-mode.ranked { border-color: #c9932e; background: linear-gradient(#241a30, #141a30); }
.hm-mode.ranked h3 { color: #ff9a3a; }
.hm-mode button:disabled { opacity: 0.45; cursor: default; }
.hm-room { display: flex; gap: 8px; align-items: center; font-size: 9px; color: #c8cce0; }
.hm-room input { font: inherit; font-size: 11px; width: 130px; padding: 8px; background: #0a0f22; color: #fff; border: 2px solid #4a5a8a; border-radius: 4px; }
.hm-tabs { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
.hm-tabs button { font: inherit; font-size: 9px; padding: 7px 10px; color: #fff; background: #1a2240; border: 2px solid var(--c, #5a6aa0); border-radius: 4px; cursor: pointer; }
.hm-tabs button.on { background: var(--c, #5a6aa0); color: #10142a; }
.hm-grid { width: min(100%, 1100px); display: grid; grid-template-columns: repeat(auto-fill, minmax(86px, 1fr)); gap: 8px; }
.hm-card { position: relative; background: #141a30; border: 3px solid #2e3a60; border-radius: 8px; padding: 6px 4px 5px; cursor: pointer; color: #fff; font: inherit; }
.hm-card:hover { border-color: #8ab4ff; }
.hm-card canvas { width: 72%; image-rendering: pixelated; display: block; margin: 0 auto 4px; }
.hm-card .n { font-size: 7px; line-height: 1.4; min-height: 2.8em; }
.hm-card .c { position: absolute; left: 4px; top: 4px; width: 8px; height: 8px; border-radius: 2px; }
.hm-card.locked canvas { filter: grayscale(1) brightness(0.45); }
.hm-card.locked::after { content: "LOCKED"; position: absolute; left: 50%; top: 38%; transform: translate(-50%, -50%); font-size: 7px; color: #ffd23f; background: rgba(0,0,0,0.75); padding: 2px 4px; }
.hm-card.fav { border-color: #e8487a; box-shadow: 0 0 10px rgba(232, 72, 122, 0.6); }
.hm-card.fav::before { content: "\\2665"; position: absolute; right: 5px; top: 2px; color: #ff5a8a; font-size: 12px; }
.hm-count { font-size: 9px; color: #c8cce0; }
#hm-setting { position: absolute; right: 12px; top: 12px; z-index: 4; font-family: "Press Start 2P", monospace; font-size: 12px; padding: 10px 12px; color: #fff;
  background: #2a3458; border: 3px solid #5a6aa0; border-radius: 8px; box-shadow: 0 4px 0 #141a30; cursor: pointer; display: flex; align-items: center; gap: 8px; }
#hm-setting:active { transform: translateY(2px); box-shadow: 0 2px 0 #141a30; }
#hm-setting svg { width: 18px; height: 18px; image-rendering: pixelated; }
.hm-set { width: min(100%, 640px); background: #141a30; border: 4px solid #4a5a8a; border-radius: 10px; padding: 16px; display: flex; flex-direction: column; gap: 14px; }
.hm-set h3 { margin: 0; font-size: 13px; color: #ffd23f; font-weight: normal; }
.hm-switch { display: flex; align-items: center; gap: 12px; font-size: 11px; }
.hm-switch .lbl { opacity: 0.45; transition: opacity .15s; }
.hm-switch .lbl.on { opacity: 1; color: #ffd23f; }
.hm-switch button { position: relative; width: 74px; height: 36px; border-radius: 18px; border: 3px solid #5a6aa0; background: #2fae6a; cursor: pointer; padding: 0; flex: none; transition: background .15s; }
.hm-switch button.adv { background: #d8693a; }
.hm-switch button::after { content: ""; position: absolute; top: 3px; left: 3px; width: 24px; height: 24px; border-radius: 50%; background: #fff; box-shadow: 0 2px 0 #0008; transition: left .15s; }
.hm-switch button.adv::after { left: 41px; }
.hm-vol { display: flex; align-items: center; gap: 12px; font-size: 10px; color: #c8cce0; }
.hm-vol span { width: 64px; }
.hm-vol input { flex: 1; accent-color: #ffd23f; }
.hm-set p { margin: 0; font-size: 9px; line-height: 1.8; color: #c8cce0; }

/* 2026-10-08 the user's mock-up: every home button in a bronze frame with gold corner stars (frame-dark/light.png, 9-sliced). */
.hm-fr { border: 18px solid transparent !important; border-image: url(frame-dark.png) 18 fill / 18px stretch !important; image-rendering: pixelated;
  background: none !important; box-shadow: none !important; clip-path: none !important; border-radius: 0 !important; box-sizing: border-box;
  font-family: "Press Start 2P", monospace; color: #f0d9a8; text-shadow: 0 2px 0 #000; }
.hm-main { padding: 0 !important; }
.hm-main .tx { font-size: 20px !important; color: #f0d9a8 !important; letter-spacing: 1px; }
/* START GAME is the button cut straight out of the user's mock-up (start-btn.png), text and all. */
#hm-start.hm-fr { border: 0 !important; border-image: none !important; background: url(start-btn.png) center / 100% 100% no-repeat !important; }
#hm-start .tx { visibility: hidden; }
.hm-main:hover { filter: brightness(1.2) drop-shadow(0 0 14px #ffcf6a); }
#hm-frame { display: none; }
#hm-pic { left: 34px; top: 16px; width: 120px; height: 104px; padding: 0; }
#hm-pic.hm-fr { border-width: 14px !important; border-image-width: 14px !important; background: radial-gradient(circle at 50% 40%, #e08a3a, #8a3a16 75%) padding-box !important; }
#hm-plate { position: absolute; left: 146px; top: 26px; width: 312px; height: 84px; pointer-events: none; }
#hm-name { left: 180px; top: 54px; width: 230px; color: #f0d9a8; font-size: 22px; }
#hm-plate::after { content: "\\2726"; position: absolute; right: 22px; top: 22px; font-size: 26px; color: #e8c088; }
#hm-spin { left: 38px; top: 138px; width: 146px; height: 72px; padding: 0; font-size: 18px; line-height: 1.25; color: #2a1608 !important; text-shadow: none;
  border-image-source: url(frame-light.png) !important; animation: hm-pulse 1.2s ease-in-out infinite alternate; }
@keyframes hm-pulse { to { filter: drop-shadow(0 0 10px #ffd890); } }
#hm-titles { left: 38px; width: 146px; height: 54px; padding: 0; font-size: 15px; }
#hm-setting.hm-fr { right: 10px; top: 10px; padding: 2px 6px; font-size: 12px; gap: 10px; border-width: 10px !important; border-image-width: 10px !important; }
#hm-setting svg { width: 18px; height: 18px; }
`;

export class Home {
  private stage: HTMLDivElement;
  private pic: HTMLDivElement;
  private nameEl: HTMLDivElement;
  private heroEl: HTMLDivElement;
  private heroName: HTMLDivElement;
  private spinBtn: HTMLButtonElement;
  private drop: HTMLDivElement;
  readonly error: HTMLDivElement;
  private shownFav = "";

  constructor(private root: HTMLElement, private act: HomeActions) {
    if (!document.getElementById("home-css")) {
      const style = document.createElement("style");
      style.id = "home-css";
      style.textContent = CSS;
      document.head.append(style);
    }
    root.innerHTML = "";
    const stage = document.createElement("div");
    stage.id = "home-stage";
    stage.innerHTML = `
      <img class="bg" src="home-bg.jpg" alt="" />
      <button type="button" class="hm-hit" id="hm-cthulhu" aria-label="Sunken Temple"></button>
      <button type="button" class="hm-hit" id="hm-godknight" aria-label="Celestial Sanctum"></button>
      <button type="button" class="hm-hit" id="hm-glitch" aria-label="The Rift"></button>
      <div id="hm-ped"></div>
      <div id="hm-hero"></div>
      <div id="hm-title"></div>
      <div id="hm-heroname"></div>
      <div id="hm-mastery"><span></span><i><b></b></i></div>
      <div id="hm-corner">
        <img id="hm-frame" src="home-frame.png" alt="" />
        <div id="hm-plate" class="hm-fr"></div>
        <div id="hm-pic" class="hm-fr"></div>
        <div id="hm-name"></div>
        <button type="button" class="hm-hit" id="hm-profile" aria-label="Profile"></button>
        <button type="button" id="hm-spin" class="hm-fr"></button>
        <button type="button" id="hm-titles" class="hm-fr">\u2726 TITLE \u2726</button>
        <div id="hm-drop"></div>
      </div>
      <button type="button" class="hm-main hm-fr" id="hm-world" style="left:390px;top:612px;width:290px;height:104px"><span class="tx">OPEN WORLD</span></button>
      <button type="button" class="hm-main hm-fr" id="hm-start" aria-label="Start game" style="left:692px;top:586px;width:472px;height:142px"><span class="tx">\u2726 START GAME \u2726</span></button>
      <button type="button" class="hm-main hm-fr" id="hm-char" style="left:1172px;top:612px;width:292px;height:104px"><span class="tx">CHARACTER</span></button>
      <div id="home-error"></div>
      <div id="hm-note"></div>`;
    root.append(stage);
    // SETTING sits in the top-right corner of the screen (outside the scaled picture, so it is always reachable).
    const setting = document.createElement("button");
    setting.type = "button";
    setting.id = "hm-setting";
    setting.className = "hm-fr";
    setting.innerHTML = `<svg viewBox="0 0 9 9" shape-rendering="crispEdges"><path fill="#c9913e" d="M3 0h3v1h1v1h1v1h1v3h-1v1h-1v1h-1v1h-3v-1h-1v-1h-1v-1h-1v-3h1v-1h1v-1h1z"/><path fill="#1a0e08" d="M3 3h3v3h-3z"/></svg>SETTING`;
    setting.addEventListener("click", (e) => {
      e.stopPropagation();
      this.showSettings();
    });
    root.append(setting);
    this.stage = stage;
    this.pic = stage.querySelector("#hm-pic")!;
    this.nameEl = stage.querySelector("#hm-name")!;
    this.heroEl = stage.querySelector("#hm-hero")!;
    this.heroName = stage.querySelector("#hm-heroname")!;
    this.spinBtn = stage.querySelector("#hm-spin")!;
    this.drop = stage.querySelector("#hm-drop")!;
    this.error = stage.querySelector("#home-error")!;

    stage.querySelector("#hm-world")!.addEventListener("click", () => act.openWorld());
    stage.querySelector("#hm-cthulhu")!.addEventListener("click", () => act.abyss());
    stage.querySelector("#hm-godknight")!.addEventListener("click", () => act.heaven());
    stage.querySelector("#hm-glitch")!.addEventListener("click", () => act.glitch());
    stage.querySelector("#hm-start")!.addEventListener("click", () => this.showModes());
    stage.querySelector("#hm-char")!.addEventListener("click", () => this.showCharacters());
    this.spinBtn.addEventListener("click", () => act.openSlot());
    stage.querySelector("#hm-titles")!.addEventListener("click", (e) => {
      e.stopPropagation();
      this.showTitles();
    });
    stage.querySelector("#hm-profile")!.addEventListener("click", (e) => {
      e.stopPropagation();
      this.drop.classList.toggle("show");
    });
    root.addEventListener("click", () => this.drop.classList.remove("show"));

    const corner = stage.querySelector<HTMLElement>("#hm-corner")!;
    const fit = () => {
      const w = innerWidth;
      const h = innerHeight;
      // Cover the whole screen with the picture (no empty bands), centred, as long as the three buttons still fit;
      // only a very narrow (portrait) screen shrinks it to keep them in view.
      const BTN = { l: 390, r: 1464, t: 596, b: 718 };
      const s = Math.min(Math.max(w / W, h / H), w / (BTN.r - BTN.l + 40));
      const vw = w / s;
      const vh = h / s;
      const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
      // Centred, then nudged so the buttons stay on screen (and never past the picture's edges).
      let left = (W - vw) / 2;
      if (vw < W) left = clamp(clamp(left, BTN.r + 20 - vw, BTN.l - 20), 0, W - vw);
      let up = (H - vh) / 2;
      if (vh < H) up = clamp(clamp(up, BTN.b + 10 - vh, BTN.t - 10), 0, H - vh);
      stage.style.transform = `scale(${s}) translate(${-left}px, ${-up}px)`;
      // The profile box (with its frame) sticks to the top-left corner of the screen.
      corner.style.transform = `translate(${Math.max(0, left - 24)}px, ${Math.max(0, up - 2)}px)`;
    };
    fit();
    addEventListener("resize", fit);
    // Phones change size late (address bar, rotation, going fullscreen): fit again once things settle.
    addEventListener("orientationchange", () => setTimeout(fit, 300));
    visualViewport?.addEventListener("resize", fit);
    document.addEventListener("fullscreenchange", () => setTimeout(fit, 150));
    this.refresh();
  }

  /** Name, favourite hero, spins: redrawn whenever they may have changed. */
  refresh() {
    this.nameEl.textContent = this.act.name();
    const fav = this.act.fav();
    if (fav !== this.shownFav) {
      this.shownFav = fav;
      this.pic.innerHTML = "";
      this.pic.append(heroPortrait(fav));
      const big = document.createElement("canvas");
      paintPortrait(big, fav);
      this.heroEl.innerHTML = "";
      this.heroEl.append(big);
      this.heroName.textContent = HEROES[fav]?.name ?? "";
    }
    // The title worn, over the hero; the hero's mastery under its name.
    this.stage.querySelector("#hm-title")!.textContent = loadProfile().title ? `\u300C${loadProfile().title}\u300D` : "";
    const m = heroMastery(fav);
    const mEl = this.stage.querySelector<HTMLElement>("#hm-mastery")!;
    mEl.style.setProperty("--mc", masteryColor(m.level));
    mEl.querySelector("span")!.textContent = m.level ? `MASTERY Lv.${m.level}` : "MASTERY Lv.0";
    const share = m.level >= 10 ? 1 : (m.points - m.prev) / Math.max(1, m.next - m.prev);
    mEl.querySelector<HTMLElement>("i b")!.style.width = `${Math.round(Math.max(0, Math.min(1, share)) * 100)}%`;
    const spins = this.act.spins();
    this.spinBtn.style.display = this.act.online && spins > 0 ? "" : "none";
    // The TITLE button sits where SPIN is, just under it when SPIN shows.
    this.stage.querySelector<HTMLElement>("#hm-titles")!.style.top = this.act.online && spins > 0 ? "222px" : "138px";
    this.spinBtn.innerHTML = `SPIN<br>x${spins}`;
    // The profile menu.
    this.drop.innerHTML = "";
    const item = (label: string, f: () => void) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      b.addEventListener("click", () => {
        this.drop.classList.remove("show");
        f();
      });
      this.drop.append(b);
    };
    if (this.act.online) item(`HERO SLOT (${spins} spin${spins === 1 ? "" : "s"})`, () => this.act.openSlot());
    if (this.act.rename) item("CHANGE NAME", () => this.act.rename!());
    if (this.act.logout) item("LOG OUT", () => this.act.logout!());
  }

  private screen(title: string): { el: HTMLDivElement; close: () => void } {
    const el = document.createElement("div");
    el.className = "hm-screen";
    el.innerHTML = `<div class="hm-top"><button type="button" class="hm-back">&#9664; BACK</button><h2>${title}</h2></div>`;
    const close = () => el.remove();
    el.querySelector(".hm-back")!.addEventListener("click", close);
    document.body.append(el);
    return { el, close };
  }

  /** SETTING: the attack mode switch (DEFAULT aims for you, ADVANCE is the sword joystick). */
  /** A short message over the hall (e.g. why Cthulhu's door is still shut). */
  note(text: string) {
    const el = this.stage.querySelector<HTMLElement>("#hm-note");
    if (!el) return;
    el.textContent = text;
    el.classList.add("on");
    clearTimeout(this.noteTimer);
    this.noteTimer = window.setTimeout(() => el.classList.remove("on"), 3500);
  }
  private noteTimer = 0;

  showSettings() {
    const { el } = this.screen("SETTING");
    const box = document.createElement("div");
    box.className = "hm-set";
    box.innerHTML = `<h3>ATTACK BUTTON</h3>
      <div class="hm-switch"><span class="lbl" data-m="default">DEFAULT</span><button type="button" aria-label="Attack mode"></button><span class="lbl" data-m="advance">ADVANCE</span></div>
      <p></p>`;
    const sw = box.querySelector("button")!;
    const text = box.querySelector("p")!;
    const show = (m: AttackMode) => {
      sw.classList.toggle("adv", m === "advance");
      box.querySelectorAll<HTMLElement>(".lbl").forEach((l) => l.classList.toggle("on", l.dataset.m === m));
      text.textContent =
        m === "advance"
          ? "ADVANCE: the sword button is a joystick. Hold it to attack and drag it to aim. The right side of the screen is an aim stick too."
          : "DEFAULT: tap or hold the sword button and your hero attacks the closest enemy by itself.";
    };
    sw.addEventListener("click", () => {
      const m: AttackMode = attackMode() === "advance" ? "default" : "advance";
      setAttackMode(m);
      show(m);
    });
    box.querySelectorAll<HTMLElement>(".lbl").forEach((l) =>
      l.addEventListener("click", () => {
        setAttackMode(l.dataset.m as AttackMode);
        show(l.dataset.m as AttackMode);
      }),
    );
    box.querySelectorAll<HTMLElement>(".lbl").forEach((l) => (l.style.cursor = "pointer"));
    show(attackMode());
    // Sound: music and effects volume, kept on this device.
    const sound = document.createElement("div");
    sound.innerHTML = `<h3>SOUND</h3>`;
    sound.style.cssText = "display:flex;flex-direction:column;gap:10px";
    for (const [key, label] of [["music", "MUSIC"], ["sfx", "EFFECTS"]] as const) {
      const row = document.createElement("label");
      row.className = "hm-vol";
      row.innerHTML = `<span>${label}</span><input type="range" min="0" max="100" step="5"><b></b>`;
      const range = row.querySelector("input")!;
      const val = row.querySelector("b")!;
      range.value = String(Math.round(audioLevels()[key] * 100));
      val.textContent = range.value;
      range.addEventListener("input", () => {
        val.textContent = range.value;
        setAudioLevels({ [key]: Number(range.value) / 100 });
      });
      range.addEventListener("change", () => uiClick());
      sound.append(row);
    }
    box.append(sound);
    el.append(box);
  }

  /** TITLE: the titles earned so far; tap one to wear it (shown over the hero here and in the Open World). */
  showTitles() {
    const { el } = this.screen("TITLES");
    const list = document.createElement("div");
    list.className = "hm-tlist";
    const draw = () => {
      const p = loadProfile();
      list.innerHTML = "";
      if (!p.titles.length) {
        list.innerHTML = "<p>No titles yet.<br>Titles are earned by the way you play and the heroes you play most. Keep playing!</p>";
        return;
      }
      const add = (label: string, title: string) => {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = label;
        b.classList.toggle("on", p.title === title);
        b.addEventListener("click", () => {
          wearTitle(title);
          draw();
          this.refresh();
        });
        list.append(b);
      };
      add("(no title)", "");
      for (const t of p.titles) add(t, t);
    };
    draw();
    el.append(list);
  }

  /** START GAME: pick a mode (then heroes are picked on the select screen in the game). */
  showModes() {
    const { el, close } = this.screen("CHOOSE A MODE");
    const online = this.act.online;
    const modes: { title: string; tag: string; text: string; solo?: StageId; online?: StageId }[] = [
      { title: "PvP ARENA", tag: "1 VS 1 · ONLINE", text: "Fight another player in the boxing ring. First to 3 knockouts wins.", online: "pvp" },
      { title: "TRAINING", tag: "UP TO 4 PLAYERS VS BOT", text: "Team up with friends against one strong bot. Pick its hero and difficulty.", solo: "pve", online: "pve" },
      { title: "CLASSIC 3v3", tag: "RED VS BLUE", text: "3 heroes a side on maps with walls, tall grass and water. Bots fill empty slots. 3 lives each.", solo: "classic", online: "classic" },
      { title: "BATTLE ROYALE", tag: "8 PLAYERS · LAST ONE STANDING", text: "A big round island with tall grass and cover. One life each. The storm ring closes in when the fight drags on.", solo: "royale", online: "royale" },
    ];
    const grid = document.createElement("div");
    grid.className = "hm-modes";
    for (const m of modes) {
      if (!online && !m.solo) continue;
      if (!online && m.title === "TRAINING") continue; // the same as Bot Duel without other players
      const card = document.createElement("div");
      card.className = "hm-mode";
      card.innerHTML = `<h3>${m.title}</h3><div class="tag">${m.tag}</div><p>${m.text}</p><div class="btns"></div>`;
      const btns = card.querySelector(".btns")!;
      const add = (label: string, cls: string, f: () => void) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = cls;
        b.textContent = label;
        b.addEventListener("click", () => {
          close();
          f();
        });
        btns.append(b);
      };
      if (m.solo) add(m.online ? "SOLO" : "PLAY", "solo", () => this.act.play(m.solo!, true, ""));
      if (m.online && online) add(m.solo ? "ONLINE" : "PLAY ONLINE", "online", () => this.act.play(m.online!, false, room.value.trim().slice(0, 8).toUpperCase()));
      grid.append(card);
    }
    if (online) {
      // Ranked: rank points by result, tiers from Bronze to Champion, and a draft (3 bans each, then turns at picking).
      const ranks = this.act.rank?.();
      for (const [title, stage, key, text] of [...[
        ["RANKED 1v1", "pvp", "r1", "1 vs 1 in the ring. Each player bans 3 heroes, then you take turns picking. Win to climb."],
        ["RANKED 3v3", "classic", "r3", "Red vs Blue on the 3v3 maps. Everyone bans 3, then the teams take turns picking one hero each."],
      ] as const].reverse()) {
        const card = document.createElement("div");
        card.className = "hm-mode ranked";
        const pts = ranks?.[key] ?? 0;
        const tier = rankTier(pts);
        card.innerHTML = `<h3>${title}</h3><div class="tag" style="color:${tier.color}">${ranks ? `${tier.name.toUpperCase()} · ${pts} RP` : "LOG IN TO PLAY"}</div><p>${text}</p><div class="btns"></div>`;
        const b = document.createElement("button");
        b.type = "button";
        b.className = "online";
        b.textContent = ranks ? "FIND MATCH" : "LOG IN FIRST";
        b.disabled = !ranks;
        b.addEventListener("click", () => {
          close();
          this.act.play(stage, false, RANKED_CODE);
        });
        card.querySelector(".btns")!.append(b);
        grid.prepend(card);
      }
    }
    el.append(grid);
    const roomRow = document.createElement("div");
    roomRow.className = "hm-room";
    roomRow.innerHTML = `ROOM NO. <input maxlength="8" placeholder="(optional)" autocomplete="off" /> <span>Same number = same room with friends</span>`;
    const room = roomRow.querySelector("input")!;
    if (online) el.append(roomRow);
  }

  /** CHARACTER: every hero by class; tap one for the details and to make it the favourite. */
  showCharacters() {
    const { el } = this.screen("CHARACTERS");
    const top = el.querySelector(".hm-top")!;
    if (this.act.online) {
      const spin = document.createElement("button");
      spin.type = "button";
      spin.className = "hm-gold";
      spin.textContent = `SPIN (${this.act.spins()})`;
      spin.addEventListener("click", () => this.act.openSlot());
      top.append(spin);
    }
    const count = document.createElement("div");
    count.className = "hm-count";
    count.textContent = `${this.act.owned()} / ${HERO_IDS.length} heroes unlocked · tap a hero to read about it and set your favourite`;
    el.append(count);
    const tabs = document.createElement("div");
    tabs.className = "hm-tabs";
    const grid = document.createElement("div");
    grid.className = "hm-grid";
    const cards = new Map<HeroId, HTMLButtonElement>();
    const draw = () => {
      const fav = this.act.fav();
      for (const [id, c] of cards) {
        c.classList.toggle("locked", this.act.locked(id));
        c.classList.toggle("fav", id === fav);
      }
    };
    for (const id of HERO_IDS) {
      const cls = HERO_CLASSES.find((c) => c.id === heroClass(id))!;
      const c = document.createElement("button");
      c.type = "button";
      c.className = "hm-card";
      c.dataset.cls = cls.id;
      c.append(heroPortrait(id));
      c.insertAdjacentHTML("beforeend", `<span class="c" style="background:${cls.color}"></span><div class="n">${HEROES[id].name}</div>`);
      c.addEventListener("click", () => {
        const locked = this.act.locked(id);
        const isFav = id === this.act.fav();
        showHeroInfo(id, {
          label: isFav ? "♥ YOUR FAVOURITE" : "♥ SET AS FAVOURITE",
          on: isFav,
          note: locked ? "Locked: win games and spin the Hero Slot to unlock it." : isFav ? "Stands on the pedestal and is your profile picture." : undefined,
          click: locked || isFav ? undefined : () => {
            this.act.setFav(id);
            draw();
            this.refresh();
          },
        });
      });
      grid.append(c);
      cards.set(id, c);
    }
    const tabList = [{ id: "all", name: "ALL", color: "#ffd23f" }, ...HERO_CLASSES];
    for (const t of tabList) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = t.name.toUpperCase();
      b.style.setProperty("--c", t.color);
      if (t.id === "all") b.classList.add("on");
      b.addEventListener("click", () => {
        tabs.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
        for (const c of cards.values()) c.style.display = t.id === "all" || c.dataset.cls === t.id ? "" : "none";
      });
      tabs.append(b);
    }
    el.append(tabs, grid);
    draw();
  }
}

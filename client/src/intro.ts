import { audioLevels, holdMusic } from "./audio";
/**
 * The opening story, shown every time the game is opened: a line in blue, the title, then the story
 * rising slowly into the stars like an old space-opera crawl. SKIP (or the end of the crawl) closes it.
 */

export interface Chapter {
  lead: string;
  chapter: string;
  name: string;
  lines: string[];
}

/** Chapter I: shown every time the game opens. */
export const OPENING: Chapter = {
  lead: "Long, long ago, in dimensions far, far apart....",
  chapter: "CHAPTER I",
  name: "THE GLITCH",
  lines: [
    "Long, long ago, every dimension lived side by side in peace...",
    "...until THE GLITCH was born.",
    "It tore through the walls between worlds and threw every dimension into chaos.",
    "Now the heroes of each dimension are forced to fight one another, to protect the world they call home.",
  ],
};

/** Chapter II: after the Ancient Knight falls in the Open World's dungeon (it opens the way to Cthulhu). */
export const CHAPTER_TWO: Chapter = {
  lead: "Deep beneath the Ancient Knight's sanctuary....",
  chapter: "CHAPTER II",
  name: "THE STONE TABLET",
  lines: [
    "With the Ancient Knight fallen, the adventurers have discovered an ancient stone tablet.",
    "It is one more step on the road to saving every dimension.",
    "The tablet opens a gate to CTHULHU, one of the servants of THE GLITCH.",
    "Look to the stained glass... the Sunken Temple awaits.",
  ],
};

/** Chapter III: after Cthulhu falls in the Sunken Temple (it points to the God Knight in Heaven). */
export const CHAPTER_THREE: Chapter = {
  lead: "As the deep falls silent once more....",
  chapter: "CHAPTER III",
  name: "HEAVEN",
  lines: [
    "With Cthulhu sunk back into the abyss, the adventurers have found a new clue that brings them closer to THE GLITCH.",
    "The key to enter the VOID lies with the GOD KNIGHT, who stands watch in HEAVEN.",
    "Look to the stained glass... the Celestial Sanctum awaits.",
  ],
};

const CSS = `
#opening { position: fixed; inset: 0; z-index: 100000; background: #000; overflow: hidden; font-family: "Press Start 2P", monospace;
  transition: opacity .8s; }
#opening.out { opacity: 0; pointer-events: none; }
#opening canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
#opening .intro-lead { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; text-align: center; padding: 0 8vw;
  color: #4bd5ee; font-size: clamp(12px, 2.4vmin, 22px); line-height: 1.9; opacity: 0; animation: intro-lead 5s ease-in-out forwards; }
#opening .intro-title { position: absolute; left: 50%; top: 50%; color: #ffe81f; text-align: center; white-space: nowrap; opacity: 0;
  font-size: clamp(34px, 11vmin, 120px); letter-spacing: .06em; text-shadow: 0 0 18px rgba(255, 220, 60, .35);
  animation: intro-title 7s ease-in 4.6s forwards; }
#opening .intro-title small { display: block; font-size: .2em; letter-spacing: .3em; margin-top: 1.2em; color: #ffe81f; }
#opening .intro-stage { position: absolute; inset: 0; perspective: 400px; overflow: hidden; pointer-events: none; display: flex; justify-content: center;
  -webkit-mask-image: linear-gradient(to top, #000 60%, transparent 100%); mask-image: linear-gradient(to top, #000 60%, transparent 100%); }
#opening .crawl { position: relative; width: min(84vw, 760px); transform-origin: 50% 100%;
  color: #ffe81f; text-align: justify; font-size: clamp(22px, 6vmin, 56px); line-height: 1.6;
  animation: intro-crawl 52s linear 9.5s both; }
#opening .crawl h2 { text-align: center; font-size: 1em; font-weight: normal; margin: 0 0 .4em; }
#opening .crawl h3 { text-align: center; font-size: 1.4em; font-weight: normal; margin: 0 0 1.6em; letter-spacing: .08em; }
#opening .crawl p { margin: 0 0 1.2em; font-size: 1em; color: inherit; line-height: inherit; }
#opening .skip { position: absolute; right: max(16px, env(safe-area-inset-right)); bottom: max(16px, env(safe-area-inset-bottom)); z-index: 2;
  font: inherit; font-size: clamp(11px, 1.8vmin, 16px); color: #ffe81f; background: rgba(0, 0, 0, .55); border: 3px solid #ffe81f;
  border-radius: 6px; padding: .8em 1.2em; cursor: pointer; letter-spacing: .1em; }
#opening .skip:hover { background: #ffe81f; color: #000; }
@keyframes intro-lead { 0% { opacity: 0 } 18% { opacity: 1 } 75% { opacity: 1 } 100% { opacity: 0 } }
@keyframes intro-title { 0% { opacity: 1; transform: translate(-50%, -50%) scale(2.4) } 85% { opacity: 1 } 100% { opacity: 0; transform: translate(-50%, -50%) scale(.05) } }
@keyframes intro-crawl { from { top: 100vh; transform: rotateX(22deg) translateZ(0) } to { top: -280vh; transform: rotateX(25deg) translateZ(-2200px) } }
`;

/** Shows the crawl; resolves once it has finished or the player skips it. */
export function showIntro(story: Chapter = OPENING): Promise<void> {
  return new Promise((resolve) => {
    if (!document.getElementById("opening-css")) {
      const style = document.createElement("style");
      style.id = "opening-css";
      style.textContent = CSS;
      document.head.append(style);
    }
    const root = document.createElement("div");
    root.id = "opening";
    root.innerHTML = `
      <canvas></canvas>
      <div class="intro-lead">${story.lead}</div>
      <div class="intro-title">RIFTBORN<small>BATTLE OF THE MULTIVERSE</small></div>
      <div class="intro-stage"><div class="crawl">
        <h2>${story.chapter}</h2>
        <h3>${story.name}</h3>
        ${story.lines.map((line) => `<p>${line}</p>`).join("")}
      </div></div>
      <button type="button" class="skip">SKIP &#9654;&#9654;</button>`;
    document.body.append(root);
    drawStars(root.querySelector("canvas")!);

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      root.classList.add("out");
      setTimeout(() => root.remove(), 850);
      window.removeEventListener("resize", redraw);
      resolve();
    };
    const redraw = () => drawStars(root.querySelector("canvas")!);
    window.addEventListener("resize", redraw);
    root.querySelector(".skip")!.addEventListener("click", (e) => {
      e.stopPropagation();
      finish();
    });
    root.querySelector(".crawl")!.addEventListener("animationend", finish);
  });
}

const VIDEO_CSS = `
#intro-video { position: fixed; inset: 0; z-index: 100001; background: #000; display: flex; align-items: center; justify-content: center;
  transition: opacity .8s; font-family: "Press Start 2P", monospace; }
#intro-video.out { opacity: 0; pointer-events: none; }
#intro-video .frame { position: relative; width: min(100vw, calc(100vh * 16 / 9)); aspect-ratio: 16 / 9; }
#intro-video video { position: absolute; inset: 0; width: 100%; height: 100%; display: block; background: #000; }
#intro-video .skip { position: absolute; left: 87.4%; top: 2.8%; width: 10.8%; height: 7%; z-index: 2; background: transparent;
  border: 0; border-radius: 4px; cursor: pointer; padding: 0; }
#intro-video .skip:hover { box-shadow: 0 0 0 2px #ffe81f; }
#intro-video .tap { position: absolute; inset: 0; z-index: 3; display: flex; align-items: center; justify-content: center; border: 0;
  background: rgba(0, 0, 0, .72); color: #ffe81f; font: inherit; font-size: clamp(14px, 3vmin, 26px); letter-spacing: .12em; cursor: pointer; }
#intro-video .tap span { padding: 1em 1.4em; border: 3px solid #ffe81f; border-radius: 6px; background: #000; animation: intro-tap 1.4s ease-in-out infinite; }
@keyframes intro-tap { 50% { opacity: .55 } }
`;


/**
 * The intro film (public/intro.mp4: the user's Claude Design animation rendered to video, with a suspense score made for it).
 * The SKIP drawn in the film's corner is a real button. Browsers only start sound after a tap, so when the film
 * cannot start by itself it waits behind TAP TO START. At the end it holds the last frame (TAP TO START) for a tap.
 */
export function showIntroVideo(): Promise<void> {
  return new Promise((resolve) => {
    if (!document.getElementById("intro-video-css")) {
      const style = document.createElement("style");
      style.id = "intro-video-css";
      style.textContent = VIDEO_CSS;
      document.head.append(style);
    }
    const root = document.createElement("div");
    root.id = "intro-video";
    root.innerHTML = `<div class="frame"><video playsinline preload="auto" src="intro.mp4"></video>
      <button type="button" class="skip" aria-label="Skip the intro"></button></div>`;
    document.body.append(root);
    const video = root.querySelector("video")!;
    video.volume = Math.min(1, audioLevels().music * 2);
    holdMusic(true);
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      video.pause();
      holdMusic(false);
      root.classList.add("out");
      setTimeout(() => root.remove(), 850);
      resolve();
    };
    const askTap = () => {
      if (done || root.querySelector(".tap")) return;
      const tap = document.createElement("button");
      tap.type = "button";
      tap.className = "tap";
      tap.innerHTML = "<span>&#9654; TAP TO START</span>";
      tap.addEventListener("click", (e) => {
        e.stopPropagation();
        tap.remove();
        video.muted = false;
        void video.play().catch(finish);
      });
      root.querySelector(".frame")!.append(tap);
    };
    root.querySelector(".skip")!.addEventListener("click", (e) => {
      e.stopPropagation();
      finish();
    });
    // the film's own last frame says TAP TO START
    video.addEventListener("ended", () => root.addEventListener("click", finish));
    video.addEventListener("error", finish);
    void video.play().catch(askTap);
  });
}

const CHAPTER_SEEN = "uv-chapter1-seen";

/** Has this device read Chapter I yet? */
function chapterSeen(): boolean {
  try {
    return localStorage.getItem(CHAPTER_SEEN) === "1";
  } catch {
    return false;
  }
}

/** Opening the game: the intro film every time, then Chapter I only the first time. */
export async function showOpening(): Promise<void> {
  await showIntroVideo();
  if (chapterSeen()) return;
  await showIntro();
  try {
    localStorage.setItem(CHAPTER_SEEN, "1");
  } catch {
    // shown again next time
  }
}

/** A still field of small stars, a few of them bright. */
function drawStars(canvas: HTMLCanvasElement) {
  const w = (canvas.width = innerWidth);
  const h = (canvas.height = innerHeight);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < (w * h) / 1800; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const b = rnd();
    ctx.fillStyle = `rgba(255,255,255,${0.25 + b * 0.75})`;
    const s = b > 0.97 ? 2 : 1;
    ctx.fillRect(x, y, s, s);
  }
}

/** The user's Cthulhu comic page (public/cthulhu-story.jpg, 1536x1024): each panel as [x, y, w, h, seconds]. */
const CTHULHU_PANELS: [number, number, number, number, number][] = [
  [4, 4, 546, 342, 4.2],
  [558, 4, 437, 342, 3.8],
  [1004, 4, 528, 342, 3.8],
  [4, 356, 376, 218, 2.2],
  [389, 356, 363, 218, 2.2],
  [761, 356, 344, 218, 2.4],
  [1114, 356, 418, 218, 3],
  [4, 584, 1528, 436, 6],
];

const STORY_CSS = `
#cth-story { position: fixed; inset: 0; z-index: 100000; background: #000; overflow: hidden; transition: opacity .8s; }
#cth-story.out { opacity: 0; pointer-events: none; }
#cth-story .panel { position: absolute; left: 50%; top: 50%; background-image: url(cthulhu-story.jpg); background-repeat: no-repeat;
  opacity: 0; transition: opacity .7s; box-shadow: 0 0 60px rgba(40, 255, 200, .15); }
#cth-story .panel.on { opacity: 1; }
#cth-story .skip { position: absolute; right: max(16px, env(safe-area-inset-right)); bottom: max(16px, env(safe-area-inset-bottom)); z-index: 2;
  font-family: "Press Start 2P", monospace; font-size: clamp(11px, 1.8vmin, 16px); color: #7affd0; background: rgba(0, 0, 0, .55);
  border: 3px solid #3ad8a8; border-radius: 6px; padding: .8em 1.2em; cursor: pointer; letter-spacing: .1em; }
#cth-story .skip:hover { background: #3ad8a8; color: #000; }
`;

/** Before the Sunken Temple: the comic's panels one by one, slowly drifting closer. SKIP jumps straight in. */
export function showCthulhuStory(): Promise<void> {
  return new Promise((resolve) => {
    if (!document.getElementById("cth-story-css")) {
      const style = document.createElement("style");
      style.id = "cth-story-css";
      style.textContent = STORY_CSS;
      document.head.append(style);
    }
    const root = document.createElement("div");
    root.id = "cth-story";
    root.innerHTML = `<button type="button" class="skip">SKIP &#9654;&#9654;</button>`;
    document.body.append(root);
    let done = false;
    const timers: number[] = [];
    const finish = () => {
      if (done) return;
      done = true;
      timers.forEach((t) => clearTimeout(t));
      root.classList.add("out");
      setTimeout(() => root.remove(), 850);
      resolve();
    };
    root.querySelector(".skip")!.addEventListener("click", (e) => {
      e.stopPropagation();
      finish();
    });
    let at = 0.3;
    let last: HTMLElement | undefined;
    for (const [x, y, w, h, secs] of CTHULHU_PANELS) {
      timers.push(
        window.setTimeout(() => {
          const s = Math.min((innerWidth * 0.94) / w, (innerHeight * 0.9) / h);
          const el = document.createElement("div");
          el.className = "panel";
          Object.assign(el.style, {
            width: `${w * s}px`,
            height: `${h * s}px`,
            backgroundSize: `${1536 * s}px ${1024 * s}px`,
            backgroundPosition: `${-x * s}px ${-y * s}px`,
            transform: "translate(-50%, -50%) scale(1)",
            transition: `opacity .7s, transform ${secs + 1}s linear`,
          });
          root.insertBefore(el, root.firstChild);
          void el.offsetWidth;
          el.classList.add("on");
          el.style.transform = "translate(-50%, -50%) scale(1.07)";
          const prev = last;
          if (prev) {
            prev.classList.remove("on");
            setTimeout(() => prev.remove(), 800);
          }
          last = el;
        }, at * 1000),
      );
      at += secs;
    }
    timers.push(window.setTimeout(finish, (at + 0.4) * 1000));
  });
}

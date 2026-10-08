/**
 * The opening story, shown every time the game is opened: a line in blue, the title, then the story
 * rising slowly into the stars like an old space-opera crawl. SKIP (or the end of the crawl) closes it.
 */

const STORY = [
  "Long, long ago, every dimension lived side by side in peace...",
  "...until THE GLITCH was born.",
  "It tore through the walls between worlds and threw every dimension into chaos.",
  "Now the heroes of each dimension are forced to fight one another, to protect the world they call home.",
];

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
export function showIntro(): Promise<void> {
  return new Promise((resolve) => {
    if (!document.getElementById("opening-css")) {
      const style = document.createElement("style");
      style.id = "opening-css";
      style.textContent = CSS;
      document.head.append(style);
    }
    const root = document.createElement("div");
    root.id = "opening";
    const [first, ...rest] = STORY;
    root.innerHTML = `
      <canvas></canvas>
      <div class="intro-lead">Long, long ago, in dimensions far, far apart....</div>
      <div class="intro-title">RIFTBORN<small>BATTLE OF THE MULTIVERSE</small></div>
      <div class="intro-stage"><div class="crawl">
        <h2>EPISODE I</h2>
        <h3>THE GLITCH</h3>
        <p>${first}</p>
        ${rest.map((line) => `<p>${line}</p>`).join("")}
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

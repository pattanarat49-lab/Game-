// The dungeon's opening cutscene (2026-10-07): from black, the user's picture of the Ancient Knight's
// Sanctuary slowly lights up, the room's name and its saying appear, then it fades into the fight.
// Tap anywhere (or SKIP) to go straight in.

import { SANCTUARY_PNG } from "./sanctuary.data";

const CSS = `
#cutscene { position: fixed; inset: 0; z-index: 60; background: #000; overflow: hidden; cursor: pointer;
  animation: cs-out 0.9s ease-in 6.6s forwards; }
#cutscene.cs-skip { animation: cs-out 0.45s ease-in forwards; }
#cutscene img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 50% 40%;
  image-rendering: pixelated; opacity: 0; filter: brightness(0.2); transform: scale(1.14);
  animation: cs-light 3s ease-out 0.6s forwards, cs-zoom 7.5s ease-out 0.6s forwards; }
#cutscene .cs-shade { position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(ellipse at 50% 42%, transparent 35%, rgba(0,0,0,0.75) 100%),
    linear-gradient(to bottom, rgba(0,0,0,0.55), transparent 22%, transparent 70%, rgba(0,0,0,0.85)); }
#cutscene .cs-title { position: absolute; left: 0; right: 0; bottom: 13%; text-align: center; color: #e8e2cc;
  font-family: Sarabun, "Noto Serif Thai", Georgia, serif; text-shadow: 0 2px 8px #000; opacity: 0;
  animation: cs-in 1.2s ease-out 2.6s forwards; padding: 0 16px; }
#cutscene .cs-title b { display: block; font-size: clamp(22px, 4.2vw, 46px); letter-spacing: 0.04em; }
#cutscene .cs-title span { display: block; margin-top: 4px; font-size: clamp(12px, 1.7vw, 18px); color: #b6c48a; letter-spacing: 0.25em; }
#cutscene .cs-quote { position: absolute; top: 7%; right: 5%; max-width: 46%; text-align: right; color: #d8d2bc;
  font-family: Sarabun, "Noto Serif Thai", Georgia, serif; font-style: italic; font-size: clamp(13px, 1.8vw, 20px);
  text-shadow: 0 2px 6px #000; opacity: 0; animation: cs-in 1.4s ease-out 3.6s forwards; }
#cutscene .cs-skip-btn { position: absolute; right: 16px; bottom: 16px; padding: 8px 14px; border-radius: 6px;
  border: 1px solid rgba(232,226,204,0.4); background: rgba(0,0,0,0.5); color: #e8e2cc; font: 13px sans-serif; }
@keyframes cs-light { to { opacity: 1; filter: brightness(1); } }
@keyframes cs-zoom { to { transform: scale(1); } }
@keyframes cs-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
@keyframes cs-out { to { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { #cutscene img { animation: cs-light 1.2s ease-out forwards; transform: none; } }
`;

/** Plays the sanctuary's opening over the game. */
export function playSanctuaryIntro() {
  document.getElementById("cutscene")?.remove();
  if (!document.getElementById("cutscene-css")) {
    const style = document.createElement("style");
    style.id = "cutscene-css";
    style.textContent = CSS;
    document.head.appendChild(style);
  }
  const root = document.createElement("div");
  root.id = "cutscene";
  root.innerHTML = `
    <img alt="" src="${SANCTUARY_PNG}">
    <div class="cs-shade"></div>
    <div class="cs-quote">“แม้กาลเวลาจะผ่านไป<br>หินก็ยังคงจดจำคำสาบาน...”</div>
    <div class="cs-title"><b>ห้องบอส : อัศวินหินโบราณ</b><span>— ANCIENT KNIGHT'S SANCTUARY —</span></div>
    <button class="cs-skip-btn" type="button">ข้าม ▶</button>`;
  document.body.appendChild(root);
  const done = () => root.remove();
  const timer = setTimeout(done, 7600);
  root.addEventListener("pointerdown", () => {
    clearTimeout(timer);
    root.classList.add("cs-skip");
    setTimeout(done, 460);
  });
}
